const jwt = require('jsonwebtoken');
require('dotenv').config();

const jwtConfig = {
  secret: process.env.JWT_SECRET || 'fallback-secret-key',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  expiresIn: process.env.JWT_EXPIRE || '360d', // Changed to 360 days for mobile app
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '365d', // Extended refresh token as well
  issuer: 'qabalan-ecommerce',
  audience: 'qabalan-users'
};

/**
 * Generate access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience
  });
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Decode token without verification (for expired token info)
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate token pair (access + refresh)
 */
const generateTokenPair = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    userType: user.user_type,
    isVerified: user.is_verified
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id });

  return {
    accessToken,
    refreshToken,
    expiresIn: jwtConfig.expiresIn
  };
};

module.exports = {
  jwtConfig,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  generateTokenPair
};
