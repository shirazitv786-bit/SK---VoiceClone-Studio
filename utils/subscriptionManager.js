const { prisma } = require('../prismaClient');

const SUBSCRIPTION_EXPIRY_DAYS = 30;
const SUBSCRIPTION_EXPIRY_MS = SUBSCRIPTION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Calculates subscription expiry timestamp (default: 30 days from now).
 * @param {Date|string|number} [startDate=new Date()]
 * @param {number} [days=30]
 * @returns {Date}
 */
function calculateSubscriptionExpiry(startDate = new Date(), days = SUBSCRIPTION_EXPIRY_DAYS) {
  const baseTime = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime();
  return new Date(baseTime + days * 24 * 60 * 60 * 1000);
}

/**
 * Computes subscription metrics (status, days remaining, formatted dates).
 * @param {Object} user
 * @returns {Object}
 */
function getSubscriptionStatus(user) {
  if (!user) return null;

  const plan = user.plan || user.planType || 'Free';
  const isPaidPlan = plan !== 'Free';
  const expiryDate = user.creditsExpiresAt || user.subscriptionEndDate || null;

  if (!isPaidPlan || !expiryDate) {
    return {
      plan,
      isPaidPlan,
      hasExpiry: false,
      isExpired: false,
      daysRemaining: null,
      hoursRemaining: null,
      expiresAt: null,
      expiryFormatted: null,
      statusLabel: isPaidPlan ? 'Active (No Expiry Set)' : 'Free Starter Tier'
    };
  }

  const now = Date.now();
  const expiresAtMs = new Date(expiryDate).getTime();
  const diffMs = expiresAtMs - now;
  const isExpired = diffMs <= 0;

  const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  const hoursRemaining = Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)));

  return {
    plan,
    isPaidPlan,
    hasExpiry: true,
    isExpired,
    daysRemaining,
    hoursRemaining,
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiryFormatted: new Date(expiresAtMs).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    statusLabel: isExpired
      ? 'Subscription Expired'
      : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
  };
}

/**
 * Checks a specific user account. If their 30-day credits have expired,
 * automatically reverts them to Free tier with 0 remaining purchased credits.
 * @param {Object|string} userOrId
 * @returns {Promise<Object>} user record (either original or updated)
 */
async function checkAndExpireUser(userOrId) {
  try {
    let user = userOrId;
    if (typeof userOrId === 'string') {
      user = await prisma.user.findUnique({
        where: { id: userOrId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          plan: true,
          credits: true,
          subscriptionEndDate: true,
          creditsExpiresAt: true,
          createdAt: true
        }
      });
    }

    if (!user) return null;

    const plan = user.plan || 'Free';
    const expiryDate = user.creditsExpiresAt || user.subscriptionEndDate;

    // Free users or accounts without an expiry date are untouched
    if (plan === 'Free' || !expiryDate) {
      return user;
    }

    const now = Date.now();
    const expiresAtMs = new Date(expiryDate).getTime();

    // Still valid
    if (now < expiresAtMs) {
      return user;
    }

    // Credits Expired! Revert plan to Free and reset credits to 0
    console.log(`[Subscription Manager] 30-day credit validity expired for user ${user.email} (${user.id}). Expiring ${plan} plan & credits.`);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'Free',
        credits: 0,
        subscriptionEndDate: null,
        creditsExpiresAt: null
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

    // Also sync raw columns in PostgreSQL
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE users SET plan_type = 'Free', characters_left = 0, subscription_end_date = NULL, credits_expires_at = NULL WHERE id = $1`,
        user.id
      );
    } catch (e) {
      // Non-blocking raw sync
    }

    return updatedUser;
  } catch (err) {
    console.error('[Subscription Manager Error - checkAndExpireUser]:', err.message);
    return typeof userOrId === 'object' ? userOrId : null;
  }
}

/**
 * Periodically sweeps the database and downgrades all accounts
 * whose 30-day credit validity window has elapsed.
 * @returns {Promise<number>} number of expired users processed
 */
async function sweepExpiredSubscriptions() {
  try {
    const now = new Date();
    
    // Find all users with active paid plans whose expiry has passed
    const expiredUsers = await prisma.user.findMany({
      where: {
        plan: { not: 'Free' },
        OR: [
          { creditsExpiresAt: { lte: now } },
          { subscriptionEndDate: { lte: now } }
        ]
      },
      select: { id: true, email: true, plan: true, credits: true, creditsExpiresAt: true }
    });

    if (expiredUsers.length === 0) {
      return 0;
    }

    console.log(`[Subscription Manager] Found ${expiredUsers.length} account(s) with expired 30-day credits. Processing downgrade...`);

    const ids = expiredUsers.map(u => u.id);

    // Atomically reset plan and credits in database
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: {
        plan: 'Free',
        credits: 0,
        subscriptionEndDate: null,
        creditsExpiresAt: null
      }
    });

    // Sync raw columns
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE users SET plan_type = 'Free', characters_left = 0, subscription_end_date = NULL, credits_expires_at = NULL WHERE id = ANY($1::text[])`,
        ids
      );
    } catch (e) {
      // Non-blocking
    }

    expiredUsers.forEach(u => {
      console.log(`[Subscription Manager] Downgraded ${u.email} from ${u.plan} (${u.credits} credits expired).`);
    });

    return expiredUsers.length;
  } catch (err) {
    console.error('[Subscription Manager Error - sweepExpiredSubscriptions]:', err.message);
    return 0;
  }
}

module.exports = {
  SUBSCRIPTION_EXPIRY_DAYS,
  SUBSCRIPTION_EXPIRY_MS,
  calculateSubscriptionExpiry,
  getSubscriptionStatus,
  checkAndExpireUser,
  sweepExpiredSubscriptions
};
