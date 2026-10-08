# Testing Guide

The current launch gate is in [LAUNCH_HANDOFF_2026-10-07.md](LAUNCH_HANDOFF_2026-10-07.md). Run the full suite, TypeScript check, production build, relevant Python model tests, and signed-in/mobile smoke checks after changes. Historical test counts below are not a current pass result.

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-reruns when files change)
npm run test:watch

# Run a specific test file
npm test -- app/api/add-friend/__tests__/route.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should require authorization"

# Run tests with coverage report
npm test -- --coverage

# Run tests in verbose mode (see all test names)
npm test -- --verbose

# Run tests and update snapshots (if using snapshots)
npm test -- --updateSnapshot
```

### Watch Mode Tips

When using `npm run test:watch`, you can press:
- `a` - Run all tests
- `f` - Run only failed tests
- `q` - Quit watch mode
- `p` - Filter by filename pattern
- `t` - Filter by test name pattern

### Running Specific Tests

```bash
# Run only tests in a specific directory
npm test -- utils/__tests__/

# Run tests matching a pattern in name
npm test -- --testNamePattern="authentication"

# Run tests in a specific file
npm test -- battleProcessor.test.ts
```

### Debugging Tests

```bash
# Run tests with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run tests with more detailed output
npm test -- --verbose --no-coverage
```

## Test Structure

Tests are organized in `__tests__` directories:
- `app/api/*/__tests__/route.test.ts` - API route tests
- `utils/__tests__/*.test.ts` - Utility function tests

## What Gets Tested

- ✅ Cron job syncs all users
- ✅ New full-history retention is bounded to the newest 100 eligible matches per tracked subject; compact deck totals are separate
- ✅ User isolation (different users track different friends)
- ✅ Authentication and authorization
- ✅ Battle processing logic
- ✅ Friend management (add/remove)
- ✅ Error handling

