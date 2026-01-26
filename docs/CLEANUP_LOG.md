# Cleanup Log - Phase 1

**Date:** 2026-01-26 18:04  
**Branch:** chore/cleanup-hardening-railway

## Actions Taken

### 1. Node Version Standardization

- **Added:** `.nvmrc` with value `20`
- **Modified:** `package.json` - Added engines field:
  ```json
  "engines": {
    "node": ">=20 <23",
    "npm": ">=9"
  }
  ```
- **Reason:** Project running Node 24 locally but should use LTS 20 for stability. Dockerfile already uses node:20-slim.

### 2. Debug Files Cleanup

**Action:** Moved 28 debug files from root to `docs/debug-archive/`

**Files Moved:**

- `*.log` files (8 total): backend.log, backend_err.log, evolution_debug.log, evolution_raw_logs.txt, latest_logs.txt
- `test_*.txt` files (14 total): All test output snapshots
- `debug_*.txt` files (4 total): WhatsApp debug outputs
- Other debug files (2 total): qr_code.txt, qr_status.txt, sqlite_conn.txt, sqlite_res.txt, checklist_output.txt, final_report.txt

**Total:** ~96KB of debug artifacts archived

**Reason:** These are test/debug outputs that clutter the repository root. Preserved in archive for reference.

## Not Touched

- `docker-compose.yml.bak` - Keeping for now (needs manual review)
- Production code files
- Test suite source files
- Configuration files (.env, .gitignore, etc.)

## Evidence

- All files visible in `docs/CLEANUP_INVENTORY.md`
- Archive directory: `docs/debug-archive/`
