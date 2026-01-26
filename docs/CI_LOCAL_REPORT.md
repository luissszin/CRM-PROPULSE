# CI/Local Baseline Report - Phase 0

**Date:** 2026-01-26 17:54  
**Branch:** `chore/cleanup-hardening`  
**Purpose:** Pre-cleanup safety snapshot

---

## Environment

- **Node Version:** v24.11.1
- **npm Version:** 11.6.2
- **OS:** Windows
- **Packages Installed:** 549 packages (audited)

---

## Build & Test Status

### npm install

✅ **SUCCESS** - All dependencies up to date

### npm run lint

❌ **FAILED** - Script not defined in package.json

### npm test

❌ **FAILED** - Module resolution error:

```
ERR_MODULE_NOT_FOUND
File: backend/services/automation/whatsapp/whatsapp.service.js
```

**Analysis:** Path appears incorrect. The actual path is `backend/services/whatsapp/whatsapp.service.js` (not under automation/).

### Docker Build

⏸️ **PENDING** - Not run yet (will run after initial cleanup)

---

## Test Files Inventory (12 total)

**Location:** `backend/tests/` and `backend/test/`

1. `evolution_complete_e2e.test.js` - CRITICAL
2. `evolution_e2e.test.js` - Potentially duplicate
3. `evolution_webhook.test.js` - CRITICAL
4. `integration_real.test.js` - Review
5. `reproduce_evolution_crash.test.js` - Legacy/Debug
6. `security.test.js` - CRITICAL
7. `security_isolation.test.js` - CRITICAL
8. `smoke.test.js` - CRITICAL
9. `verify_evolution_patch.test.js` - Legacy/Debug
10. `whatsapp_integration.test.js` - Review for duplicates
11. `test/deep-test.js` - Orphaned test folder
12. `scripts/test_runner.js` - Runner script

---

## Cleanup Targets Identified

### Technical Debt Files (non-code)

- ❌ Multiple `*.txt` debug outputs in root (18+ files: `test_*.txt`, `debug_*.txt`, etc.)
- ❌ `docker-compose.yml.bak`
- ❌ Orphaned `test/` folder (separate from `tests/`)

### Legacy/Duplicate Tests

- ❌ `evolution_e2e.test.js` vs `evolution_complete_e2e.test.js` (likely duplicate)
- ❌ `reproduce_evolution_crash.test.js` (debug-only)
- ❌ `verify_evolution_patch.test.js` (debug-only)
- ❌ `integration_real.test.js` (overlaps with e2e?)

### Missing Infrastructure

- ⚠️ No `lint` script in root `package.json`
- ⚠️ Test runner has path errors

---

## Next Steps (Phase 1)

1. Fix test path issue (automation/whatsapp -> whatsapp)
2. Remove debug `.txt` files
3. Consolidate test suites
4. Add lint script
5. Document removals in CLEANUP_LOG.md
