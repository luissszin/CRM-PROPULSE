# Task: Codebase Bug Clean-up - COMPLETED

## Analysis

The codebase had several critical bugs ranging from security vulnerabilities (missing authentication on admin routes) to logic errors in WhatsApp service integration and frontend state management.

## Reproduction / Evidence

- **Security**: `backend/routes/admin.js` did not use `requireAuth` or `requireRole`.
- **Schema**: `backend/db/schema.sql` referenced `whatsapp_instances` which was inconsistent with `unit_whatsapp_connections`.
- **State Management**: `frontend/src/store/multiTenantStore.ts` logout function only cleared auth state, not data state.
- **API Mismatch**: `api.sendWhatsappMessage` in `api.ts` expected `unitId` but store passed `instanceId`.

## Root Cause Analysis

- **Fragmentation**: Rapid transitions between different WhatsApp providers left behind legacy code and inconsistent table references.
- **Security Oversight**: Admin routes were likely added for debugging and never secured.
- **Typographical Errors**: Mismatched variable names in API calls between frontend and backend.

## Proposed Changes (ALL COMPLETED)

### 1. Security & Authentication

- [x] Add `requireAuth` and `requireRole(['super_admin'])` to `backend/routes/admin.js`.
- [x] Secure `/leads/units` and `POST /leads/units` in `backend/routes/leads.js` with `requireRole(['super_admin'])`.

### 2. Backend Logic & Schema

- [x] Updated `backend/routes/conversations.js` to use unified `whatsappService` and support message enrichment.
- [x] Secured and unified WhatsApp webhooks by removing legacy `zapiRoutes` and `webhooks.js` from `serve.js`.
- [x] Fixed `EvolutionProvider.sendMessage` crash by adding safety checks on response object.
- [x] Updated `conversations` table schema to reference `unit_whatsapp_connections` correctly.
- [x] Fixed `process.on('uncaughtException')` in `serve.js` to actually exit after logging.

### 3. Frontend Store & API

- [x] Update `multiTenantStore.ts` logout to clear all data (leads, conversations, messages, chatbotFlows).
- [x] Fix `sendWhatsappMessage` in `api.ts` and its usage in `multiTenantStore.ts` to correctly handle `unitId`.
- [x] Implemented robust mapping between snake_case (DB) and camelCase (Store) for Leads, Conversations, and Messages.
- [x] Enhanced `synchronize` to update local state with official IDs returned from the API.

### 4. Code Cleanup

- [x] Removed unused `whatsapp_instances` references in `inmemoryDb.js` and `schema.sql`.
- [x] Standardized snake_case vs camelCase mapping in frontend sync.

## Verification Plan

### Automated Tests

- [x] Run `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`: **PASSED** (No critical issues found).
- [x] Run `npm run build` in `frontend`: **PASSED**.
- [x] TypeScript types check (`npx tsc --noEmit`): **PASSED**.

### Manual Verification Completed

- [x] Verified admin routes redirection and protection.
- [x] Verified store data clearing on logout.
- [x] Verified unified message sending logic in conversations controller.
