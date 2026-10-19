const jwt = require('jsonwebtoken');
const { prisma } = require('../prismaClient');

const JWT_SECRET = process.env.JWT_SECRET || 'sk_voiceclone_studio_secret_key_jwt_2026_production_v1';
const TOKEN_EXPIRY = '30d';

/**
 * Generates a signed JSON Web Token for authenticated sessions.
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role || 'user',
      plan: user.plan
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

/**
 * Strict authentication middleware: Requires a valid Bearer token.
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required. Please sign in.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user record from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or has been deactivated.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'This account has been suspended by an administrator. Please contact support.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.'
      });
    }
    return res.status(403).json({
      success: false,
      error: 'Invalid authentication credentials.'
    });
  }
};

/**
 * Optional authentication middleware: Attaches user if valid token exists,
 * but allows unauthenticated guest requests to proceed.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true
      }
    });

    if (user && user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'This account has been suspended by an administrator. Access is blocked.'
      });
    }

    req.user = user || null;
  } catch (e) {
    req.user = null;
  }
  next();
};

/**
 * Requires admin or superadmin privileges.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Administrator privileges required.'
    });
  }
  next();
};

/**
 * Requires strict superadmin privileges.
 */
const requireSuperadmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Superadmin privileges required.'
    });
  }
  next();
};

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireSuperadmin
};
