# SecureConvert

SecureConvert is a privacy-focused MVP web app for converting PDFs and images using local server-side processing only.

## Features

- PDF to PNG (`POST /api/convert/pdf-to-png`)
- PDF to JPEG (`POST /api/convert/pdf-to-jpeg`)
- JPG/JPEG/PNG to PDF (`POST /api/convert/image-to-pdf`)
- PDF compression (`POST /api/convert/compress-pdf`)
- Batch upload where practical (multi-image upload for image-to-pdf)
- Individual downloads and ZIP download for multi-output conversions
- Health check endpoint (`GET /api/health`)

## Tech Stack

- **Backend:** Node.js (current LTS line, Node 20+) with Express
- **Frontend:** Plain HTML, CSS, vanilla JavaScript
- **Storage:** Temporary filesystem only (no database, no long-term user file storage)

## Conversion Libraries and Tools

- **pdftoppm (Poppler):** Converts PDF pages into PNG/JPEG reliably.
- **Ghostscript (`gs`):** Compresses PDFs with configurable presets.
- **pdf-lib:** Creates PDFs from uploaded images.
- **sharp:** Reads image metadata and supports robust image handling.
- **archiver:** Creates ZIP archives when output includes multiple files.

Why this set:
- Maintained projects with broad production usage.
- Local-only conversion path (no third-party cloud conversion APIs).
- Straightforward command-line integration for an MVP while keeping logic modular.

## Prerequisites

1. Node.js **20.x LTS or newer**
2. npm
3. System binaries:
   - `pdftoppm` (Poppler)
   - `gs` (Ghostscript)

Example install (Debian/Ubuntu):

```bash
sudo apt-get update
sudo apt-get install -y poppler-utils ghostscript
```

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Production start:

```bash
npm start
```

Open: `http://localhost:3000`

## Environment Configuration

See `.env.example`.

Important values:
- `MAX_FILE_SIZE_MB`, `MAX_FILES_PER_REQUEST`
- `TEMP_FILE_TTL_MINUTES`, `CLEANUP_INTERVAL_MINUTES`
- `RATE_LIMIT_*`
- `PDF_RENDER_DPI`, `PDF_JPEG_QUALITY`, `PDF_COMPRESSION_PRESET`
- `TRUST_PROXY=1` for reverse proxy deployments

## Security and Privacy Notes

- Uploads are validated by **extension + MIME type + file signature**.
- Strict allowlists: only PDF, JPG/JPEG, PNG accepted by relevant endpoints.
- Server-side temp files are stored under `tmp/` outside `public/`.
- Random UUID filenames are used for temporary storage.
- Files are deleted:
  - immediately after conversion inputs are consumed,
  - after download for generated outputs,
  - and by scheduled expiry cleanup.
- Rate limiting is applied globally and specifically to upload/conversion endpoints.
- Helmet security headers enabled; `x-powered-by` disabled.
- Request logger intentionally avoids file content and sensitive metadata.
- Error responses are safe; no stack traces leaked in production.
- No user accounts, sessions, cookies, analytics, or ad/tracker scripts.

## HTTPS and Reverse Proxy Deployment

SecureConvert is intended to run behind a reverse proxy (Nginx/Caddy/Traefik) terminating TLS.

Recommendations:
- Enforce HTTPS redirect at the proxy.
- Forward `X-Forwarded-*` headers and keep `TRUST_PROXY=1`.
- Restrict max body size at proxy and app level.
- Run under least privilege and isolate temp directories.

## Threat Model (Short)

Primary concerns:
- Malicious upload payloads
- Path traversal attempts
- Resource exhaustion (large files, request floods)
- Data leakage through logs or stale temp files

Mitigations implemented:
- Strict type/size/count validation and signature checks
- Path safety checks and random temp names
- Rate limits and robust error handling
- Short retention and automatic cleanup
- Minimal, sanitized operational logging

Residual risks:
- Parser/library vulnerabilities in third-party tools
- Denial-of-service from distributed traffic beyond local rate limits
- Host compromise exposing in-flight temp files

## Known Limitations

- Requires local binaries (`pdftoppm`, `gs`) installed on the host.
- PDF compression quality/size tradeoffs are preset-based.
- This is a **server-side** web app; it is less private than a fully local desktop conversion app where files never leave the user's device.
- In-memory download token store is suitable for MVP single-instance deployments; clustered deployments need shared state.

## Project Structure

- `/server` - server boot and config
- `/public` - static UI (HTML/CSS/JS)
- `/tmp` - temporary files for processing
- `/services` - conversion service layer
- `/routes` - API route handlers
- `/middleware` - validation, security, and error middleware
- `/utils` - logging, cleanup, file safety helpers
