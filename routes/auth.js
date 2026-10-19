const express = require('express');
const bcrypt = require('bcryptjs');
const { prisma } = require('../prismaClient');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { DEFAULT_PLANS } = require('../utils/defaultPlans');

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

    // 2. Check if Email Already Exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

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
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while registering. Please try again.'
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

    // 2. Find user in database
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    // Timing-safe defense against account enumeration
    if (!user) {
      // Execute dummy hash comparison to prevent timing attacks
      await bcrypt.compare(password, '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr');
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

    // 4. Verify bcrypt password hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.'
      });
    }

    // 5. Safe user profile (exclude password hash)
    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      plan: user.plan,
      credits: user.credits,
      createdAt: user.createdAt
    };

    // 6. Generate signed JWT token
    const token = generateToken(userProfile);

    return res.status(200).json({
      success: true,
      message: 'Welcome back! Signed in successfully.',
      user: userProfile,
      token
    });
  } catch (err) {
    console.error('[Auth Error - Login]:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login. Please try again.'
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
      user: req.user
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

    // Atomically increment credits and update plan in database
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        plan: matchedPlanKey,
        credits: { increment: addedCredits }
      },
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

    return res.status(200).json({
      success: true,
      message: `Successfully upgraded to ${plan} plan! +${addedCredits.toLocaleString()} credits added.`,
      user: updatedUser
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
