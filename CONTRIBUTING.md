# Contributing to OpenDoc

## Ground Rules

- Keep pull requests focused and small enough to review.
- Add or update tests when behavior changes.
- Do not commit secrets, production credentials, or real customer data.
- Preserve the existing product direction unless the change explicitly intends to alter it.

## Local Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in valid values.
3. Start the database and backing services you need.
4. Run `npm run db:migrate`.
5. Start the app with `npm run dev`.

## Before Opening a PR

- Run `npm run lint`
- Run `npm test`
- Run `npm run build` if your change affects routing, typing, or production behavior

## Pull Request Notes

- Explain the user-facing change and the risk area.
- Mention any follow-up work or limitations.
- Include screenshots for visible UI changes.

## License

By contributing to OpenDoc, you agree that your contributions will be licensed under the GNU Affero General Public License v3.0.
