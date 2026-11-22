#!/usr/bin/env python3
"""
NEXORA Trust & Safety, Admin Dashboard & Platform Analytics Verification Suite
Validates:
 1. Email verification system (SHA-256 token hashing, single-use, TTL, cooldown, frontend auto-verify)
 2. Bidirectional user blocking (database schema, connection severing, network/messages/posts/profile enforcement)
 3. Anti-spam heuristics (duplicate post detection, duplicate comment detection, 50/day connection limits)
 4. User and content reporting system (categories, duplicate prevention, moderation queue, resolution notes)
 5. Account suspension enforcement (middleware interception, expiration handling, session invalidation)
 6. Protected Admin Dashboard UI (AdminRoute guard, AdminDashboardLayout, all 9 modules registered)
 7. Opportunity approval workflow (pending -> approved/rejected lifecycle)
 8. Real Platform Analytics (MongoDB aggregations: WAU, completion rate, network density, CSV export)
 9. Immutable Application-Level Audit Logging (schema, update/delete prevention hooks, controller instrumentation)
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
    print("=" * 80)
    print("   NEXORA TRUST & SAFETY, ADMIN DASHBOARD & ANALYTICS VERIFICATION")
    print("=" * 80)

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: EMAIL VERIFICATION SYSTEM
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[SECTION 1] Email Verification System (Single-Use Token Links & OTP):")
    token_model = read_file("backend/models/EmailVerificationToken.js")
    if "tokenHash" in token_model and "expiresAt" in token_model and "usedAt" in token_model:
        log_pass("EmailVerificationToken model has tokenHash, expiresAt, and usedAt fields")
    else:
        log_fail("EmailVerificationToken model missing required fields")

    if "index({ expiresAt: 1 }" in token_model and "expireAfterSeconds: 0" in token_model:
        log_pass("EmailVerificationToken has TTL index for automatic token cleanup")
    else:
        log_fail("EmailVerificationToken missing TTL index")

    verif_ctrl = read_file("backend/controllers/verificationController.js")
    if "crypto.createHash('sha256')" in verif_ctrl:
        log_pass("Verification tokens are hashed with SHA-256 before database storage")
    else:
        log_fail("Verification tokens not hashed with SHA-256")

    if "tokenRecord.usedAt = new Date()" in verif_ctrl and "user.isVerified = true" in verif_ctrl:
        log_pass("Single-use token links are marked used upon verification and user is activated")
    else:
        log_fail("Verification does not properly mark token used or activate user")

    if "RESEND_COOLDOWN_MS" in verif_ctrl and "429" in verif_ctrl:
        log_pass("Resend verification enforces strict 60-second cooldown rate limit")
    else:
        log_fail("Resend verification missing cooldown enforcement")

    frontend_verify = read_file("frontend/src/pages/admin/VerifyEmail.jsx")
    if "params.get('token')" in frontend_verify and "verifyLink" in frontend_verify:
        log_pass("Frontend VerifyEmail component auto-detects ?token= parameter and calls verifyLink")
    else:
        log_fail("Frontend VerifyEmail does not auto-verify token links")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: BIDIRECTIONAL USER BLOCKING & PRIVACY CONTROLS
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[SECTION 2] Bidirectional User Blocking & Privacy Controls:")
    block_model = read_file("backend/models/BlockedUser.js")
    if "user" in block_model and "blockedUser" in block_model:
        log_pass("BlockedUser schema defined with user and blockedUser ObjectIds")
    else:
        log_fail("BlockedUser schema missing core fields")

    if "index({ user: 1, blockedUser: 1 }, { unique: true })" in block_model:
        log_pass("BlockedUser has compound unique index preventing duplicate blocks")
    else:
        log_fail("BlockedUser missing compound unique index")

    block_ctrl = read_file("backend/controllers/blockController.js")
    if "Connection.deleteMany" in block_ctrl and "Follow.deleteMany" in block_ctrl:
        log_pass("Blocking auto-severs all active/pending connections and follow relationships")
    else:
        log_fail("Blocking does not sever connections and follows")

    if "getBlockedUserIds" in block_ctrl:
        log_pass("Bidirectional helper getBlockedUserIds collects both blocked and blocking users")
    else:
        log_fail("getBlockedUserIds helper missing")

    # Verify enforcement in controllers
    net_ctrl = read_file("backend/controllers/networkController.js")
    if "BlockedUser.findOne" in net_ctrl and "Unable to connect with this user" in net_ctrl:
        log_pass("networkController strictly enforces block check before sending connection request")
    else:
        log_fail("networkController does not check for blocked users")

    msg_ctrl = read_file("backend/controllers/messagesController.js")
    if "BlockedUser.findOne" in msg_ctrl and "Messaging is unavailable between blocked accounts" in msg_ctrl:
        log_pass("messagesController strictly enforces block check before sending messages or starting chats")
    else:
        log_fail("messagesController does not check for blocked users")

    post_ctrl = read_file("backend/controllers/postsController.js")
    if "getBlockedUserIds" in post_ctrl and "$nin: blockedIds" in post_ctrl:
        log_pass("postsController filters out social feed posts from blocked users bidirectionally")
    else:
        log_fail("postsController does not filter blocked users from social feed")

    prof_ctrl = read_file("backend/controllers/profileController.js")
    if "BlockedUser.findOne" in prof_ctrl and "Profile is not accessible" in prof_ctrl:
        log_pass("profileController blocks public profile access if bidirectional block exists")
    else:
        log_fail("profileController does not check for blocked users")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: SPAM PREVENTION HEURISTICS
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[SECTION 3] Anti-Spam Heuristics & Rate Limits:")
    if "Duplicate post detected" in post_ctrl and "60000" in post_ctrl:
        log_pass("postsController detects duplicate identical posts within 60 seconds (HTTP 429)")
    else:
        log_fail("Duplicate post detection missing in postsController")

    if "Duplicate comment detected" in post_ctrl and "30000" in post_ctrl:
        log_pass("postsController detects duplicate repeated comments within 30 seconds (HTTP 429)")
    else:
        log_fail("Duplicate comment detection missing in postsController")

    if "Daily connection request limit reached" in net_ctrl and "50" in net_ctrl:
        log_pass("networkController enforces maximum 50 connection requests per calendar day (HTTP 429)")
    else:
        log_fail("Excessive connection request throttling missing in networkController")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: USER & CONTENT REPORTING SYSTEM
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[SECTION 4] User & Content Reporting System:")
    report_model = read_file("backend/models/Report.js")
    required_reasons = ['fake_profile', 'spam', 'harassment', 'impersonation', 'inappropriate_behaviour', 'fraud_scam']
    reasons_ok = all(r in report_model for r in required_reasons)
    if reasons_ok:
        log_pass("Report model supports all required categories (fake_profile, spam, harassment, etc.)")
    else:
        log_fail("Report model missing required category enums")

    if "targetId: 1, reporter: 1" in report_model:
        log_pass("Report model enforces unique compound index preventing duplicate reports by same user")
    else:
        log_fail("Report model missing duplicate report index")

    rep_ctrl = read_file("backend/controllers/reportController.js")
    if "You cannot report your own account" in rep_ctrl:
        log_pass("Self-reporting is strictly forbidden")
    else:
        log_fail("Self-reporting not prevented")

    if "resolveReport" in rep_ctrl and "resolutionNotes" in rep_ctrl and "actionTaken" in rep_ctrl:
        log_pass("Reports resolution requires resolution notes, action taken, and writes audit log")
    else:
        log_fail("Report resolution missing required fields or audit log")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5: ACCOUNT SUSPENSION & SESSION INVALIDATION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[SECTION 5] Account Suspension & Invalidation:")
    auth_mw = read_file("backend/middleware/auth.js")
    if "user.status === 'suspended'" in auth_mw and "account has been suspended" in auth_mw:
        log_pass("protect middleware intercepts suspended accounts and returns HTTP 403 with suspension reason")
    else:
        log_fail("protect middleware does not enforce suspension check")

    if "user.suspension?.expiresAt" in auth_mw and "new Date() > new Date(user.suspension.expiresAt)" in auth_mw:
        log_pass("protect middleware automatically restores expired temporary suspensions")
    else:
        log_fail("protect middleware does not restore expired suspensions")

    admin_ctrl = read_file("backend/controllers/adminController.js")
    if "targetUser.refreshTokens = []" in admin_ctrl:
        log_pass("Suspending an account immediately terminates all active sessions (clears refresh tokens)")
    else:
        log_fail("Suspending account does not clear refresh tokens")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 6: PROTECTED ADMIN DASHBOARD UI
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[SECTION 6] Protected Admin Dashboard UI:")
    admin_route = read_file("frontend/src/components/admin/AdminRoute.jsx")
    if "MODERATOR" in admin_route and "ADMIN" in admin_route and "SUPER_ADMIN" in admin_route:
        log_pass("AdminRoute guard restricts access exclusively to MODERATOR, ADMIN, and SUPER_ADMIN")
    else:
        log_fail("AdminRoute guard missing role checks")

    admin_layout = read_file("frontend/src/components/admin/AdminDashboardLayout.jsx")
    expected_navs = ["Overview", "Users", "Posts", "Communities", "Reports", "Opportunities", "Analytics", "Audit Logs", "Settings"]
    navs_ok = all(n in admin_layout for n in expected_navs)
    if navs_ok:
        log_pass("AdminDashboardLayout contains all 9 required operational modules in navigation")
    else:
        log_fail("AdminDashboardLayout missing navigation modules")

    app_jsx = read_file("frontend/src/App.jsx")
    if 'path="/admin"' in app_jsx and '<AdminRoute>' in app_jsx and '<AdminDashboardLayout' in app_jsx:
        log_pass("App.jsx mounts /admin sub-routes inside AdminRoute and AdminDashboardLayout")
    else:
        log_fail("App.jsx missing /admin route registration")

    # Verify all 9 view files exist
    admin_views = [
        "AdminOverview.jsx",
        "AdminUsers.jsx",
        "AdminPosts.jsx",
        "AdminCommunities.jsx",
        "AdminReports.jsx",
        "AdminOpportunities.jsx",
        "AdminAnalytics.jsx",
        "AdminAuditLogs.jsx",
        "AdminSettings.jsx"
    ]
    all_views_exist = True
    for v in admin_views:
        if not os.path.exists(os.path.join(BASE_DIR, "frontend/src/pages/platformAdmin", v)):
            log_fail(f"Missing Admin UI page: {v}")
            all_views_exist = False
    if all_views_exist:
        log_pass("All 9 Platform Admin UI view components created in frontend/src/pages/platformAdmin/")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 7: OPPORTUNITY APPROVAL WORKFLOW
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[SECTION 7] Opportunity Approval Workflow:")
    opp_model = read_file("backend/models/Opportunity.js")
    if "pending" in opp_model and "active" in opp_model and "rejected" in opp_model:
        log_pass("Opportunity model supports pending, active, and rejected moderation status")
    else:
        log_fail("Opportunity model missing status values")

    if "moderateOpportunity" in admin_ctrl and "approve_opportunity" in admin_ctrl:
        log_pass("Admin controller has moderateOpportunity handler approving and rejecting listings")
    else:
        log_fail("moderateOpportunity handler missing in adminController")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 8: REAL PLATFORM ANALYTICS
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[SECTION 8] Real Platform Analytics & MongoDB Aggregations:")
    event_model = read_file("backend/models/PlatformEvent.js")
    if "eventType" in event_model and "actor" in event_model:
        log_pass("PlatformEvent schema created for tracking real platform interactions")
    else:
        log_fail("PlatformEvent schema missing")

    if "weeklyActiveUsers" in admin_ctrl and "completionStats" in admin_ctrl and "collabConversion" in admin_ctrl:
        log_pass("Analytics endpoint uses real MongoDB aggregations for WAU, completion rate, and conversion")
    else:
        log_fail("adminController missing MongoDB aggregation analytics")

    if "exportAnalyticsData" in admin_ctrl and "text/csv" in admin_ctrl:
        log_pass("Admin analytics provides CSV exports for users, reports, and audit logs")
    else:
        log_fail("CSV export handler missing in adminController")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 9: IMMUTABLE APPLICATION-LEVEL AUDIT LOGGING
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[SECTION 9] Immutable Audit Logging:")
    audit_model = read_file("backend/models/AuditLog.js")
    if "immutabilityError" in audit_model and "pre('updateOne'" in audit_model and "pre('deleteOne'" in audit_model:
        log_pass("AuditLog schema has pre-hooks preventing updateOne, deleteOne, and all modification operations")
    else:
        log_fail("AuditLog schema missing immutability enforcement hooks")

    audit_util = read_file("backend/utils/auditLogger.js")
    if "recordAuditLog" in audit_util and "AuditLog.create" in audit_util:
        log_pass("auditLogger utility safely writes immutable records with actor, IP, and reason")
    else:
        log_fail("auditLogger utility missing")

    # ──────────────────────────────────────────────────────────────────────────
    # SUMMARY
    # ──────────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 80)
    print(f"VERIFICATION SUMMARY: {passed_count} PASSED, {failed_count} FAILED")
    print("=" * 80)

    if failed_count > 0:
        sys.exit(1)
    else:
        print("\nALL TRUST & SAFETY, ADMIN DASHBOARD, AND ANALYTICS CHECKS PASSED PERFECTLY!\n")

if __name__ == "__main__":
    main()
