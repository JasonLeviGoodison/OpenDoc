# OpenDoc

OpenDoc is an AGPL-licensed document sharing platform for founders, investors, and small teams. It focuses on secure share links, page-level engagement analytics, NDA capture, watermarking, and lightweight virtual data rooms.

## Features

- Secure share links with email, password, expiration, NDA, and download controls
- Gated public viewer with token-protected document delivery
- Page-level analytics, visit tracking, and download tracking
- Dynamic watermark overlays for shared documents
- Virtual data rooms ("spaces") that group multiple documents behind one link
- Basic brand settings for company name, accent color, and logo
- Clerk authentication for workspace users
- PostgreSQL + Drizzle data model with route-level validation and tests

## Stack

- Next.js 16
- React 19
- TypeScript
- Drizzle ORM
- PostgreSQL
- Clerk
- Supabase Storage

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file and fill in real values:

```bash
cp .env.example .env.local
```

3. Apply your database schema and start the app:

```bash
npm run db:push
npm run dev
```

4. Open `http://localhost:3000`

## Environment

OpenDoc expects the variables in [.env.example](./.env.example).

Required for local development:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_MAX_UPLOAD_FILE_SIZE_BYTES` (optional, defaults to `52428800` / 50 MB)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `OPENDOC_TOKEN_SECRET`

## Development

Useful commands:

```bash
npm run dev
npm run lint
npm test
npm run build
npm run db:generate
npm run db:push
```

## Security Notes

- Document access is mediated through signed viewer sessions instead of public raw file URLs
- Link passwords are stored as hashes
- Webhook verification is enforced for Clerk events
- Sensitive environment files are gitignored by default

Please report vulnerabilities using the process in [SECURITY.md](./SECURITY.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

OpenDoc is licensed under the GNU Affero General Public License v3.0. See [LICENSE](./LICENSE).

If you run a modified version of OpenDoc for users over a network, AGPL requires you to make the corresponding source available to those users.
