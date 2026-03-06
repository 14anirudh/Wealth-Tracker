import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createHttpError } from './httpError.js';
import { sendMail } from '../utils/mailer.js';

const createToken = (userId) => {
  const payload = { userId };
  const secret = process.env.JWT_SECRET || 'devsecret';
  const expiresIn = '7d';
  return jwt.sign(payload, secret, { expiresIn });
};

const getEmailFromAuthHeader = (authorizationHeader) => {
  const authHeader = authorizationHeader || '';
  const hasBearerPrefix = authHeader.startsWith('Bearer ');
  const token = hasBearerPrefix ? authHeader.slice(7) : null;

  if (!token) {
    throw createHttpError(401, 'Authorization token missing');
  }

  try {
    const secret = process.env.JWT_SECRET || 'devsecret';
    const decoded = jwt.verify(token, secret);
    return decoded.userId;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw createHttpError(401, 'Invalid or expired token');
  }
};

const buildAuthPayload = (user) => ({
  token: createToken(user.email),
  user: {
    id: user._id,
    email: user.email,
  },
});

export const registerUser = async ({ email, password }) => {
  if (!email || !password) {
    throw createHttpError(400, 'Email and password are required');
  }

  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw createHttpError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
  });

  return buildAuthPayload(user);
};

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw createHttpError(400, 'Email and password are required');
  }

  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw createHttpError(401, 'Invalid email or password');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw createHttpError(401, 'Invalid email or password');
  }

  return buildAuthPayload(user);
};

export const getMe = async (authorizationHeader) => {
  const email = getEmailFromAuthHeader(authorizationHeader);
  const user = await User.findOne({ email }).select('_id email');

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  return {
    user: {
      id: user._id,
      email: user.email,
    },
  };
};

export const changePassword = async (
  { currentPassword, newPassword },
  authorizationHeader
) => {
  if (!currentPassword || !newPassword) {
    throw createHttpError(400, 'Current and new password are required');
  }

  if (currentPassword === newPassword) {
    throw createHttpError(400, 'New password must be different');
  }

  const email = getEmailFromAuthHeader(authorizationHeader);
  const user = await User.findOne({ email });

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatch) {
    throw createHttpError(401, 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = passwordHash;
  await user.save();

  return { success: true };
};

const hashResetToken = (token) =>
  crypto.createHash('sha256').update(`${token || ''}`).digest('hex');

const buildPasswordResetLink = (rawToken) => {
  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${frontendBase}/login?mode=reset&token=${encodeURIComponent(rawToken)}`;
};

export const requestPasswordReset = async ({ email }) => {
  if (!email) {
    throw createHttpError(400, 'Email is required');
  }

  const normalizedEmail = `${email}`.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // Always return success-shaped response to avoid user enumeration.
  if (!user) {
    return { success: true, message: 'If an account exists, reset instructions have been sent.' };
  }

  const rawToken = crypto.randomBytes(24).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpiresAt = expiresAt;
  await user.save();

  const resetLink = buildPasswordResetLink(rawToken);
  const expiryMinutes = 15;
  const subject = 'Reset your Vision Wealth Tracker password';
  const text = [
    'You requested a password reset.',
    `Use this link to reset your password: ${resetLink}`,
    `This link expires in ${expiryMinutes} minutes.`,
    'If you did not request this, you can ignore this email.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h2 style="margin:0 0 12px;">Password reset requested</h2>
      <p style="margin:0 0 12px;">You requested a password reset for your Vision Wealth Tracker account.</p>
      <p style="margin:0 0 16px;">
        <a href="${resetLink}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p style="margin:0 0 8px;">This link expires in ${expiryMinutes} minutes.</p>
      <p style="margin:0;">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  try {
    await sendMail({
      to: normalizedEmail,
      subject,
      text,
      html,
    });
  } catch (error) {
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    await user.save();
    throw createHttpError(500, 'Unable to send reset email. Please try again.');
  }

  return {
    success: true,
    message: 'If an account exists, reset instructions have been sent.',
  };
};

export const resetPassword = async ({ token, newPassword }) => {
  if (!token || !newPassword) {
    throw createHttpError(400, 'Token and newPassword are required');
  }

  const tokenHash = hashResetToken(token);
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw createHttpError(400, 'Invalid or expired reset token');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpiresAt = null;
  await user.save();

  return { success: true, message: 'Password reset successful' };
};
