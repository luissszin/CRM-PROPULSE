# Cleanup Inventory - Phase 1

**Generated:** 2026-01-26 18:04  
**Branch:** chore/cleanup-hardening-railway

## Debug Files in Root (28 total)

| File                   | Size   | Type   | Action  | Reason                   |
| ---------------------- | ------ | ------ | ------- | ------------------------ |
| backend.log            | 5.8KB  | Log    | Archive | Runtime debug log        |
| backend_err.log        | 1.1KB  | Log    | Archive | Error log                |
| checklist_output.txt   | 2.9KB  | Test   | Archive | Test output snapshot     |
| debug_connect.txt      | 26B    | Debug  | Archive | WhatsApp debug           |
| debug_create.txt       | 995B   | Debug  | Archive | WhatsApp debug           |
| debug_logs.txt         | 1.7KB  | Debug  | Archive | WhatsApp debug           |
| debug_out.txt          | 1.8KB  | Debug  | Archive | WhatsApp debug           |
| evolution_debug.log    | 7.8KB  | Log    | Archive | Evolution provider debug |
| evolution_raw_logs.txt | 8.3KB  | Log    | Archive | Evolution raw output     |
| final_report.txt       | 1.2KB  | Report | Archive | Test report              |
| latest_logs.txt        | 7.4KB  | Log    | Archive | Logs snapshot            |
| qr_code.txt            | 17B    | Debug  | Archive | QR test                  |
| qr_status.txt          | 17B    | Debug  | Archive | Status test              |
| sqlite_conn.txt        | 48B    | Debug  | Archive | SQLite test              |
| sqlite_res.txt         | 2.0KB  | Debug  | Archive | SQLite results           |
| test_audit_out.txt     | 1.6KB  | Test   | Archive | Audit output             |
| test_output.txt        | 21.9KB | Test   | Archive | Test run output          |
| test_real_debug.txt    | 2.9KB  | Test   | Archive | Debug output             |
| test_real_debug_v2.txt | 2.9KB  | Test   | Archive | Debug output (dup)       |
| test_real_debug_v3.txt | 3.2KB  | Test   | Archive | Debug output (dup)       |
| test_real_debug_v4.txt | 3.8KB  | Test   | Archive | Debug output (dup)       |
| test_real_debug_v5.txt | 1.3KB  | Test   | Archive | Debug output (dup)       |
| test_real_final.txt    | 543B   | Test   | Archive | Test final               |
| test_real_out.txt      | 3.1KB  | Test   | Archive | Test output              |
| test_real_out_v2.txt   | 2.3KB  | Test   | Archive | Test output (dup)        |
| test_real_out_v3.txt   | 2.3KB  | Test   | Archive | Test output (dup)        |
| test_summary.txt       | 6.3KB  | Test   | Archive | Summary                  |
| test_summary_final.txt | 10.6KB | Test   | Archive | Summary final            |

**Total Size:** ~96KB of debug/test output files

## Proposed Action

Move all files to `/docs/debug-archive/` to preserve history without cluttering root directory.
