/**
 * NEXORA Secure Administrator Bootstrap Script
 * 
 * Safely initializes the initial SUPER_ADMIN account.
 * - Does not create a public admin registration page.
 * - Does not make the first registered user an admin automatically.
 * - Controlled via environment variables or CLI flags.
 * 
 * Usage:
 *   node scripts/bootstrapAdmin.js
 *   ADMIN_EMAIL=lead@nexora.dev ADMIN_PASSWORD="SecurePassword123!" node scripts/bootstrapAdmin.js
 */

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const PlatformSetting = require('../models/PlatformSetting');
const AuditLog = require('../models/AuditLog');

async function bootstrapAdmin() {
  console.log('========================================================');
  console.log('   NEXORA SECURE ADMINISTRATOR BOOTSTRAP PROCESS');
  console.log('========================================================\n');

  try {
    await connectDB();

    if (process.env.DISABLE_ADMIN_BOOTSTRAP === 'true') {
      console.log('[SECURITY] Administrator bootstrap is permanently disabled on this server instance (DISABLE_ADMIN_BOOTSTRAP=true).');
      process.exit(0);
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@nexora.dev').toLowerCase().trim();
    const adminUsername = (process.env.ADMIN_USERNAME || 'nexora_admin').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'NexoraAdmin2026!Secure';
    const force = process.argv.includes('--force');

    // Check if bootstrap lock is set in database
    const isLocked = await PlatformSetting.findOne({ key: 'SUPER_ADMIN_BOOTSTRAP_LOCKED', value: true });
    if (isLocked && !force) {
      console.log('[SECURITY] Super Admin bootstrap is permanently locked in database.');
      console.log('[SECURITY] Use CLI with --force for emergency recovery mode.\n');
      process.exit(0);
    }

    // Check if any SUPER_ADMIN already exists
    const existingSuperAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
    if (existingSuperAdmin && !force) {
      console.log(`[INFO] A SUPER_ADMIN already exists: @${existingSuperAdmin.username} (${existingSuperAdmin.email})`);
      console.log('[INFO] Bootstrap skipped to prevent accidental overwrites. Pass --force to override.\n');
      process.exit(0);
    }

    // Check if target user exists by email or username
    let user = await User.findOne({ 
      $or: [{ email: adminEmail }, { username: adminUsername }] 
    }).select('+password');

    if (user) {
      console.log(`[INFO] Existing account found for @${user.username} (${user.email}). Promoting to SUPER_ADMIN...`);
      user.role = 'SUPER_ADMIN';
      user.isVerified = true;
      user.status = 'active';
      if (user.suspension) user.suspension.isSuspended = false;
      user.password = adminPassword; // Pre-save hook hashes with bcrypt
      await user.save();
      console.log(`[SUCCESS] Account @${user.username} successfully promoted to SUPER_ADMIN!`);
    } else {
      console.log(`[INFO] Creating initial SUPER_ADMIN account: @${adminUsername} (${adminEmail})...`);
      user = await User.create({
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        name: 'NEXORA Platform Admin',
        role: 'SUPER_ADMIN',
        isVerified: true,
        status: 'active',
        primaryRole: 'Engineering Leader',
        headline: 'Lead Platform Administrator & Security Architect'
      });
      console.log(`[SUCCESS] SUPER_ADMIN account created successfully!`);
    }

    // Permanently set the bootstrap lock in PlatformSetting
    await PlatformSetting.findOneAndUpdate(
      { key: 'SUPER_ADMIN_BOOTSTRAP_LOCKED' },
      { $set: { value: true, description: 'Super Admin bootstrap completed and locked', updatedBy: user._id } },
      { upsert: true }
    );

    await AuditLog.create({
      actor: user._id,
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_BOOTSTRAP_EXECUTED',
      targetResource: 'User',
      targetId: user._id,
      metadata: { username: user.username, email: user.email },
      reason: 'Initial Super Admin provisioned and bootstrap permanently locked'
    }).catch(() => {});

    console.log('[SECURITY] Super Admin bootstrap permanently locked.');
    console.log('\n--------------------------------------------------------');
    console.log(`Username:  ${user.username}`);
    console.log(`Email:     ${user.email}`);
    console.log(`Role:      ${user.role}`);
    console.log(`Status:    ${user.status}`);
    console.log(`Verified:  ${user.isVerified}`);
    console.log('--------------------------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('\n[ERROR] Admin bootstrap failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrapAdmin();
}

module.exports = bootstrapAdmin;
