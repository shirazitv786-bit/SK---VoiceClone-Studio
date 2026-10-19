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
    id: 'Lite',
    name: 'Lite',
    priceMonthly: 10,
    priceAnnual: 8,
    pricePKR: 'PKR 2,800',
    displayPrice: '$10.00',
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
    priceMonthly: 17,
    priceAnnual: 13.6,
    pricePKR: 'PKR 4,750',
    displayPrice: '$17.00',
    credits: '1,000,000 credits',
    creditCount: 1000000,
    badge: 'Most Popular',
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
    highlight: true,
    maxCharsPerGen: 6000,
    customVoicesCount: 15,
    maxQueuedTasks: 3,
    isEnabled: true
  },
  {
    id: 'Studio',
    name: 'Studio',
    priceMonthly: 24,
    priceAnnual: 19.2,
    pricePKR: 'PKR 6,700',
    displayPrice: '$24.00',
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
