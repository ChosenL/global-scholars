# End-to-End Tests

Playwright browser tests live in this directory.

Run the suite with:

```bash
npm run test:e2e
```

Build the application before running the suite. Playwright starts the production
server on port `3100` by default. Set
`PLAYWRIGHT_BASE_URL` to test an already-running environment, or
`PLAYWRIGHT_PORT` to use another local port.

Reusable authenticated and data fixtures belong in `e2e/fixtures`. Never commit
credentials or storage-state files containing session data.
