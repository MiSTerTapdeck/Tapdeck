# Contributing to Tapdeck

Thanks for helping improve Tapdeck.

## Before you start

- Use Node.js 24.
- Do not add ROMs, BIOS files, copyrighted artwork packs, personal MiSTer configuration, IP addresses, API credentials, APK files, or generated caches to a pull request.
- Keep each change focused and explain its user-facing effect in the pull request.

## Set up and verify

```bash
npm ci
npm run typecheck
npm test
```

For work that changes MiSTer communication, library scanning, launch behaviour, artwork retrieval, or helper services, test on a physical Android device with a MiSTer before opening a pull request. State what you tested in the pull request description.

## Pull requests

1. Create a branch from `master`.
2. Make the smallest useful change.
3. Add or update tests when behaviour changes.
4. Run the checks above.
5. Update documentation when setup, user behaviour, or helper installation changes.
6. Open a pull request against `master` and describe the problem, solution, and testing.

If you believe you have found a security issue, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

By contributing, you agree that your contribution is provided under the repository's current [licence](LICENSE).