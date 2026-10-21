const { prisma } = require('../prismaClient');

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

    const silverPlan = {
      id: 'Silver',
      name: 'Silver',
      priceMonthly: 1600,
      priceAnnual: 1280,
      pricePKR: 'PKR 1,600',
      displayPrice: 'PKR 1,600',
      credits: '250,000 credits',
      creditCount: 250000,
      badge: 'Silver',
      desc: 'Great for active creators seeking dependable voice cloning and extended generation limits.',
      features: [
        'Community support 24/7',
        'MP3 download format',
        'Standard audio quality',
        'Basic voice selection',
        'Max 5,000 characters per conversion'
      ],
      buttonText: 'Subscribe to Silver',
      highlight: false,
      maxCharsPerGen: 5000,
      customVoicesCount: 3,
      maxQueuedTasks: 2,
      isEnabled: true
    };

    // If Silver already exists in array, update it; otherwise insert between Starter/Free and Lite
    const existingIndex = currentPlans.findIndex(p => p.id?.toLowerCase() === 'silver');
    if (existingIndex >= 0) {
      currentPlans[existingIndex] = { ...currentPlans[existingIndex], ...silverPlan };
      console.log('Updated existing Silver plan in plans_config.');
    } else {
      // Find insertion index (before Lite)
      const liteIndex = currentPlans.findIndex(p => p.id?.toLowerCase() === 'lite');
      if (liteIndex >= 0) {
        currentPlans.splice(liteIndex, 0, silverPlan);
      } else {
        currentPlans.push(silverPlan);
      }
      console.log('Inserted new Silver plan into plans_config.');
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
