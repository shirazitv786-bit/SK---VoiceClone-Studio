/**
 * Default Pricing & Subscription Plans
 * Used as the baseline and fallback for the entire platform.
 */
const DEFAULT_PLANS = [
  {
    id: 'Free',
    name: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    pricePKR: 'PKR 0',
    displayPrice: 'FREE',
    credits: '2,000 credits',
    creditCount: 2000,
    badge: null,
    desc: 'Start your journey with our free plan - perfect for getting started with basic voice generation.',
    features: [
      'Community support',
      'MP3 download format',
      'Standard audio quality',
      'Basic voice selection',
      'Max 2,500 characters per conversion'
    ],
    buttonText: 'Get Started Free',
    highlight: false,
    maxCharsPerGen: 2500,
    customVoicesCount: 0,
    maxQueuedTasks: 1,
    isEnabled: true
  },
  {
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
  },
  {
    id: 'Silver',
    name: 'Silver',
    priceMonthly: 1600,
    priceAnnual: 1280,
    pricePKR: 'PKR 1,600',
    displayPrice: 'PKR 1,600',
    credits: '250,000 credits',
    creditCount: 250000,
    badge: 'Most Popular',
    desc: 'Great for active creators seeking dependable voice cloning and extended generation limits.',
    features: [
      'Community support 24/7',
      'MP3 download format',
      'Standard audio quality',
      'Basic voice selection',
      'Max 5,000 characters per conversion'
    ],
    buttonText: 'Subscribe to Silver',
    highlight: true,
    maxCharsPerGen: 5000,
    customVoicesCount: 3,
    maxQueuedTasks: 2,
    isEnabled: true
  },
  {
    id: 'Lite',
    name: 'Lite',
    priceMonthly: 2800,
    priceAnnual: 2240,
    pricePKR: 'PKR 2,800',
    displayPrice: 'PKR 2,800',
    credits: '500,000 credits',
    creditCount: 500000,
    badge: null,
    desc: 'Ideal for casual creators, audio hobbyists, and regular voiceover projects.',
    features: [
      'Unlimited Downloads & 1 month of conversion history',
      'Maximum 5,000 characters per generation',
      '5 cloned reference voice credits',
      'Max 1 Queued Tasks',
      'Access to V2 (Multilingual) Voice Cloning Models',
      '500,000 characters per month (approx. 9 hours of audio)'
    ],
    buttonText: 'Subscribe to Lite',
    highlight: false,
    maxCharsPerGen: 5000,
    customVoicesCount: 5,
    maxQueuedTasks: 1,
    isEnabled: true
  },
  {
    id: 'Pro',
    name: 'Pro',
    priceMonthly: 4750,
    priceAnnual: 3800,
    pricePKR: 'PKR 4,750',
    displayPrice: 'PKR 4,750',
    credits: '1,000,000 credits',
    creditCount: 1000000,
    badge: 'Professional',
    desc: 'Built for pro content creators, video editors, podcasters, and growing channels.',
    features: [
      'Priority 36h Customer Support',
      'Unlimited Downloads & 1 month of conversion history',
      'Maximum 6,000 characters per regular conversion',
      '15 cloned reference voice credits',
      '60+ AI voices and 6+ languages',
      'Max 3 queued tasks',
      'Access to V2 (Multilingual) Voice Cloning Models',
      '1,000,000 total characters per month (approximately 20.4 hours of audio)'
    ],
    buttonText: 'Upgrade to Pro',
    highlight: false,
    maxCharsPerGen: 6000,
    customVoicesCount: 15,
    maxQueuedTasks: 3,
    isEnabled: true
  },
  {
    id: 'Studio',
    name: 'Studio',
    priceMonthly: 6700,
    priceAnnual: 5360,
    pricePKR: 'PKR 6,700',
    displayPrice: 'PKR 6,700',
    credits: '3,000,000 credits',
    creditCount: 3000000,
    badge: 'Best Value',
    desc: 'Perfect for content creators, agencies, game developers, and businesses.',
    features: [
      'Priority 24h Email Support',
      'Unlimited Downloads & 1 month of conversion history',
      'Maximum 7,000 characters per regular generation',
      '30 cloned reference voice credits',
      '60+ AI voices and 6+ languages',
      'Max 4 queued tasks',
      'Access to V2 (Multilingual) + V3 (Turbo) Voice Cloning Models',
      '3,000,000 characters per month (approximately 45 hours of audio)'
    ],
    buttonText: 'Get Studio Pass',
    highlight: false,
    maxCharsPerGen: 7000,
    customVoicesCount: 30,
    maxQueuedTasks: 4,
    isEnabled: true
  }
];

module.exports = { DEFAULT_PLANS };
