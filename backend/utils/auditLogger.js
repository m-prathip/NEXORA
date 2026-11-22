const AuditLog = require('../models/AuditLog');
const { getClientIp } = require('./device');

/**
 * Record an immutable audit log entry.
 * Safely swallows errors to prevent admin operations from crashing if audit writes fail.
 */
async function recordAuditLog(req, {
  action,
  targetResource,
  targetId = null,
  metadata = {},
  reason = ''
}) {
  try {
    const actor = req.user?.id || req.user?._id;
    const actorRole = (req.user?.role || 'SYSTEM').toUpperCase();
    const ip = req ? getClientIp(req) : 'unknown';
    const userAgent = req?.headers ? req.headers['user-agent'] : 'unknown';

    if (!actor) {
      console.warn('AuditLog omitted: missing actor in request context');
      return null;
    }

    const logEntry = await AuditLog.create({
      actor,
      actorRole,
      action,
      targetResource,
      targetId,
      metadata,
      reason,
      ip,
      userAgent
    });

    return logEntry;
  } catch (err) {
    console.error('Failed to write immutable audit log:', err.message);
    return null;
  }
}

module.exports = { recordAuditLog };
