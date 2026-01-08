# Authentication & Authorization System

This document describes the complete authentication and authorization system implemented in the Attendance Management application.

## Overview

The system provides:
- User authentication with username/password
- Group-based role permissions
- Hierarchical access control
- Complete audit logging of all changes
- Secure password hashing with bcrypt
- JWT-based session management

## Database Schema

> 📍 **Database Location:** All databases are stored in the `databases/` folder. See [DATABASE-LOCATION.md](DATABASE-LOCATION.md) for path resolution details.

### Tables

#### `users`
Stores user accounts and credentials.
```sql
- id: Unique user identifier
- username: Login username (unique)
- password_hash: Bcrypt hashed password
- full_name: User's display name
- email: Email address (optional, unique)
- group_id: Reference to groups table
- is_active: 1 for active, 0 for deactivated
- last_login: Timestamp of last successful login
- created_at, updated_at: Timestamps
```

#### `groups`
Defines user groups and their permission levels.
```sql
- id: Unique group identifier
- name: Group name (unique)
- description: Optional description
- is_master: 1 for master admin group with full access
- can_view_all: 1 to view all groups' data
- can_edit_all: 1 to edit all groups' data
- created_at, updated_at: Timestamps
```

#### `group_permissions`
Defines specific permissions between groups.
```sql
- id: Unique identifier
- group_id: The group that has the permission
- target_group_id: The group being accessed
- can_view: 1 if group_id can view target_group_id's data
- can_edit: 1 if group_id can edit target_group_id's data
- created_at: Timestamp
```

#### `audit_log`
Tracks all data changes in the system.
```sql
- id: Unique log entry identifier
- user_id: User who made the change
- action: 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
- table_name: Table that was modified
- record_id: ID of the record modified
- old_values: JSON of old values (for updates/deletes)
- new_values: JSON of new values (for creates/updates)
- ip_address: Client IP address
- user_agent: Client user agent string
- created_at: Timestamp
```

## Default Groups

The system creates four default groups:

### 1. Master (ID: 1)
- Full access to all functionality
- Can view and edit all data
- Can manage users and groups
- Default admin user belongs to this group

### 2. Managers (ID: 2)
- Can view all groups' data
- Cannot edit other groups' data by default
- Can be granted specific edit permissions

### 3. HR (ID: 3)
- Can view all groups' data
- Can edit all groups' data
- Can manage users

### 4. Employees (ID: 4)
- Limited access
- Can only view/edit their own group's data
- Cannot manage users or groups

## Default Admin Account

**Username:** admin
**Password:** admin123

⚠️ **IMPORTANT:** Change this password immediately in production!

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Authenticate a user and receive a JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "System Administrator",
    "email": "admin@attendance.local",
    "group_id": 1,
    "group": {
      "id": 1,
      "name": "Master",
      "is_master": 1,
      "can_view_all": 1,
      "can_edit_all": 1
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

The token is also set as an HTTP-only cookie named `auth_token`.

#### POST `/api/auth/logout`
Log out the current user and clear the session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true
}
```

#### GET `/api/auth/verify`
Verify the current session and get user info.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "System Administrator",
    "group_id": 1,
    "group": { ... }
  }
}
```

### User Management

#### GET `/api/users`
Get all users (requires view_all permission).

**Query Parameters:**
- `id`: Optional, get a specific user by ID

**Headers:**
```
Authorization: Bearer <token>
```

#### POST `/api/users`
Create a new user (requires Master or HR group).

**Request:**
```json
{
  "username": "jdoe",
  "password": "securepassword",
  "full_name": "John Doe",
  "email": "jdoe@example.com",
  "group_id": 4,
  "is_active": 1
}
```

#### PUT `/api/users`
Update an existing user (requires Master or HR group).

**Request:**
```json
{
  "id": 2,
  "full_name": "Jane Doe",
  "email": "janedoe@example.com",
  "group_id": 3,
  "password": "newpassword"  // Optional
}
```

#### DELETE `/api/users?id=2`
Deactivate a user (requires Master group).

### Group Management

#### GET `/api/groups`
Get all groups (requires authentication).

**Query Parameters:**
- `id`: Optional, get a specific group by ID

#### POST `/api/groups`
Create a new group (requires Master group).

**Request:**
```json
{
  "name": "Sales Team",
  "description": "Sales department users",
  "can_view_all": 0,
  "can_edit_all": 0
}
```

#### PUT `/api/groups`
Update a group (requires Master group).

**Request:**
```json
{
  "id": 5,
  "name": "Sales Team",
  "description": "Updated description",
  "can_view_all": 1
}
```

### Audit Log

#### GET `/api/audit`
View audit log entries (requires Master or HR group).

**Query Parameters:**
- `table`: Filter by table name
- `recordId`: Filter by record ID
- `userId`: Filter by user ID
- `limit`: Number of entries (default 100)
- `offset`: Offset for pagination (default 0)

**Examples:**
- `/api/audit` - Get last 100 entries
- `/api/audit?table=employees&recordId=5` - Get all changes to employee #5
- `/api/audit?userId=2&limit=50` - Get last 50 actions by user #2

## Permission System

### Permission Hierarchy

1. **Master Group** (is_master = 1)
   - Full access to everything
   - Bypasses all permission checks

2. **View/Edit All** (can_view_all, can_edit_all)
   - Can view/edit all groups' data
   - Cannot manage groups (only Master can)

3. **Specific Permissions** (group_permissions table)
   - Grant specific view/edit access between groups
   - Example: Managers can view Employees group

4. **Same Group Access**
   - Users can always view/edit data in their own group

### Permission Checks

Every API endpoint that accesses data performs these checks:

1. **Authentication Check**
   - Is the user logged in with a valid token?

2. **Authorization Check**
   - Is the user's group a Master group? → Allow
   - Does the user's group have view_all/edit_all? → Allow
   - Is this the user's own group? → Allow
   - Does a group_permission exist? → Check permission

3. **Audit Log**
   - Log all CREATE, UPDATE, DELETE operations
   - Include old and new values
   - Track IP address and user agent

## Usage Examples

### Client-Side Authentication

```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});

const { user, token } = await response.json();

// Store token for subsequent requests
localStorage.setItem('auth_token', token);

// Make authenticated requests
const employees = await fetch('/api/employees', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Logout
await fetch('/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Managing Users

```typescript
// Create a new user
await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'jsmith',
    password: 'initialPassword',
    full_name: 'John Smith',
    email: 'jsmith@example.com',
    group_id: 4  // Employees group
  })
});

// Update a user
await fetch('/api/users', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 5,
    full_name: 'Jonathan Smith',
    group_id: 3  // Move to HR group
  })
});
```

### Viewing Audit Logs

```typescript
// Get recent audit entries
const audit = await fetch('/api/audit?limit=50', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const entries = await audit.json();
console.log(entries);
// [
//   {
//     id: 123,
//     user_id: 1,
//     username: "admin",
//     full_name: "System Administrator",
//     action: "UPDATE",
//     table_name: "employees",
//     record_id: 5,
//     old_values: "{\"first_name\":\"John\"}",
//     new_values: "{\"first_name\":\"Jonathan\"}",
//     ip_address: "192.168.1.100",
//     created_at: "2025-12-29 10:30:00"
//   }
// ]
```

## Security Considerations

### Password Security
- Passwords are hashed using bcrypt with 10 salt rounds
- Original passwords are never stored or logged
- Password hashes are never sent in API responses

### Token Security
- JWT tokens expire after 24 hours
- Tokens are signed with a secret key (set via JWT_SECRET environment variable)
- Tokens are stored in HTTP-only cookies to prevent XSS attacks
- Also supported via Authorization header for API clients

### Audit Trail
- All data modifications are logged
- IP addresses and user agents are tracked
- Old and new values are preserved for all updates
- Cannot be modified or deleted by non-Master users

### Best Practices

1. **Change Default Password**
   ```sql
   UPDATE users
   SET password_hash = <new_hash>
   WHERE username = 'admin';
   ```
   Or use the API to update the admin user's password.

2. **Set JWT Secret**
   ```bash
   # In .env or environment variables
   JWT_SECRET=your-very-secure-random-string-here
   ```

3. **Use HTTPS in Production**
   - Tokens and passwords should only be sent over HTTPS
   - Set `secure: true` for cookies in production

4. **Implement Rate Limiting**
   - Add rate limiting to login endpoint to prevent brute force attacks
   - Consider using a package like `express-rate-limit`

5. **Regular Audit Reviews**
   - Periodically review audit logs for suspicious activity
   - Monitor failed login attempts
   - Check for unauthorized access attempts

## Troubleshooting

### "Unauthorized" Error
- Check that the token is being sent correctly
- Verify the token hasn't expired (24 hours)
- Ensure the user is still active (is_active = 1)

### "Forbidden" Error
- User doesn't have permission for the requested action
- Check the user's group permissions
- Verify group_permissions table for specific grants

### Login Not Working
- Verify username and password are correct
- Check that user is active (is_active = 1)
- Review audit log for failed login attempts

### Database Reset

To reset the database and recreate all tables including auth tables:

```bash
# Development
npm run db:reset

# Or manually
node scripts/reset-database.js
```

This will:
1. Delete the existing database
2. Create fresh tables (employees, users, groups, etc.)
3. Insert default groups and admin user
4. Insert default time codes

**⚠️ WARNING:** This deletes ALL data including users and audit logs!
