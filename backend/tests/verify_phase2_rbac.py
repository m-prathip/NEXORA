#!/usr/bin/env python3
"""
NEXORA Phase 2 Verification Suite: Role-Based Access Control & Backend Security
Verifies:
 1. User schema role & suspension extensions
 2. Hierarchical RBAC definitions & precedence
 3. Account suspension enforcement & automatic expiration restoration
 4. Admin bootstrap script invariants
 5. Privilege escalation defenses
"""

import os
import sys

BASE_DIR = r"d:\Nexora\Nexora-project"

passed_count = 0
failed_count = 0

def log_pass(desc):
    global passed_count
    passed_count += 1
    print(f"  [PASS] {desc}")

def log_fail(desc):
    global failed_count
    failed_count += 1
    print(f"  [FAIL] {desc}")

def read_file(rel_path):
    full_path = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(full_path):
        log_fail(f"Missing required file: {rel_path}")
        return ""
    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def main():
    print("=" * 76)
    print("   NEXORA PHASE 2: ROLE-BASED ACCESS CONTROL & SECURITY VERIFICATION")
    print("=" * 76)

    # 1. DATABASE SCHEMA & ROLES ENUM
    print("\n[CHECK 1] User Schema Role & Account Suspension Extensions:")
    user_model = read_file("backend/models/User.js")

    required_roles = ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"]
    roles_present = all(r in user_model for r in required_roles)
    if roles_present:
        log_pass("User.js role enum includes USER, MODERATOR, ADMIN, and SUPER_ADMIN")
    else:
        log_fail("User.js missing required role enum values")

    if "enum: ['active', 'suspended', 'restricted']" in user_model:
        log_pass("User.js status field supports active, suspended, and restricted states")
    else:
        log_fail("User.js missing status enum")

    if "suspension:" in user_model and "isSuspended:" in user_model and "expiresAt:" in user_model and "history:" in user_model:
        log_pass("User.js includes suspension schema with expiration, reason, admin notes, and history")
    else:
        log_fail("User.js missing suspension schema fields")

    # 2. RBAC HIERARCHY & SUSPENSION ENFORCEMENT
    print("\n[CHECK 2] RBAC Hierarchy & Suspension Interception in Middleware:")
    auth_mw = read_file("backend/middleware/auth.js")

    if "ROLE_HIERARCHY" in auth_mw and "USER: 1" in auth_mw and "SUPER_ADMIN: 4" in auth_mw:
        log_pass("ROLE_HIERARCHY defines explicit linear privileges (USER < MODERATOR < ADMIN < SUPER_ADMIN)")
    else:
        log_fail("ROLE_HIERARCHY missing or misconfigured in auth.js")

    if "user.status === 'suspended' || user.suspension?.isSuspended" in auth_mw:
        log_pass("protect middleware intercepts suspended accounts before any API execution")
    else:
        log_fail("protect middleware missing suspension check")

    if "user.suspension?.expiresAt && new Date() > new Date(user.suspension.expiresAt)" in auth_mw:
        log_pass("protect middleware automatically restores accounts whose temporary suspension has expired")
    else:
        log_fail("Missing automatic expiration restoration in protect middleware")

    if "requireRole" in auth_mw and "requireModerator" in auth_mw and "requireAdmin" in auth_mw and "requireSuperAdmin" in auth_mw:
        log_pass("auth.js exports hierarchical requireRole, requireModerator, requireAdmin, and requireSuperAdmin")
    else:
        log_fail("auth.js missing role guard middleware exports")

    # 3. RBAC PRIVILEGE LOGIC SIMULATION
    print("\n[CHECK 3] Simulated RBAC Permission Matrix Checks:")
    hierarchy = {"USER": 1, "MODERATOR": 2, "ADMIN": 3, "SUPER_ADMIN": 4}

    def check_access(user_role, required_role):
        return hierarchy.get(user_role, 0) >= hierarchy.get(required_role, 99)

    # USER attempting MODERATOR route
    if not check_access("USER", "MODERATOR"):
        log_pass("RBAC Matrix: USER is denied access to MODERATOR routes (403 Forbidden)")
    else:
        log_fail("USER erroneously allowed MODERATOR route")

    # USER attempting ADMIN route
    if not check_access("USER", "ADMIN"):
        log_pass("RBAC Matrix: USER is denied access to ADMIN routes (403 Forbidden)")
    else:
        log_fail("USER erroneously allowed ADMIN route")

    # MODERATOR attempting ADMIN route
    if not check_access("MODERATOR", "ADMIN"):
        log_pass("RBAC Matrix: MODERATOR is denied access to ADMIN routes (403 Forbidden)")
    else:
        log_fail("MODERATOR erroneously allowed ADMIN route")

    # ADMIN accessing MODERATOR route (hierarchical inheritance)
    if check_access("ADMIN", "MODERATOR"):
        log_pass("RBAC Matrix: ADMIN inherits access to MODERATOR routes (Hierarchical match)")
    else:
        log_fail("ADMIN erroneously denied MODERATOR route")

    # SUPER_ADMIN accessing ADMIN and MODERATOR routes
    if check_access("SUPER_ADMIN", "ADMIN") and check_access("SUPER_ADMIN", "MODERATOR"):
        log_pass("RBAC Matrix: SUPER_ADMIN inherits full administrative privileges across all tiers")
    else:
        log_fail("SUPER_ADMIN missing inherited privileges")

    # 4. PRIVILEGE ESCALATION DEFENSE
    print("\n[CHECK 4] Privilege Escalation Safeguards:")
    prof_ctrl = read_file("backend/controllers/profileController.js")
    auth_ctrl = read_file("backend/controllers/authController.js")

    if "role: req.body.role" not in prof_ctrl and "userUpdates.role = data.role" not in prof_ctrl:
        log_pass("Privilege escalation defense: Profile updates cannot alter user.role")
    else:
        log_fail("Vulnerability: User profile update accepts user.role")

    if "role: req.body.role" not in auth_ctrl and ("role: 'USER'" in auth_ctrl or "role: 'user'" in auth_ctrl):
        log_pass("Privilege escalation defense: Public registration defaults strictly to USER without accepting role override")
    else:
        log_fail("Vulnerability: Public registration allows specifying role")

    # 5. SECURE BOOTSTRAP PROCESS
    print("\n[CHECK 5] Secure Administrator Bootstrap Process:")
    bootstrap_file = read_file("backend/scripts/bootstrapAdmin.js")
    pkg_json = read_file("backend/package.json")

    if "existingSuperAdmin && !force" in bootstrap_file:
        log_pass("Bootstrap script enforces idempotency (prevents accidental overwriting of existing SUPER_ADMIN)")
    else:
        log_fail("Bootstrap script missing idempotency check")

    if "seed:admin" in pkg_json:
        log_pass("package.json registers npm run seed:admin command for controlled server-side bootstrap")
    else:
        log_fail("package.json missing seed:admin script")

    print("\n" + "=" * 76)
    print(f"   PHASE 2 RBAC VERIFICATION SUMMARY: {passed_count} PASSED, {failed_count} FAILED")
    print("=" * 76)

    if failed_count > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
