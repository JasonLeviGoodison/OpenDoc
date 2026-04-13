'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '@/lib/upload';
import { Upload, FileText, X, Check } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: File[], name: string) => Promise<void>;
}

export function UploadModal({ open, onOpenChange, onUpload }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setError('');
    if (acceptedFiles.length > 0 && !name) {
      setName(acceptedFiles[0].name.replace(/\.[^/.]+$/, ''));
    }
  }, [name]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    maxSize: MAX_UPLOAD_FILE_SIZE_BYTES,
  });

  async function handleUpload() {
    if (files.length === 0 || !name) return;
    setUploading(true);
    setError('');
    try {
      await onUpload(files, name);
      setUploadComplete(true);
      setTimeout(() => {
        onOpenChange(false);
        setFiles([]);
        setName('');
        setUploadComplete(false);
        setError('');
      }, 1000);
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Upload Document"
      description="Upload a PDF, PowerPoint, Word, or Excel file"
      size="lg"
    >
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer',
            isDragActive
              ? 'border-accent bg-accent-muted'
              : 'border-border hover:border-border-hover hover:bg-card-hover',
            files.length > 0 && 'border-success/30 bg-success/5'
          )}
        >
          <input {...getInputProps()} />
          {files.length > 0 ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <FileText size={24} className="text-success" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{files[0].name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(files[0].size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFiles([]);
                }}
                className="ml-4 p-1 rounded hover:bg-card-hover cursor-pointer"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <Upload size={24} className="text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
              </p>
              <p className="text-xs text-muted">
                PDF, PowerPoint, Word, or Excel &middot; Max {formatFileSize(MAX_UPLOAD_FILE_SIZE_BYTES)}
              </p>
            </>
          )}
        </div>

        {/* Document name */}
        <Input
          label="Document Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name for this document"
        />

        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : null}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || !name}
            loading={uploading}
          >
            {uploadComplete ? (
              <>
                <Check size={16} />
                Uploaded!
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
