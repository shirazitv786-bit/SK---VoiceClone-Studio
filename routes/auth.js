const express = require('express');
const bcrypt = require('bcryptjs');
const { prisma } = require('../prismaClient');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { DEFAULT_PLANS } = require('../utils/defaultPlans');
const { calculateSubscriptionExpiry, getSubscriptionStatus, checkAndExpireUser } = require('../utils/subscriptionManager');

const router = express.Router();

// Email format validation helper (RFC 5322 standard regex)
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return typeof email === 'string' && email.length <= 254 && emailRegex.test(email.trim());
};

/**
 * POST /api/auth/register
 * Creates a new user account with 2,000 Free Credits.
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Input Sanitization & Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Full name or creator handle is required.'
      });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        success: false,
        error: 'Password cannot exceed 128 characters.'
      });
    }

    const cleanName = name.trim().slice(0, 80);
    const cleanEmail = email.trim().toLowerCase();

    // 2. Check if Email Already Exists (with retry for transient network drops)
    let existingUser = null;
    let checkErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        existingUser = await prisma.user.findUnique({
          where: { email: cleanEmail }
        });
        checkErr = null;
        break;
      } catch (err) {
        checkErr = err;
        if (attempt === 1) {
          await new Promise(r => setTimeout(r, 600));
        }
      }
    }
    if (checkErr) throw checkErr;

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'This email address is already registered. Please sign in instead.'
      });
    }

    // 3. Securely Hash Password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Create User in PostgreSQL (Free Plan with 2,000 Credits)
    const newUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        role: 'user',
        status: 'active',
        plan: 'Free',
        credits: 2000
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        subscriptionEndDate: true,
        creditsExpiresAt: true,
        createdAt: true
      }
    });

    // 5. Generate Authentication Token
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! 2,000 free starter credits added.',
      user: newUser,
      token
    });
  } catch (err) {
    console.error('[Auth Error - Register]:', err);
    let userMessage = 'An internal error occurred while registering. Please try again.';
    const msg = (err.message || '').toLowerCase();
    const code = err.code || '';

    if (code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'This email address is already registered. Please sign in instead.'
      });
    } else if (code === 'P1001' || code === 'P1002' || code === 'P1008' || code === 'P1017' || code === 'P2024' ||
               msg.includes('reach database') || msg.includes('etimedout') || msg.includes('timeout') ||
               msg.includes('connection terminated') || msg.includes('closed unexpectedly') || msg.includes('connect')) {
      userMessage = 'Database service connection timed out. Please retry in a few seconds.';
    } else if (code === 'P1000' || msg.includes('authentication failed against database')) {
      userMessage = 'Database authentication error. Please verify backend database credentials.';
    } else if (code === 'P2021' || msg.includes('does not exist') || msg.includes('relation')) {
      userMessage = 'Database tables are currently initializing. Please retry in a few moments.';
    } else if (msg.includes('database_url') || msg.includes('nonempty url')) {
      userMessage = 'Database connection is not configured on the server. Please check DATABASE_URL.';
    }

    return res.status(500).json({
      success: false,
      error: userMessage,
      ...(process.env.NODE_ENV !== 'production' ? { details: err.message, code: err.code } : {})
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials and issues a secure session token.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Basic validation
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Both email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Find user in database with automatic retry for transient network drops
    let user = null;
    let dbError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        user = await prisma.user.findUnique({
          where: { email: cleanEmail }
        });
        dbError = null;
        break;
      } catch (err) {
        dbError = err;
        if (attempt === 1) {
          await new Promise(r => setTimeout(r, 600));
        }
      }
    }

    if (dbError) {
      throw dbError;
    }

    // Timing-safe defense against account enumeration
    if (!user) {
      // Execute dummy hash comparison using a valid pre-computed bcrypt hash
      await bcrypt.compare(password, '$2a$10$CwTycUXWue0Thq9StjUM0uJ8tLgUjD/9xWq.nI7M3j9hC8K3m7K4e');
      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.'
      });
    }

    // 3. Check account suspension
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended by an administrator. Please contact support.'
      });
    }

    // 4. Verify password field presence
    if (!user.password || typeof user.password !== 'string') {
      return res.status(401).json({
        success: false,
        error: 'Account authentication error. Please reset your password.'
      });
    }

    // 5. Verify bcrypt password hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.'
      });
    }

    // 6. Check 30-day validity and construct safe user profile
    const activeUser = await checkAndExpireUser(user);
    const resolvedUser = activeUser || user;

    const userProfile = {
      id: resolvedUser.id,
      name: resolvedUser.name,
      email: resolvedUser.email,
      role: resolvedUser.role,
      status: resolvedUser.status,
      plan: resolvedUser.plan,
      credits: resolvedUser.credits,
      subscriptionEndDate: resolvedUser.subscriptionEndDate,
      creditsExpiresAt: resolvedUser.creditsExpiresAt,
      subscriptionStatus: getSubscriptionStatus(resolvedUser),
      createdAt: resolvedUser.createdAt
    };

    // 7. Generate signed JWT token
    const token = generateToken(userProfile);

    return res.status(200).json({
      success: true,
      message: 'Welcome back! Signed in successfully.',
      user: userProfile,
      token
    });
  } catch (err) {
    console.error('[Auth Error - Login]:', err);
    let userMessage = 'An unexpected error occurred during login. Please try again.';
    const msg = (err.message || '').toLowerCase();
    const code = err.code || '';

    if (code === 'P1001' || code === 'P1002' || code === 'P1008' || code === 'P1017' || code === 'P2024' ||
        msg.includes('reach database') || msg.includes('etimedout') || msg.includes('timeout') ||
        msg.includes('connection terminated') || msg.includes('closed unexpectedly') || msg.includes('connect')) {
      userMessage = 'Database service connection timed out. Please retry in a few seconds.';
    } else if (code === 'P1000' || msg.includes('authentication failed against database')) {
      userMessage = 'Database authentication error. Please verify backend database credentials.';
    } else if (code === 'P2021' || msg.includes('does not exist') || msg.includes('relation')) {
      userMessage = 'Database tables are currently initializing. Please retry in a few moments.';
    } else if (msg.includes('database_url') || msg.includes('nonempty url')) {
      userMessage = 'Database connection is not configured on the server. Please check DATABASE_URL.';
    }

    return res.status(500).json({
      success: false,
      error: userMessage,
      ...(process.env.NODE_ENV !== 'production' ? { details: err.message, code: err.code } : {})
    });
  }
});

/**
 * GET /api/auth/me
 * Protected endpoint returning fresh authenticated user data from PostgreSQL.
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        ...req.user,
        subscriptionStatus: getSubscriptionStatus(req.user)
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile.'
    });
  }
});

/**
 * PUT /api/auth/profile
 * Protected endpoint: Update user profile name.
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Valid name is required.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name.trim().slice(0, 80) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        subscriptionEndDate: true,
        creditsExpiresAt: true,
        createdAt: true
      }
    });

    return res.json({ success: true, message: 'Profile updated successfully!', user: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

/**
 * PUT /api/auth/change-password
 * Protected endpoint: Update user password securely.
 */
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long.'
      });
    }

    // Retrieve user password hash
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Incorrect current password.' });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNew }
    });

    return res.json({ success: true, message: 'Password changed successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
});

/**
 * POST /api/auth/update-plan
 * Protected endpoint: Updates the user's active plan and applies authorized package credits.
 */
router.post('/update-plan', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;

    let plansMap = {
      Free: 2000,
      Silver: 250000,
      Lite: 500000,
      Pro: 1000000,
      Studio: 3000000
    };
    try {
      const plansSetting = await prisma.systemSetting.findUnique({ where: { key: 'plans_config' } });
      const currentPlans = plansSetting?.value ? JSON.parse(plansSetting.value) : DEFAULT_PLANS;
      if (Array.isArray(currentPlans)) {
        currentPlans.forEach(p => {
          if (p.id) plansMap[p.id] = p.creditCount || 0;
        });
      }
    } catch (e) {}

    const matchedPlanKey = Object.keys(plansMap).find(k => k.toLowerCase() === (plan || '').toLowerCase());

    if (!plan || !matchedPlanKey) {
      return res.status(400).json({
        success: false,
        error: `Invalid plan selected. Choose from: ${Object.keys(plansMap).join(', ')}.`
      });
    }

    // Server-enforced credit tier allocation
    const addedCredits = plansMap[matchedPlanKey] || 0;
    const isPaid = matchedPlanKey !== 'Free';
    const thirtyDaysExpiry = isPaid ? calculateSubscriptionExpiry(new Date(), 30) : null;

    // Atomically increment credits and update plan & 30-day expiry in database
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        plan: matchedPlanKey,
        credits: { increment: addedCredits },
        subscriptionEndDate: thirtyDaysExpiry,
        creditsExpiresAt: thirtyDaysExpiry
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        subscriptionEndDate: true,
        creditsExpiresAt: true,
        createdAt: true
      }
    });

    // Also sync the raw columns plan_type and characters_left in PostgreSQL
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE users SET plan_type = $1, characters_left = $2, subscription_end_date = $3, credits_expires_at = $4 WHERE id = $5`,
        matchedPlanKey,
        updatedUser.credits,
        thirtyDaysExpiry,
        thirtyDaysExpiry,
        req.user.id
      );
    } catch (rawErr) {}

    return res.status(200).json({
      success: true,
      message: isPaid
        ? `Successfully upgraded to ${matchedPlanKey} plan! +${addedCredits.toLocaleString()} credits added (valid for 30 days).`
        : `Plan changed to ${matchedPlanKey}.`,
      user: {
        ...updatedUser,
        subscriptionStatus: getSubscriptionStatus(updatedUser)
      }
    });
  } catch (err) {
    console.error('[Auth Error - Update Plan]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user plan.'
    });
  }
});

module.exports = router;
