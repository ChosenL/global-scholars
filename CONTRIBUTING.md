# Contributing to Global Scholars OS

Thank you for contributing to Global Scholars OS. These guidelines help keep changes reviewable, secure, and ready for release.

## Local Development Setup

1. Install the Node.js version specified in `.nvmrc`.
2. Install dependencies:

   ```bash
   npm ci
   ```

3. Copy `.env.example` to `.env.local` and provide the required local credentials. Never commit secrets or production credentials.
4. Start the development server:

   ```bash
   npm run dev
   ```

## Branch Naming Conventions

Create branches from the repository's current default branch and use a short, descriptive, lowercase name:

- `feature/<description>` for new capabilities
- `fix/<description>` for bug fixes
- `docs/<description>` for documentation
- `chore/<description>` for tooling and maintenance
- `security/<description>` for security hardening

Use hyphens between words, for example `fix/dashboard-message-scroll`.

## Commit Message Conventions

Use Conventional Commit-style messages:

```text
<type>(optional-scope): <concise description>
```

Common types include `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, and `security`.

Examples:

```text
feat(advisor): add student readiness summary
fix(messages): prevent outer dashboard scrolling
docs(release): add RC1 release notes
```

Keep each commit focused on one logical change. Do not commit generated artifacts, credentials, or unrelated formatting changes.

## Pull Request Workflow

1. Rebase or update your branch from the current default branch.
2. Make a focused change with appropriate tests and documentation.
3. Run the required local quality checks.
4. Open a pull request using the repository template.
5. Link the related issue and clearly describe security and deployment impacts.
6. Address review feedback and ensure required checks pass.
7. Obtain approval from the applicable code owner before merging.

Do not merge a pull request with failing checks or unresolved review comments.

## Testing Expectations

Changes must include testing proportional to their risk. Bug fixes should include regression coverage, and new behavior should include relevant automated tests.

Run the following before opening a pull request:

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

The Git hooks provide additional local safeguards:

- Pre-commit runs ESLint and Prettier only on staged files through lint-staged.
- Pre-push runs TypeScript type checking and the complete existing test suite.

Hooks do not replace CI or manual testing. Verify authentication, authorization, data access, and user-facing workflows when they are affected.
