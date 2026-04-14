import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { documents } from '@/db/schema';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createPreviewStoragePath } from '@/lib/storage';
import {
  buildPreviewFilename,
  getInitialDocumentPreviewState,
  isPdfViewerFile,
  isTrackablePreviewSourceFile,
  normalizeViewerFileType,
} from '@/lib/viewer';

const execFileAsync = promisify(execFile);
let pdfJsGetDocumentPromise: Promise<
  typeof import('pdfjs-dist/legacy/build/pdf.mjs').getDocument
> | null = null;
const SOFFICE_CANDIDATES = [
  process.env.OPENDOC_SOFFICE_PATH,
  process.env.SOFFICE_PATH,
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/usr/bin/soffice',
  '/usr/local/bin/soffice',
  'soffice',
].filter((value): value is string => Boolean(value));

function getDocumentConverterConfig() {
  const url = process.env.DOCUMENT_CONVERTER_URL?.trim();

  if (!url) {
    return null;
  }

  const username = process.env.DOCUMENT_CONVERTER_USERNAME;
  const password = process.env.DOCUMENT_CONVERTER_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'DOCUMENT_CONVERTER_USERNAME and DOCUMENT_CONVERTER_PASSWORD must be set when DOCUMENT_CONVERTER_URL is configured. See services/document-converter/README.md for setup instructions.',
    );
  }

  return {
    password,
    url: url.replace(/\/+$/, ''),
    username,
  };
}

class PdfJsDOMMatrixStub {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  is2D = true;

  constructor(init?: number[] | string) {
    if (Array.isArray(init)) {
      const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = init;
      this.a = a;
      this.b = b;
      this.c = c;
      this.d = d;
      this.e = e;
      this.f = f;
    }
  }

  invertSelf() {
    return this;
  }

  multiplySelf() {
    return this;
  }

  preMultiplySelf() {
    return this;
  }

  scale(scaleX = 1, scaleY = scaleX) {
    this.a *= scaleX;
    this.d *= scaleY;
    return this;
  }

  translate(translateX = 0, translateY = 0) {
    this.e += translateX;
    this.f += translateY;
    return this;
  }
}

class PdfJsImageDataStub {
  colorSpace: PredefinedColorSpace = 'srgb';
  data: Uint8ClampedArray;
  height: number;
  width: number;

  constructor(widthOrData: number | Uint8ClampedArray, heightOrWidth?: number, maybeHeight?: number) {
    if (widthOrData instanceof Uint8ClampedArray) {
      this.data = widthOrData;
      this.width = heightOrWidth ?? 0;
      this.height = maybeHeight ?? 0;
      return;
    }

    this.width = widthOrData;
    this.height = heightOrWidth ?? 0;
    this.data = new Uint8ClampedArray(this.width * this.height * 4);
  }
}

class PdfJsPath2DStub {
  addPath() {}
  bezierCurveTo() {}
  closePath() {}
  lineTo() {}
  moveTo() {}
  rect() {}
}

function ensurePdfJsNodeGlobals() {
  if (!globalThis.DOMMatrix) {
    globalThis.DOMMatrix = PdfJsDOMMatrixStub as unknown as typeof DOMMatrix;
  }

  if (!globalThis.ImageData) {
    globalThis.ImageData = PdfJsImageDataStub as unknown as typeof ImageData;
  }

  if (!globalThis.Path2D) {
    globalThis.Path2D = PdfJsPath2DStub as unknown as typeof Path2D;
  }
}

async function getPdfJsGetDocument() {
  ensurePdfJsNodeGlobals();

  if (!pdfJsGetDocumentPromise) {
    pdfJsGetDocumentPromise = (async () => {
      // Pre-load the worker module into globalThis so pdfjs uses it directly
      // instead of trying to dynamically import pdf.worker.mjs (which fails on Vercel).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (globalThis as Record<string, unknown>).pdfjsWorker = require('pdfjs-dist/legacy/build/pdf.worker.mjs');
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      return getDocument;
    })();
  }

  return await pdfJsGetDocumentPromise;
}

function getPreviewFailureMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
    return 'Preview generation requires LibreOffice (`soffice`) in the runtime environment.';
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim().slice(0, 500);
  }

  return 'Preview generation failed.';
}

async function updateDocumentPreviewState(
  documentId: string,
  values: {
    pageCount?: number;
    previewError?: string | null;
    previewFileType?: string | null;
    previewFileUrl?: string | null;
    previewPageCount?: number;
    previewStatus?: string;
  },
) {
  await db
    .update(documents)
    .set({
      ...values,
      previewUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
}

async function downloadStoredObjectBuffer(objectPath: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.storage.from('documents').download(objectPath);

  if (error || !data) {
    throw new Error(error?.message || 'Unable to download the document from storage.');
  }

  return Buffer.from(await data.arrayBuffer());
}

async function uploadPreviewPdf(objectPath: string, pdfBuffer: Buffer) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.storage.from('documents').upload(objectPath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function getPdfPageCount(pdfBuffer: Buffer) {
  const getDocument = await getPdfJsGetDocument();
  const loadingTask = getDocument({
    data: new Uint8Array(pdfBuffer),
  });

  try {
    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;
    await pdfDocument.destroy();
    return pageCount;
  } finally {
    await loadingTask.destroy();
  }
}

async function runSofficeCommand(args: string[]) {
  let lastError: unknown = null;

  for (const candidate of SOFFICE_CANDIDATES) {
    try {
      await execFileAsync(candidate, args);
      return;
    } catch (error) {
      lastError = error;

      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
        break;
      }
    }
  }

  throw lastError ?? new Error('Preview generation requires LibreOffice (`soffice`).');
}

export async function hasDocumentPreviewRuntime() {
  if (process.env.DOCUMENT_CONVERTER_URL?.trim()) {
    return true;
  }

  try {
    await runSofficeCommand(['--version']);
    return true;
  } catch {
    return false;
  }
}

async function runSofficeConversion(inputPath: string, outputDir: string) {
  const documentConverter = getDocumentConverterConfig();

  if (documentConverter) {
    const inputFilename = basename(inputPath);
    const outputPath = join(outputDir, buildPreviewFilename(inputFilename));
    const formData = new FormData();
    const inputBuffer = await readFile(inputPath);

    formData.append('files', new Blob([inputBuffer]), inputFilename);

    let response: Response;

    try {
      response = await fetch(`${documentConverter.url}/forms/libreoffice/convert`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${documentConverter.username}:${documentConverter.password}`,
          ).toString('base64')}`,
        },
        body: formData,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gotenberg conversion request failed: ${error.message}`);
      }

      throw new Error('Gotenberg conversion request failed.');
    }

    if (!response.ok) {
      const errorText = (await response.text()).trim();

      throw new Error(
        errorText
          ? `Gotenberg conversion failed (${response.status} ${response.statusText}): ${errorText}`
          : `Gotenberg conversion failed (${response.status} ${response.statusText}).`,
      );
    }

    await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    return;
  }

  await runSofficeCommand([
    '--headless',
    '--nologo',
    '--nodefault',
    '--norestore',
    '--nolockcheck',
    '--convert-to',
    'pdf',
    '--outdir',
    outputDir,
    inputPath,
  ]);
}

async function convertOfficeDocumentToPdf(buffer: Buffer, filename: string) {
  const tempRoot = await mkdtemp(join(tmpdir(), 'opendoc-preview-'));

  try {
    const inputPath = join(tempRoot, filename);
    await writeFile(inputPath, buffer);
    await runSofficeConversion(inputPath, tempRoot);

    const outputFilename = buildPreviewFilename(filename);
    const outputPath = join(tempRoot, outputFilename);

    return await readFile(outputPath);
  } finally {
    await rm(tempRoot, { force: true, recursive: true });
  }
}

export async function ensureDocumentPreview(documentId: string) {
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId));

  if (!document) {
    return;
  }

  const normalizedFileType = normalizeViewerFileType(document.fileType);
  const initialPreviewState = getInitialDocumentPreviewState(normalizedFileType);

  if (isPdfViewerFile(normalizedFileType)) {
    try {
      const pdfBuffer = await downloadStoredObjectBuffer(document.fileUrl);
      const pageCount = await getPdfPageCount(pdfBuffer);

      await updateDocumentPreviewState(document.id, {
        pageCount,
        previewError: null,
        previewFileType: 'pdf',
        previewPageCount: pageCount,
        previewStatus: 'ready',
      });
    } catch (error) {
      await updateDocumentPreviewState(document.id, {
        previewError: getPreviewFailureMessage(error),
        previewFileType: initialPreviewState.previewFileType,
        previewPageCount: 0,
        previewStatus: 'failed',
      });
    }

    return;
  }

  if (!isTrackablePreviewSourceFile(normalizedFileType)) {
    await updateDocumentPreviewState(document.id, {
      previewError: null,
      previewFileType: initialPreviewState.previewFileType,
      previewPageCount: 0,
      previewStatus: initialPreviewState.previewStatus,
    });
    return;
  }

  try {
    const originalBuffer = await downloadStoredObjectBuffer(document.fileUrl);
    const previewPdfBuffer = await convertOfficeDocumentToPdf(originalBuffer, document.originalFilename);
    const previewPath = createPreviewStoragePath(document.userId, document.id);
    const pageCount = await getPdfPageCount(previewPdfBuffer);

    await uploadPreviewPdf(previewPath, previewPdfBuffer);

    await updateDocumentPreviewState(document.id, {
      pageCount,
      previewError: null,
      previewFileType: 'pdf',
      previewFileUrl: previewPath,
      previewPageCount: pageCount,
      previewStatus: 'ready',
    });
  } catch (error) {
    await updateDocumentPreviewState(document.id, {
      previewError: getPreviewFailureMessage(error),
      previewFileType: 'pdf',
      previewPageCount: 0,
      previewStatus: 'failed',
    });
  }
}
