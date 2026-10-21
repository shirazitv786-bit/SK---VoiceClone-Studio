const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { prisma } = require('../prismaClient');
const { authenticateToken } = require('../middleware/auth');
const { DEFAULT_PLANS } = require('../utils/defaultPlans');
const { getSubscriptionStatus } = require('../utils/subscriptionManager');

const router = express.Router();
const audioDir = path.join(__dirname, '..', 'audio');
const paymentsUploadDir = path.join(__dirname, '..', 'uploads', 'payments');

if (!fs.existsSync(paymentsUploadDir)) {
  fs.mkdirSync(paymentsUploadDir, { recursive: true });
}

// Multer storage for payment receipts / screenshots
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, paymentsUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
    const unique = `payment_${req.user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}${safeExt}`;
    cb(null, unique);
  }
});

const uploadPayment = multer({
  storage: paymentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB maximum
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Please upload a valid receipt screenshot (.png, .jpg, .jpeg, or .webp).'));
    }
  }
});

// All user routes require authentication
router.use(authenticateToken);

/**
 * GET /api/user/dashboard
 * Summary data, analytics, credit balance, and user generation history
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;

    const [user, generations, statsAgg] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
          credits: true,
          subscriptionEndDate: true,
          creditsExpiresAt: true,
          status: true,
          createdAt: true
        }
      }),
      prisma.generation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.generation.aggregate({
        where: { userId },
        _sum: { charsUsed: true },
        _count: { id: true }
      })
    ]);

// Helper to annotate generation records with temporary storage 24-hour retention window
const mapGenerationRetention = (g) => {
  const createdAtMs = new Date(g.createdAt).getTime();
  const maxAgeMs = 24 * 3600 * 1000;
  const expiresAtMs = g.expiresAt ? new Date(g.expiresAt).getTime() : createdAtMs + maxAgeMs;
  const now = Date.now();
  const isTimeExpired = now >= expiresAtMs;

  let fileExists = false;
  if (g.audioUrl) {
    const filename = path.basename(g.audioUrl);
    fileExists = fs.existsSync(path.join(audioDir, filename));
  }

  const isExpired = Boolean(g.isExpired || isTimeExpired || !fileExists);
  const msRemaining = Math.max(0, expiresAtMs - now);
  const hoursRemaining = Math.floor(msRemaining / (3600 * 1000));
  const minutesRemaining = Math.floor((msRemaining % (3600 * 1000)) / (60 * 1000));

  return {
    ...g,
    expiresAt: new Date(expiresAtMs).toISOString(),
    isExpired,
    fileExists,
    hoursRemaining: isExpired ? 0 : hoursRemaining,
    minutesRemaining: isExpired ? 0 : minutesRemaining,
    downloadUrl: isExpired ? null : `/api/audio/download/${g.id}`
  };
};

    const subStatus = getSubscriptionStatus(user);

    return res.json({
      success: true,
      user: {
        ...user,
        subscriptionStatus: subStatus
      },
      stats: {
        totalGenerations: statsAgg._count.id || 0,
        totalCharsUsed: statsAgg._sum.charsUsed || 0,
        creditsRemaining: user.credits,
        activePlan: user.plan,
        subscriptionEndDate: user.subscriptionEndDate,
        creditsExpiresAt: user.creditsExpiresAt,
        daysRemaining: subStatus?.daysRemaining ?? null,
        hoursRemaining: subStatus?.hoursRemaining ?? null,
        isSubscriptionExpired: subStatus?.isExpired ?? false,
        subscriptionStatusLabel: subStatus?.statusLabel ?? 'Free Tier'
      },
      generations: generations.map(mapGenerationRetention)
    });
  } catch (err) {
    console.error('[User Dashboard API Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve user dashboard data.' });
  }
});

/**
 * GET /api/user/generations
 * Returns user's generation history with 24h retention status
 */
router.get('/generations', async (req, res) => {
  try {
    const userId = req.user.id;
    const generations = await prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return res.json({
      success: true,
      generations: generations.map(mapGenerationRetention)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch generation history.' });
  }
});

/**
 * DELETE /api/user/generations/:id
 * Deletes user's own generation record
 */
router.delete('/generations/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const record = await prisma.generation.findFirst({
      where: { id, userId }
    });

    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found or not owned by you.' });
    }

    // Safely remove physical audio file from disk
    if (record.audioUrl) {
      const filename = path.basename(record.audioUrl);
      const filePath = path.join(audioDir, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {
          console.warn(`[User Audio Delete Warning]: Could not unlink ${filename}:`, e.message);
        }
      }
    }

    await prisma.generation.delete({ where: { id } });

    return res.json({ success: true, message: 'Audio generation record and file deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete record.' });
  }
});

/**
 * POST /api/user/manual-payment
 * Submits JazzCash transaction ID & receipt screenshot for plan activation
 */
router.post('/manual-payment', (req, res, next) => {
  uploadPayment.single('screenshot')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message || 'Screenshot upload failed.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactionId, planType, amount, senderNumber } = req.body;

    const cleanTid = (transactionId || '').trim();
    if (!cleanTid) {
      return res.status(400).json({ success: false, error: 'Transaction ID (TID) is required.' });
    }

    if (cleanTid.length < 4) {
      return res.status(400).json({ success: false, error: 'Please enter a valid Transaction ID (TID).' });
    }

    // Dynamically retrieve configured plans
    let validPlans = ['Silver', 'Lite', 'Pro', 'Studio'];
    let planAmounts = {
      Silver: 'PKR 1,600',
      Lite: 'PKR 2,800',
      Pro: 'PKR 4,750',
      Studio: 'PKR 6,700'
    };
    try {
      const plansSetting = await prisma.systemSetting.findUnique({ where: { key: 'plans_config' } });
      const currentPlans = plansSetting?.value ? JSON.parse(plansSetting.value) : DEFAULT_PLANS;
      if (Array.isArray(currentPlans) && currentPlans.length > 0) {
        validPlans = currentPlans.filter(p => p.id !== 'Free' && p.isEnabled !== false).map(p => p.id);
        currentPlans.forEach(p => {
          planAmounts[p.id] = p.pricePKR || p.displayPrice || `PKR ${Number(p.priceMonthly || 0).toLocaleString()}`;
        });
      }
    } catch (e) {}

    const cleanPlan = (planType || '').trim();
    const matchedPlanKey = validPlans.find(p => p.toLowerCase() === cleanPlan.toLowerCase()) || cleanPlan;

    // Check for duplicate TID
    const existing = await prisma.manualPayment.findUnique({
      where: { transactionId: cleanTid }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Transaction ID "${cleanTid}" has already been submitted (Status: ${existing.status.toUpperCase()}). Please contact support if you need assistance.`
      });
    }

    const screenshotUrl = req.file ? `/uploads/payments/${req.file.filename}` : null;

    const payment = await prisma.manualPayment.create({
      data: {
        userId,
        planType: matchedPlanKey,
        amount: amount || planAmounts[matchedPlanKey] || 'Custom',
        transactionId: cleanTid,
        screenshotUrl,
        senderNumber: (senderNumber || '').trim() || null,
        status: 'pending'
      }
    });

    console.log(`[Manual Payment] New JazzCash submission by ${req.user.email}: TID=${cleanTid}, Plan=${cleanPlan}`);

    return res.status(201).json({
      success: true,
      message: 'Payment details submitted successfully! Our team will verify your JazzCash transfer and activate your plan shortly.',
      payment
    });
  } catch (err) {
    console.error('[Manual Payment User Submit Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to submit payment.' });
  }
});

/**
 * GET /api/user/manual-payments
 * Returns list of manual payment submissions for authenticated user
 */
router.get('/manual-payments', async (req, res) => {
  try {
    const userId = req.user.id;
    const payments = await prisma.manualPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, payments });
  } catch (err) {
    console.error('[Manual Payments User Fetch Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve payments.' });
  }
});

module.exports = router;
