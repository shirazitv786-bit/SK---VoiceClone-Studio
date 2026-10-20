const express = require('express');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../prismaClient');
const { authenticateToken, requireAdmin, requireSuperadmin } = require('../middleware/auth');
const { cleanupOldAudioFiles } = require('../utils/storageCleanup');
const { DEFAULT_PLANS } = require('../utils/defaultPlans');
const { calculateSubscriptionExpiry, getSubscriptionStatus } = require('../utils/subscriptionManager');

const router = express.Router();

// Audio directory reference for file deletions
const audioDir = path.join(__dirname, '..', 'audio');

// All routes in this router require authentication and admin/superadmin privileges
router.use(authenticateToken, requireAdmin);

/**
 * GET /api/admin/overview
 * Real-time statistics, platform metrics, and system status
 */
router.get('/overview', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalGenerations,
      totalVoices,
      charsAgg,
      creditsAgg,
      recentUsers,
      recentGenerations
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { status: 'suspended' } }),
      prisma.generation.count(),
      prisma.voice.count(),
      prisma.generation.aggregate({ _sum: { charsUsed: true } }),
      prisma.user.aggregate({ _sum: { credits: true } }),
      prisma.user.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
          credits: true,
          status: true,
          createdAt: true
        }
      }),
      prisma.generation.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      })
    ]);

    // Check disk storage metrics for audio files
    let audioFilesCount = 0;
    let audioTotalSizeBytes = 0;
    if (fs.existsSync(audioDir)) {
      try {
        const files = fs.readdirSync(audioDir);
        audioFilesCount = files.length;
        files.forEach(f => {
          try {
            const stat = fs.statSync(path.join(audioDir, f));
            audioTotalSizeBytes += stat.size;
          } catch (e) {}
        });
      } catch (e) {}
    }

    return res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalGenerations,
        totalVoices,
        totalCharsSynthesized: charsAgg._sum.charsUsed || 0,
        totalCreditsInCirculation: creditsAgg._sum.credits || 0,
        audioFilesCount,
        audioStorageMb: (audioTotalSizeBytes / (1024 * 1024)).toFixed(2)
      },
      recentUsers,
      recentGenerations
    });
  } catch (err) {
    console.error('[Admin API Overview Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to load system metrics.' });
  }
});

/**
 * GET /api/admin/users
 * Returns list of users with search, role, status, and plan filters
 */
router.get('/users', async (req, res) => {
  try {
    const { search, plan, role, status } = req.query;

    const where = {};
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }
    if (plan && plan !== 'all') {
      where.plan = plan;
    }
    if (role && role !== 'all') {
      where.role = role;
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { generations: true }
        }
      }
    });

    const enrichedUsers = users.map(u => ({
      ...u,
      subscriptionStatus: getSubscriptionStatus(u)
    }));

    return res.json({
      success: true,
      users: enrichedUsers,
      count: users.length
    });
  } catch (err) {
    console.error('[Admin API Users Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch users list.' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Updates a user's plan, credits, role, status, or subscription expiry
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, credits, role, status, name, subscriptionEndDate, creditsExpiresAt, extendDays } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User record not found.' });
    }

    // Role protection: Only superadmin can modify superadmin accounts or promote someone to superadmin
    if (targetUser.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only a Superadmin can modify a Superadmin account.'
      });
    }

    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only a Superadmin can assign the Superadmin role.'
      });
    }

    const updateData = {};
    if (name && typeof name === 'string') updateData.name = name.trim().slice(0, 80);
    if (plan && ['Free', 'Lite', 'Pro', 'Studio'].includes(plan)) updateData.plan = plan;
    if (credits !== undefined && !isNaN(parseInt(credits, 10))) updateData.credits = Math.max(0, parseInt(credits, 10));
    if (role && ['user', 'admin', 'superadmin'].includes(role)) updateData.role = role;
    if (status && ['active', 'suspended'].includes(status)) updateData.status = status;

    // Subscription & Credit Expiry handling
    if (extendDays && !isNaN(parseInt(extendDays, 10))) {
      const days = parseInt(extendDays, 10);
      const currentExpiry = targetUser.creditsExpiresAt ? new Date(targetUser.creditsExpiresAt) : null;
      const baseDate = currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
      const extended = calculateSubscriptionExpiry(baseDate, days);
      updateData.subscriptionEndDate = extended;
      updateData.creditsExpiresAt = extended;
    } else if (subscriptionEndDate !== undefined || creditsExpiresAt !== undefined) {
      const targetDate = creditsExpiresAt || subscriptionEndDate;
      updateData.subscriptionEndDate = targetDate ? new Date(targetDate) : null;
      updateData.creditsExpiresAt = targetDate ? new Date(targetDate) : null;
    } else if (plan === 'Free') {
      updateData.subscriptionEndDate = null;
      updateData.creditsExpiresAt = null;
    } else if (plan && ['Lite', 'Pro', 'Studio'].includes(plan) && targetUser.plan === 'Free') {
      // Upgrading to paid tier defaults to 30 days validity
      const thirtyDayExpiry = calculateSubscriptionExpiry(new Date(), 30);
      updateData.subscriptionEndDate = thirtyDayExpiry;
      updateData.creditsExpiresAt = thirtyDayExpiry;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
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
        updatedAt: true
      }
    });

    // Sync raw PostgreSQL columns
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE users SET plan_type = $1, characters_left = $2, subscription_end_date = $3, credits_expires_at = $4 WHERE id = $5`,
        updated.plan,
        updated.credits,
        updated.subscriptionEndDate,
        updated.creditsExpiresAt,
        updated.id
      );
    } catch (e) {
      // Non-blocking sync
    }

    return res.json({
      success: true,
      message: `User ${updated.email} updated successfully!`,
      user: {
        ...updated,
        subscriptionStatus: getSubscriptionStatus(updated)
      }
    });
  } catch (err) {
    console.error('[Admin API Update User Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to update user profile.' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Deletes a user account and associated generation logs (Restricted to Superadmin)
 */
router.delete('/users/:id', requireSuperadmin, async (req, res) => {
  try {
    const { id } = req.params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { generations: true }
    });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Protection: Cannot delete yourself or any superadmin account
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own active account.' });
    }

    if (targetUser.role === 'superadmin') {
      return res.status(403).json({ success: false, error: 'Superadmin accounts cannot be deleted.' });
    }

    // Clean up physical audio files generated by this user
    if (targetUser.generations && targetUser.generations.length > 0) {
      targetUser.generations.forEach(gen => {
        if (gen.audioUrl) {
          const filename = path.basename(gen.audioUrl);
          const filePath = path.join(audioDir, filename);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) {}
          }
        }
      });
    }

    await prisma.user.delete({ where: { id } });

    return res.json({
      success: true,
      message: `User ${targetUser.email} and associated data have been permanently deleted.`
    });
  } catch (err) {
    console.error('[Admin API Delete User Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete user.' });
  }
});

/**
 * GET /api/admin/generations
 * Lists system generations with user information
 */
router.get('/generations', async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;

    const where = {};
    if (search && search.trim()) {
      where.OR = [
        { text: { contains: search.trim(), mode: 'insensitive' } },
        { referenceVoice: { contains: search.trim(), mode: 'insensitive' } },
        { user: { email: { contains: search.trim(), mode: 'insensitive' } } }
      ];
    }

    const generations = await prisma.generation.findMany({
      where,
      take: Math.min(100, parseInt(limit, 10) || 50),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, plan: true }
        }
      }
    });

    return res.json({
      success: true,
      generations,
      count: generations.length
    });
  } catch (err) {
    console.error('[Admin API Generations Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch generations.' });
  }
});

/**
 * DELETE /api/admin/generations/:id
 * Deletes a generation record and cleans up the associated audio file on disk
 */
router.delete('/generations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const record = await prisma.generation.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ success: false, error: 'Generation record not found.' });
    }

    // Safely remove audio file from disk
    if (record.audioUrl) {
      const filename = path.basename(record.audioUrl);
      const filePath = path.join(audioDir, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    await prisma.generation.delete({ where: { id } });

    return res.json({
      success: true,
      message: 'Generation record and associated audio file deleted successfully.'
    });
  } catch (err) {
    console.error('[Admin API Delete Generation Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete generation record.' });
  }
});

/**
 * GET /api/admin/settings
 * Retrieves all platform system settings
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return res.json({
      success: true,
      settings: settingsMap
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch system settings.' });
  }
});

/**
 * POST /api/admin/settings
 * Updates or creates system settings
 */
router.post('/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings payload.' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }

    return res.json({
      success: true,
      message: 'System settings saved successfully!'
    });
  } catch (err) {
    console.error('[Admin API Settings Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to save system settings.' });
  }
});

/**
 * GET /api/admin/plans
 * Retrieves dynamic plans configuration from database or defaults
 */
router.get('/plans', async (req, res) => {
  try {
    const plansSetting = await prisma.systemSetting.findUnique({
      where: { key: 'plans_config' }
    });
    if (plansSetting && plansSetting.value) {
      try {
        const parsed = JSON.parse(plansSetting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json({ success: true, plans: parsed });
        }
      } catch (e) {}
    }
    return res.json({ success: true, plans: DEFAULT_PLANS });
  } catch (err) {
    console.error('[Admin API Get Plans Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch subscription plans.' });
  }
});

/**
 * POST /api/admin/plans
 * Saves and updates the dynamic plans configuration
 */
router.post('/plans', async (req, res) => {
  try {
    const { plans } = req.body;
    if (!Array.isArray(plans) || plans.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid plans payload. Expected an array of plan objects.' });
    }

    // Format & sanitize plan entries
    const sanitizedPlans = plans.map((p, idx) => ({
      id: String(p.id || `Plan_${idx + 1}`).trim(),
      name: String(p.name || p.id || 'Unnamed Plan').trim(),
      priceMonthly: Number(p.priceMonthly) >= 0 ? Number(p.priceMonthly) : 0,
      priceAnnual: Number(p.priceAnnual) >= 0 ? Number(p.priceAnnual) : 0,
      pricePKR: String(p.pricePKR || (Number(p.priceMonthly) === 0 ? 'PKR 0' : `PKR ${Number(p.priceMonthly).toLocaleString()}`)).trim(),
      displayPrice: Number(p.priceMonthly) === 0 ? 'FREE' : String(p.displayPrice || `PKR ${Number(p.priceMonthly).toLocaleString()}`).replace(/\$/g, 'PKR ').trim(),
      credits: String(p.credits || `${(Number(p.creditCount) || 0).toLocaleString()} credits`),
      creditCount: parseInt(p.creditCount, 10) >= 0 ? parseInt(p.creditCount, 10) : 0,
      badge: p.badge ? String(p.badge).trim() : null,
      desc: String(p.desc || '').trim(),
      features: Array.isArray(p.features) ? p.features.map(f => String(f).trim()).filter(Boolean) : [],
      buttonText: String(p.buttonText || 'Select Plan').trim(),
      highlight: Boolean(p.highlight),
      maxCharsPerGen: parseInt(p.maxCharsPerGen, 10) || 5000,
      customVoicesCount: parseInt(p.customVoicesCount, 10) || 0,
      maxQueuedTasks: parseInt(p.maxQueuedTasks, 10) || 1,
      isEnabled: p.isEnabled !== false
    }));

    await prisma.systemSetting.upsert({
      where: { key: 'plans_config' },
      update: { value: JSON.stringify(sanitizedPlans) },
      create: { key: 'plans_config', value: JSON.stringify(sanitizedPlans) }
    });

    return res.json({
      success: true,
      message: 'All subscription & pricing plans updated successfully!',
      plans: sanitizedPlans
    });
  } catch (err) {
    console.error('[Admin API Save Plans Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to save subscription plans.' });
  }
});

/**
 * POST /api/admin/cleanup-storage
 * Administrative trigger to clean old audio generation files
 */
router.post('/cleanup-storage', async (req, res) => {
  try {
    const { all, olderThanHours = 24 } = req.body;
    const result = await cleanupOldAudioFiles({
      olderThanHours: parseFloat(olderThanHours) || 24,
      audioDir,
      deleteAll: all === true || all === 'true'
    });

    return res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} storage audio file(s) (Freed ${result.freedMb} MB).`,
      deletedCount: result.deletedCount,
      freedMb: result.freedMb,
      remainingCount: result.remainingCount
    });
  } catch (err) {
    console.error('Storage cleanup failed:', err);
    return res.status(500).json({ success: false, error: 'Storage cleanup failed.' });
  }
});

/**
 * GET /api/admin/manual-payments
 * Lists all JazzCash manual payments with user details and status filter
 */
router.get('/manual-payments', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const payments = await prisma.manualPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            plan: true,
            credits: true,
            status: true
          }
        }
      }
    });

    const pendingCount = await prisma.manualPayment.count({
      where: { status: 'pending' }
    });

    return res.json({
      success: true,
      payments,
      pendingCount,
      totalCount: payments.length
    });
  } catch (err) {
    console.error('[Admin Manual Payments Fetch Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve manual payments.' });
  }
});

/**
 * POST /api/admin/manual-payments/:id/approve & PUT /api/admin/manual-payments/:id/approve
 * Approves a manual payment, sets status to 'approved', and automatically upgrades user's plan and credits
 */
router.all('/manual-payments/:id/approve', async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { id } = req.params;
    const { adminNotes } = req.body || {};

    const payment = await prisma.manualPayment.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found.' });
    }

    if (payment.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: `This payment was already approved on ${new Date(payment.updatedAt).toLocaleString()}.`
      });
    }

    // Determine character balance allotment per plan tier dynamically from plans_config
    let creditsToAdd = 500000;
    try {
      const plansSetting = await prisma.systemSetting.findUnique({ where: { key: 'plans_config' } });
      const currentPlans = plansSetting?.value ? JSON.parse(plansSetting.value) : DEFAULT_PLANS;
      const matchedPlan = (Array.isArray(currentPlans) ? currentPlans : DEFAULT_PLANS).find(
        p => p.id?.toLowerCase() === payment.planType?.toLowerCase()
      );
      if (matchedPlan && typeof matchedPlan.creditCount === 'number' && matchedPlan.creditCount > 0) {
        creditsToAdd = matchedPlan.creditCount;
      } else {
        const fallbackMap = { Lite: 500000, Pro: 1000000, Studio: 3000000 };
        creditsToAdd = fallbackMap[payment.planType] || 500000;
      }
    } catch (e) {
      const fallbackMap = { Lite: 500000, Pro: 1000000, Studio: 3000000 };
      creditsToAdd = fallbackMap[payment.planType] || 500000;
    }
    const currentCredits = payment.user.credits || 0;
    const newTotalCredits = currentCredits + creditsToAdd;

    // Calculate 30-day credit validity expiry from time of purchase/approval
    const thirtyDaysExpiry = calculateSubscriptionExpiry(new Date(), 30);

    // Atomic update in a transaction
    const [updatedPayment, updatedUser] = await prisma.$transaction([
      prisma.manualPayment.update({
        where: { id },
        data: {
          status: 'approved',
          adminNotes: adminNotes || `Approved by ${req.user.name || req.user.email} on ${new Date().toISOString()}`
        }
      }),
      prisma.user.update({
        where: { id: payment.userId },
        data: {
          plan: payment.planType,
          credits: newTotalCredits,
          subscriptionEndDate: thirtyDaysExpiry,
          creditsExpiresAt: thirtyDaysExpiry
        },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          credits: true,
          role: true,
          status: true,
          subscriptionEndDate: true,
          creditsExpiresAt: true
        }
      })
    ]);

    // Also sync the raw columns plan_type and characters_left in PostgreSQL
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE users SET plan_type = $1, characters_left = $2, subscription_end_date = $3, credits_expires_at = $4 WHERE id = $5`,
        payment.planType,
        newTotalCredits,
        thirtyDaysExpiry,
        thirtyDaysExpiry,
        payment.userId
      );
    } catch (rawErr) {
      // Non-blocking sync
    }

    console.log(`[Admin Payment Approval] Approved TID=${payment.transactionId} for User=${payment.user.email}. Plan=${payment.planType}, Credits=${newTotalCredits}, ExpiresAt=${thirtyDaysExpiry.toISOString()}`);

    return res.json({
      success: true,
      message: `Payment approved! User ${payment.user.name || payment.user.email} upgraded to ${payment.planType} plan with ${newTotalCredits.toLocaleString()} characters (valid for 30 days until ${thirtyDaysExpiry.toLocaleDateString()}).`,
      payment: updatedPayment,
      user: {
        ...updatedUser,
        subscriptionStatus: getSubscriptionStatus(updatedUser)
      }
    });
  } catch (err) {
    console.error('[Admin Payment Approval Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to approve payment.' });
  }
});

/**
 * POST /api/admin/manual-payments/:id/reject & PUT /api/admin/manual-payments/:id/reject
 * Rejects a manual payment with admin notes
 */
router.all('/manual-payments/:id/reject', async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { id } = req.params;
    const { reason, adminNotes } = req.body || {};
    const rejectionReason = reason || adminNotes || 'Transaction ID not verified or receipt invalid';

    const payment = await prisma.manualPayment.findUnique({ where: { id } });
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found.' });
    }

    const updated = await prisma.manualPayment.update({
      where: { id },
      data: {
        status: 'rejected',
        adminNotes: rejectionReason
      }
    });

    console.log(`[Admin Payment Rejection] Rejected TID=${payment.transactionId}. Reason: ${rejectionReason}`);

    return res.json({
      success: true,
      message: `Payment rejected (${rejectionReason}).`,
      payment: updated
    });
  } catch (err) {
    console.error('[Admin Payment Rejection Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to reject payment.' });
  }
});

module.exports = router;
