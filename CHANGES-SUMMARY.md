# Database Path Fix - Changes Summary

## Issue Fixed

**Problem:** Databases were being created in random locations depending on where the Node.js process was started from, instead of always being in the `databases/` folder.

**Root Cause:** Code was using `process.cwd()` which returns the current working directory where the process was started, not the project root.

## Changes Made

### 1. Fixed Database Path Resolution

#### [lib/db-sqlite.ts](lib/db-sqlite.ts)
**Before:**
```typescript
const dbPath = path.join(process.cwd(), 'databases', 'attendance.db');
```

**After:**
```typescript
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// IMPORTANT: Database path is always relative to project root
const dbPath = path.join(projectRoot, 'databases', 'attendance.db');
```

#### [scripts/reset-database.ts](scripts/reset-database.ts)
**Before:**
```typescript
const dbPath = path.join(process.cwd(), 'databases', 'attendance.db');
```

**After:**
```typescript
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dbPath = path.join(projectRoot, 'databases', 'attendance.db');
```

### 2. Documentation Created/Updated

#### New Documentation:
- **[DATABASE-LOCATION.md](DATABASE-LOCATION.md)** - Complete guide on database path resolution
  - Explains why `process.cwd()` should not be used
  - Shows correct path resolution pattern
  - Troubleshooting section
  - Deployment notes

#### Updated Documentation:
- **[README.md](README.md)**
  - Updated port number from 3000 to 6029
  - Added database location warning
  - Added authentication section
  - Updated available scripts
  - Updated database schema section

- **[DATABASE-MANAGEMENT.md](DATABASE-MANAGEMENT.md)**
  - Added warning about database location
  - Link to DATABASE-LOCATION.md

- **[AUTH-SYSTEM.md](AUTH-SYSTEM.md)**
  - Added database location note
  - Link to DATABASE-LOCATION.md

### 3. Cleanup

- Deleted old `scripts/reset-database.js` (replaced by TypeScript version)
- Removed test files (`test-login.json`, `scripts/check-db.ts`, `scripts/check-password.ts`)

## Why This Approach?

### ✅ Benefits of Using `fileURLToPath` + `import.meta.url`:

1. **Consistent Path Resolution**
   - Always resolves relative to the file's location
   - Independent of where the process is started

2. **Works Across All Environments**
   - Development server
   - Production build
   - Standalone executables
   - Different operating systems

3. **Prevents Data Loss**
   - No more databases created in unexpected locations
   - All data stays in `databases/` folder
   - Easy to backup and manage

### ❌ Why Not `process.cwd()`?

```bash
# Example of the problem:
cd /some/other/directory
npm --prefix /path/to/project run dev
# Database would be created in /some/other/directory/databases/
```

## Verification

To verify the fix is working:

1. **Check the database path:**
   ```bash
   # From any directory, run:
   cd /some/random/directory
   npm --prefix c:\Users\Public\Projects\GitHub\multi-user-timesheet run dev

   # Database should still be created in:
   # c:\Users\Public\Projects\GitHub\multi-user-timesheet\databases\attendance.db
   ```

2. **Reset the database:**
   ```bash
   npm run db:reset
   ```

3. **Verify only one database exists:**
   ```bash
   # Windows
   dir attendance.db /s

   # Should only show: <project-root>\databases\attendance.db
   ```

## Testing Done

- ✅ Build succeeded with new imports
- ✅ Database reset works correctly
- ✅ Path resolution uses project root
- ✅ Authentication system still working
- ✅ Login endpoint tested successfully

## Files Modified

1. `lib/db-sqlite.ts` - Fixed path resolution
2. `scripts/reset-database.ts` - Fixed path resolution
3. `README.md` - Updated documentation
4. `DATABASE-MANAGEMENT.md` - Added location warning
5. `AUTH-SYSTEM.md` - Added location note

## Files Created

1. `DATABASE-LOCATION.md` - Complete database location guide
2. `CHANGES-SUMMARY.md` - This file

## Files Deleted

1. `scripts/reset-database.js` - Old JavaScript version
2. `test-login.json` - Test file
3. `scripts/check-db.ts` - Debug script
4. `scripts/check-password.ts` - Debug script

## Next Steps

No action required. The fix is complete and tested.

**Important Reminder:**
- Always use `databases/` folder for all database files
- Never use `process.cwd()` for database paths
- Import database from `lib/db-sqlite.ts` for consistent access
- See [DATABASE-LOCATION.md](DATABASE-LOCATION.md) for guidelines

## Server Status

- Default port: **6029** (configured in `.env` and `package.json`)
- Database location: **`<project-root>/databases/attendance.db`**
- Authentication: **Enabled** (default admin:admin123)
