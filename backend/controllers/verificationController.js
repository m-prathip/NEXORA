const crypto = require('crypto');
const User = require('../models/User');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const { sendMail, emails } = require('../utils/email');
const tokenUtil = require('../utils/token');
const { parseUserAgent, getClientIp } = require('../utils/device');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://portfoliopublisher.vercel.app').split(',')[0].replace(/\/$/, '');

// Hash a verification token with SHA-256 (Never store raw tokens in DB)
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

// Generate single-use verification token & send email
async function generateAndSendVerification({ user, email }) {
  const targetEmail = String(email || user?.email || '').toLowerCase().trim();
  if (!targetEmail) throw new Error('Target email is required');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  // Invalidate any previous unused tokens for this user
  await EmailVerificationToken.updateMany(
    { email: targetEmail, usedAt: null },
    { $set: { usedAt: new Date(0) } } // mark as consumed/invalidated
  );

  await EmailVerificationToken.create({
    user: user._id,
    email: targetEmail,
    tokenHash,
    expiresAt,
    lastSentAt: new Date(),
    resendCount: 1
  });

  const verifyUrl = `${FRONTEND_URL}/auth/verify-email?token=${rawToken}&email=${encodeURIComponent(targetEmail)}`;

  const subject = 'Verify your NEXORA builder account';
  const html = `
    <div style="font-family:'Segoe UI',Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
      <h2 style="color:#0f172a;margin-bottom:12px;">Verify your NEXORA account</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">
        Welcome to <strong>NEXORA</strong> – The Network for Builders. Please click the button below to verify your student/builder account and activate your profile.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${verifyUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;display:inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="color:#64748b;font-size:12px;line-height:1.5;">
        This single-use link expires in 24 hours. If the button above does not work, copy and paste this secure link into your browser:<br/>
        <a href="${verifyUrl}" style="color:#2563eb;word-break:break-all;">${verifyUrl}</a>
      </p>
      <hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0;"/>
      <p style="color:#94a3b8;font-size:11px;">If you did not sign up for NEXORA, you can safely ignore this email.</p>
    </div>
  `;

  await sendMail({
    to: targetEmail,
    subject,
    html,
    text: `Verify your NEXORA account: ${verifyUrl}`
  }).catch(err => console.error('Verification email dispatch failed:', err));

  return { success: true };
}

// @desc   Verify email with secure link token
// @route  POST /api/verification/verify or GET /api/verification/verify
const verifyTokenLink = async (req, res) => {
  try {
    const rawToken = req.body.token || req.query.token;
    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const tokenHash = hashToken(rawToken.trim());

    const tokenRecord = await EmailVerificationToken.findOne({
      tokenHash,
      usedAt: null
    }).populate('user');

    if (!tokenRecord) {
      return res.status(400).json({ 
        message: 'Invalid, already used, or expired verification token. Please request a new link.' 
      });
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return res.status(400).json({ 
        message: 'Verification link has expired. Please request a new verification email.' 
      });
    }

    // Mark token as used
    tokenRecord.usedAt = new Date();
    await tokenRecord.save();

    // Activate user
    const user = await User.findById(tokenRecord.user._id).select('+refreshTokens');
    if (!user) {
      return res.status(404).json({ message: 'Associated user account not found' });
    }

    user.isVerified = true;
    if (user.status === 'restricted') user.status = 'active';

    // Issue session so user is logged in
    const { raw, hash } = tokenUtil.createRefreshToken(user._id);
    const { device } = parseUserAgent(req.headers['user-agent']);
    user.refreshTokens.push({
      tokenHash: hash,
      device,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
      expiresAt: tokenUtil.refreshExpiryDate(false)
    });

    if (user.refreshTokens.length > 10) {
      user.refreshTokens = user.refreshTokens.slice(-10);
    }

    await user.save();

    res.cookie(tokenUtil.REFRESH_COOKIE, raw, tokenUtil.refreshCookieOptions(false));
    const accessToken = tokenUtil.signAccessToken(user);

    res.json({
      message: 'Email successfully verified! Welcome to NEXORA.',
      token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: (user.role || 'USER').toUpperCase(),
        isVerified: true
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Resend verification link (Cooldown enforced)
// @route  POST /api/verification/resend
const resendVerification = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with that email' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account is already verified. You can log in.' });
    }

    // Rate-limiting check: enforce 60s cooldown
    const latestToken = await EmailVerificationToken.findOne({ email })
      .sort({ createdAt: -1 });

    if (latestToken && latestToken.lastSentAt) {
      const elapsed = Date.now() - new Date(latestToken.lastSentAt).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({ 
          message: `Please wait ${waitSec} seconds before requesting another verification email.`,
          retryAfter: waitSec 
        });
      }
    }

    await generateAndSendVerification({ user, email });

    res.json({ message: 'A fresh verification link has been sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Check verification status
// @route  GET /api/verification/status
const getVerificationStatus = async (req, res) => {
  try {
    const email = String(req.query.email || req.user?.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email }).select('email isVerified status');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      email: user.email,
      isVerified: user.isVerified,
      status: user.status
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  generateAndSendVerification,
  verifyTokenLink,
  resendVerification,
  getVerificationStatus
};
