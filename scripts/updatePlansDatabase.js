const { prisma } = require('../prismaClient');
const { DEFAULT_PLANS } = require('../utils/defaultPlans');

async function updatePlans() {
  try {
    const plansSetting = await prisma.systemSetting.findUnique({
      where: { key: 'plans_config' }
    });

    let currentPlans = [];
    if (plansSetting && plansSetting.value) {
      try {
        currentPlans = JSON.parse(plansSetting.value);
      } catch (e) {
        console.error('Failed to parse current plans:', e.message);
      }
    }

    if (!Array.isArray(currentPlans) || currentPlans.length === 0) {
      currentPlans = [...DEFAULT_PLANS];
    }

    const basicPlan = {
      id: 'Basic',
      name: 'Basic',
      priceMonthly: 900,
      priceAnnual: 720,
      pricePKR: 'PKR 900',
      displayPrice: 'PKR 900',
      credits: '100,000 credits',
      creditCount: 100000,
      badge: null,
      desc: 'Perfect for beginners and individual creators seeking reliable voice synthesis at an entry budget.',
      features: [
        'Community support 24/7',
        'MP3 download format',
        'Standard audio quality',
        'Basic voice selection',
        'Max 5,000 characters per conversion'
      ],
      buttonText: 'Subscribe to Basic',
      highlight: false,
      maxCharsPerGen: 5000,
      customVoicesCount: 1,
      maxQueuedTasks: 1,
      isEnabled: true
    };

    // If Basic already exists, update it; otherwise insert before Silver
    const existingIndex = currentPlans.findIndex(p => p.id?.toLowerCase() === 'basic');
    if (existingIndex >= 0) {
      currentPlans[existingIndex] = { ...currentPlans[existingIndex], ...basicPlan };
      console.log('Updated existing Basic plan in plans_config.');
    } else {
      const silverIndex = currentPlans.findIndex(p => p.id?.toLowerCase() === 'silver');
      if (silverIndex >= 0) {
        currentPlans.splice(silverIndex, 0, basicPlan);
      } else {
        const freeIndex = currentPlans.findIndex(p => p.id?.toLowerCase() === 'free');
        if (freeIndex >= 0) {
          currentPlans.splice(freeIndex + 1, 0, basicPlan);
        } else {
          currentPlans.unshift(basicPlan);
        }
      }
      console.log('Inserted new Basic plan into plans_config.');
    }

    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key: 'plans_config' },
      update: { value: JSON.stringify(currentPlans) },
      create: { key: 'plans_config', value: JSON.stringify(currentPlans) }
    });

    console.log('Successfully saved plans_config to database!');
    console.log('Current plan IDs:', currentPlans.map(p => `${p.name || p.id} (${p.pricePKR})`));
  } catch (err) {
    console.error('Error updating plans in database:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updatePlans();
