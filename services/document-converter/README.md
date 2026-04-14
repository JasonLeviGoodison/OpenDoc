# Document Converter Service

This service runs [Gotenberg](https://gotenberg.dev) on Render so OpenDoc can convert `.pptx`, `.docx`, and `.xlsx` files to PDF.

The Docker image installs baseline Debian fonts plus a curated Google Fonts set for common Google Slides decks, including Roboto, Open Sans, Lato, Montserrat, Oswald, Raleway, PT Sans, PT Serif, Nunito, Nunito Sans, Poppins, Inter, Source Sans, Source Serif, Source Code Pro, Playfair Display, Merriweather, Ubuntu, Rubik, Work Sans, Fira Sans, Quicksand, Cabin, Barlow, and DM Sans. If your files depend on custom brand fonts outside that set, extend the image further and add those font files too.

## Quick Start

1. Deploy on Render.
   Go to `render.com`, create a new `Web Service`, point it at this repo, and use these settings:
   - `Runtime`: `Docker`
   - `Root Directory`: `services/document-converter`
   - `Dockerfile Path`: `./Dockerfile`
   - `Health Check Path`: `/health`

2. Set these env vars on Render.
   Generate strong random credentials first:

   ```bash
   openssl rand -base64 32
   openssl rand -base64 32
   ```

   Then set:
   - `GOTENBERG_API_BASIC_AUTH_USERNAME=<first random value>`
   - `GOTENBERG_API_BASIC_AUTH_PASSWORD=<second random value>`
   - `API_ENABLE_BASIC_AUTH=true`

3. Wait for the service to deploy.
   Your service URL will look like:
   - `https://opendoc-document-converter.onrender.com`

4. Set these env vars in Vercel.
   These must match what you set in Render:
   - `DOCUMENT_CONVERTER_URL=https://opendoc-document-converter.onrender.com`
   - `DOCUMENT_CONVERTER_USERNAME=<same value as GOTENBERG_API_BASIC_AUTH_USERNAME>`
   - `DOCUMENT_CONVERTER_PASSWORD=<same value as GOTENBERG_API_BASIC_AUTH_PASSWORD>`

5. Redeploy your Next.js app.
   PPTX, DOCX, and XLSX uploads will now be converted to PDF through this service.

## What Values Do I Use?

- `DOCUMENT_CONVERTER_URL`
  Use the full public URL of your Render service, for example `https://opendoc-document-converter.onrender.com`
- `DOCUMENT_CONVERTER_USERNAME`
  Use the exact same value as `GOTENBERG_API_BASIC_AUTH_USERNAME` on Render
- `DOCUMENT_CONVERTER_PASSWORD`
  Use the exact same value as `GOTENBERG_API_BASIC_AUTH_PASSWORD` on Render

## Security

Basic Auth over HTTPS is the minimum protection for this service.

- Use strong random credentials, not human-made passwords.
- Render terminates HTTPS for `onrender.com` services, so requests from Vercel to Render are encrypted in transit.
- The browser should not call this service directly. OpenDoc should call it from server-side code only.
- If you want tighter controls later, add Render IP allowlisting or put the service behind your own reverse proxy.

Generate credentials with:

```bash
openssl rand -base64 32
```

## Local Smoke Test

Run the service locally:

```bash
docker build -t opendoc-document-converter services/document-converter
docker run --rm -p 3000:3000 opendoc-document-converter
```

Then convert a file:

```bash
curl \
  --request POST \
  --user "$GOTENBERG_API_BASIC_AUTH_USERNAME:$GOTENBERG_API_BASIC_AUTH_PASSWORD" \
  --form files=@/absolute/path/to/file.pptx \
  --output converted.pdf \
  http://localhost:3000/forms/libreoffice/convert
```

If you run locally without `API_ENABLE_BASIC_AUTH=true`, omit `--user`.

## API Reference

Most users only need the Quick Start above.

OpenDoc calls this endpoint:

- `POST https://<your-render-service>.onrender.com/forms/libreoffice/convert`

Request:

- `Content-Type: multipart/form-data`
- Form file field: `files`
- Header: `Authorization: Basic <base64(username:password)>`

Response:

- `200 OK`: PDF bytes for a single uploaded file
- `400 Bad Request`: invalid form fields
- `503 Service Unavailable`: conversion timeout or LibreOffice health issue

If multiple `files` are uploaded, Gotenberg returns a ZIP instead of a single PDF.
