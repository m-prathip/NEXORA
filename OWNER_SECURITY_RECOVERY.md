# NEXORA – Developer Super Admin Account Security & Disaster Recovery Guide
**Document Version:** 1.0.0  
**Classification:** Confidential – Platform Developer / Owner Only  
**Date:** November 2026  

---

## 1. Initial Account Provisioning (One-Time Bootstrap)

To prevent public exploitation, NEXORA provides **no public registration endpoint** for administrators or developers. The initial `SUPER_ADMIN` account is provisioned exclusively through a secure, server-side CLI bootstrap script.

### 1.1 Server-Side Execution
```bash
# Secure execution from the protected server environment:
ADMIN_USERNAME="nexora_owner" \
ADMIN_EMAIL="owner@nexora.network" \
ADMIN_PASSWORD="YourStrongPassword123!" \
node backend/scripts/bootstrapAdmin.js
```

### 1.2 Lockout & Invalidation Rules
1. **Database Lockout:** Upon successful execution, the script records `{ key: 'SUPER_ADMIN_BOOTSTRAP_LOCKED', value: true }` in the `PlatformSetting` collection.
2. **Permanent Invalidation:** Setting `DISABLE_ADMIN_BOOTSTRAP=true` in `backend/.env` causes the bootstrap script to immediately abort with an exit code 0, completely disabling the CLI bootstrap script in production.
3. **Audit Record:** A permanent entry is written to `AuditLog` recording `ADMIN_BOOTSTRAP_EXECUTED`.

---

## 2. Emergency Administrator Revocation Protocol

If an administrator or moderator account is compromised or offboarded:

### 2.1 Instant Demotion & Session Invalidation
1. Navigate to `/owner-control` -> **Administrator Management** (or call `PATCH /api/owner/administrators/:id/revoke`).
2. Enter your Super Admin password to satisfy `requireReauth`.
3. The backend executes the following atomic sequence:
   - Sets target `user.role = 'USER'`.
   - Clears all stored `user.refreshTokens = []`.
   - Increments `user.passwordChangedAt = new Date()`, immediately invalidating any active JWT access tokens on the next request.
   - Logs `ADMIN_PRIVILEGES_REVOKED` in `AuditLog`.

---

## 3. Disaster Recovery & Owner Account Restoration

If the developer/owner loses access to their credentials or email:

### 3.1 Direct Database Credential Reset (Air-Gapped Access)
Because NEXORA never stores plaintext passwords or recovery backdoors, account recovery must be performed directly on the primary MongoDB instance or via the protected server CLI:

```bash
# Generate a new bcrypt hash using standard Node.js REPL:
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('NewSuperSecurePass2026!', 10).then(console.log)"
```

Update the record in MongoDB:
```javascript
db.users.updateOne(
  { role: "SUPER_ADMIN" },
  { 
    $set: { 
      password: "<new_bcrypt_hash>", 
      refreshTokens: [],
      status: "active",
      "suspension.isSuspended": false,
      passwordChangedAt: new Date()
    } 
  }
);
```

### 3.2 CLI Recovery Mode
If `DISABLE_ADMIN_BOOTSTRAP` is temporarily set to `false`, the owner can invoke:
```bash
node backend/scripts/bootstrapAdmin.js --force
```
This requires direct terminal/SSH access to the production host, ensuring that unauthorized remote attackers cannot execute it.
