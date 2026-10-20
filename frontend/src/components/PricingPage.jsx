import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5000' : '';

const DEFAULT_PLANS = [
  {
    id: 'Free',
    name: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
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
    highlight: false
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
    highlight: false
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
    highlight: true
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
    highlight: false
  }
];

export default function PricingPage({
  user,
  onSelectPlan,
  onOpenManualPayment,
  onNavigate,
  onOpenAuth,
  dynamicPlans
}) {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [selectedPlanModal, setSelectedPlanModal] = useState(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [plans, setPlans] = useState(() => {
    if (dynamicPlans && Array.isArray(dynamicPlans) && dynamicPlans.length > 0) {
      return dynamicPlans.filter(p => p.isEnabled !== false);
    }
    return DEFAULT_PLANS;
  });

  const fetchDynamicPlans = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/plans`);
      if (res.data && res.data.success && Array.isArray(res.data.plans) && res.data.plans.length > 0) {
        setPlans(res.data.plans.filter(p => p.isEnabled !== false));
      }
    } catch (err) {
      // Fallback to default plans silently
    }
  };

  useEffect(() => {
    if (dynamicPlans && Array.isArray(dynamicPlans) && dynamicPlans.length > 0) {
      setPlans(dynamicPlans.filter(p => p.isEnabled !== false));
    }
  }, [dynamicPlans]);

  useEffect(() => {
    fetchDynamicPlans();

    const handlePlansUpdated = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setPlans(e.detail.filter(p => p.isEnabled !== false));
      } else {
        fetchDynamicPlans();
      }
    };

    window.addEventListener('sk-plans-updated', handlePlansUpdated);
    window.addEventListener('focus', fetchDynamicPlans);

    return () => {
      window.removeEventListener('sk-plans-updated', handlePlansUpdated);
      window.removeEventListener('focus', fetchDynamicPlans);
    };
  }, []);

  const handlePlanClick = (plan) => {
    if (!user) {
      onOpenAuth('signup');
      return;
    }
    if (plan.id === 'Free') {
      setSelectedPlanModal(plan);
      setCheckoutSuccess(false);
      return;
    }
    // For paid plans (Lite, Pro, Studio), trigger the JazzCash manual payment workflow
    if (onOpenManualPayment) {
      onOpenManualPayment(plan.id);
    } else {
      setSelectedPlanModal(plan);
      setCheckoutSuccess(false);
    }
  };

  const handleConfirmPlan = () => {
    if (selectedPlanModal) {
      onSelectPlan(selectedPlanModal.id, selectedPlanModal.creditCount);
      setCheckoutSuccess(true);
      setTimeout(() => {
        setSelectedPlanModal(null);
        setCheckoutSuccess(false);
      }, 1600);
    }
  };

  const faqs = [
    {
      q: 'How do credits work in SK - VoiceClone Studio?',
      a: '1 character in your script equals 1 credit. For example, a 500-character paragraph uses 500 credits. Our Free plan gives you 2,000 credits to test, while Lite offers 500,000 credits (around 9 hours of finished audio) and Studio gives 3,000,000 credits (45+ hours).'
    },
    {
      q: 'What is the difference between V2 and V3 Voice Cloning models?',
      a: 'V2 (Multilingual) provides rich emotional expressiveness across 35+ regional accents. V3 (Turbo), unlocked on the Studio tier, offers sub-second inference speeds, ultra-high sample resolution, and advanced dynamic cadence tuning for professional media production.'
    },
    {
      q: 'Can I use generated voices commercially?',
      a: 'Yes! All plans including Lite, Pro, and Studio grant 100% royalty-free commercial usage rights for YouTube monetization, podcasts, audiobooks, video games, broadcast commercials, and client projects.'
    },
    {
      q: 'What are cloned reference voice credits?',
      a: 'Cloned reference voice credits allow you to upload unique custom 5-second voice samples and permanently save them to your custom voice registry for instant reuse whenever you synthesize audio.'
    },
    {
      q: 'How long are purchased character credits valid?',
      a: 'All character credits in Lite, Pro, and Studio packages are valid for 30 days from the date of activation. Unused credits expire after 30 days. You can easily renew or top up your package anytime to keep your voice synthesis active.'
    },
    {
      q: 'Can I cancel or change my plan anytime?',
      a: 'Absolutely. You can upgrade, downgrade, or cancel at any time. When upgrading, your credits and features update immediately with pro-rated billing.'
    }
  ];

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-zinc-100 relative overflow-hidden bg-[#09090b]">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-zinc-900 text-zinc-300 border border-zinc-800 mb-3">
            <span>Commercial Packages & Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Flexible Plans for Every Creator
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-400">
            Start for free with 2,000 starter credits. Scale up as your voice generation needs grow with unlimited downloads, custom voice cloning, and turbo generation.
          </p>

          {/* Billing Cycle Toggle (Black & White) */}
          <div className="mt-8 inline-flex items-center gap-2 p-1 rounded-2xl border bg-zinc-900/90 border-zinc-800">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* The 4 Pricing Cards (Exact match from the picture with pure black & white design) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const isCurrentPlan = user && user.plan === plan.id;
            const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative ${
                  plan.highlight
                    ? 'bg-[#15151a] border-2 border-white shadow-2xl ring-1 ring-white/10 scale-[1.02] lg:-translate-y-2'
                    : 'bg-[#121215] border border-zinc-800 hover:border-zinc-700 shadow-xl'
                }`}
              >
                {/* Most Popular Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white text-black shadow-md shadow-white/10">
                    {plan.badge}
                  </div>
                )}

                <div>
                  {/* Plan Header & Name */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold tracking-tight text-white">
                      {plan.name}
                    </h3>
                    {isCurrentPlan && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Active Plan
                      </span>
                    )}
                  </div>

                  {/* Price Tag */}
                  <div className="mt-3 flex items-baseline gap-1">
                    {plan.id === 'Free' ? (
                      <span className="text-3xl sm:text-4xl font-extrabold text-[#22c55e] tracking-tight">
                        FREE
                      </span>
                    ) : (
                      <>
                        <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                          PKR {Number(price || 0).toLocaleString()}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">
                          /month
                        </span>
                      </>
                    )}
                  </div>

                  {/* Credits Pill with Lightning Icon */}
                  <div className="mt-5 mb-5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                    <span className="text-pink-400 text-sm">⚡</span>
                    <span className="text-xs font-bold text-zinc-100 tracking-wide font-mono">
                      {plan.credits}
                    </span>
                  </div>

                  {/* Description */}
                  {plan.desc && (
                    <p className="text-xs text-zinc-400 leading-relaxed mb-6 min-h-[36px]">
                      {plan.desc}
                    </p>
                  )}

                  {/* Feature Checklist with Green Checkmarks */}
                  <div className="space-y-3.5 pt-2">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-snug">
                        <svg
                          width="16"
                          height="16"
                          className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call-to-Action Button */}
                <div className="mt-8 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => handlePlanClick(plan)}
                    disabled={isCurrentPlan}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] ${
                      isCurrentPlan
                        ? 'bg-zinc-800 text-zinc-400 cursor-default border border-zinc-700'
                        : plan.highlight
                          ? 'bg-white hover:bg-zinc-200 text-black font-extrabold shadow-white/5'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Active Plan' : plan.buttonText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Matrix Table */}
        <div className="mt-20 pt-10 border-t border-zinc-800">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Detailed Plan Feature Matrix
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Compare features across Free, Lite, Pro, and Studio tiers to find your ideal workflow.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#121215]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/80">
                  <th className="p-4 font-bold text-white">Features</th>
                  <th className="p-4 font-bold text-center">Free</th>
                  <th className="p-4 font-bold text-center">Lite</th>
                  <th className="p-4 font-bold text-center text-white">Pro</th>
                  <th className="p-4 font-bold text-center text-emerald-400">Studio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                <tr>
                  <td className="p-4 font-semibold text-white">Monthly Credits</td>
                  <td className="p-4 text-center">2,000</td>
                  <td className="p-4 text-center font-bold">500,000</td>
                  <td className="p-4 text-center font-bold text-white">1,000,000</td>
                  <td className="p-4 text-center font-bold text-emerald-300">3,000,000</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Character Limit / Generation</td>
                  <td className="p-4 text-center">2,000 chars</td>
                  <td className="p-4 text-center">5,000 chars</td>
                  <td className="p-4 text-center">6,000 chars</td>
                  <td className="p-4 text-center font-bold text-emerald-400">7,000 chars</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Cloned Voice Slots</td>
                  <td className="p-4 text-center">None</td>
                  <td className="p-4 text-center">5 voices</td>
                  <td className="p-4 text-center">15 voices</td>
                  <td className="p-4 text-center font-bold text-emerald-400">30 voices</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Concurrent Queued Tasks</td>
                  <td className="p-4 text-center">1 task</td>
                  <td className="p-4 text-center">1 task</td>
                  <td className="p-4 text-center">3 tasks</td>
                  <td className="p-4 text-center font-bold text-emerald-400">4 tasks</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">AI Voice Engine</td>
                  <td className="p-4 text-center">Standard Edge</td>
                  <td className="p-4 text-center">V2 Multilingual</td>
                  <td className="p-4 text-center">V2 Multilingual</td>
                  <td className="p-4 text-center font-bold text-emerald-400">V2 + V3 Turbo</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Audio Quality & Bitrate</td>
                  <td className="p-4 text-center">Standard MP3</td>
                  <td className="p-4 text-center">HD MP3 / 24kHz</td>
                  <td className="p-4 text-center">Studio Master / 24kHz</td>
                  <td className="p-4 text-center font-bold text-emerald-400">Studio Master WAV / 48kHz</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Support SLA</td>
                  <td className="p-4 text-center">Community</td>
                  <td className="p-4 text-center">Standard Email</td>
                  <td className="p-4 text-center">Priority 36h</td>
                  <td className="p-4 text-center font-bold text-emerald-400">Priority 24h Email</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Commercial Rights</td>
                  <td className="p-4 text-center text-zinc-500">Personal Only</td>
                  <td className="p-4 text-center text-emerald-400">✓ Full Commercial</td>
                  <td className="p-4 text-center text-emerald-400">✓ Full Commercial</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">✓ Full Commercial + Enterprise</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Everything you need to know about billing, usage limits, and commercial licenses.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-zinc-800 bg-[#121215] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full p-4 sm:p-5 text-left text-sm font-bold flex items-center justify-between gap-4 text-zinc-200 hover:text-white"
                  >
                    <span>{faq.q}</span>
                    <svg
                      width="16"
                      height="16"
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : 'text-zinc-500'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Enterprise & Custom Volume Contact Banner */}
        <div className="mt-20 p-8 sm:p-10 rounded-3xl border border-zinc-800 bg-[#121215] flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
              Enterprise & High Volume
            </span>
            <h3 className="text-2xl font-extrabold text-white mt-2">
              Need custom GPU instances or API access?
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              We offer dedicated neural voice training, unlimited character bandwidth, SLA uptime guarantees, and custom on-premise deployments.
            </p>
          </div>
          <button
            onClick={() => onNavigate('studio')}
            className="px-6 py-3 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-md shrink-0 active:scale-95"
          >
            Contact Sales & Enterprise
          </button>
        </div>
      </div>

      {/* Plan Checkout / Activation Simulation Modal */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-[#121215] p-6 shadow-2xl relative text-zinc-100">
            <button
              onClick={() => setSelectedPlanModal(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              ✕
            </button>

            {checkoutSuccess ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-white">Subscription Activated!</h3>
                <p className="text-xs text-zinc-400">
                  Your account has been upgraded to the <strong className="text-white">{selectedPlanModal.name}</strong> plan with{' '}
                  <strong className="text-white font-mono">{selectedPlanModal.credits}</strong>.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center text-lg font-bold">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Activate {selectedPlanModal.name} Plan</h3>
                    <p className="text-xs text-zinc-400">
                      {selectedPlanModal.displayPrice} / month • {billingCycle === 'annual' ? 'Billed annually (20% off)' : 'Billed monthly'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2 mb-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Credit Allotment:</span>
                    <span className="font-bold text-white font-mono">{selectedPlanModal.credits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Voice Cloning Slots:</span>
                    <span className="font-bold text-zinc-200">
                      {selectedPlanModal.id === 'Free' ? 'Standard Only' : selectedPlanModal.id === 'Lite' ? '5 Slots' : selectedPlanModal.id === 'Pro' ? '15 Slots' : '30 Slots'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Account:</span>
                    <span className="font-mono text-zinc-300">{user?.email || 'Registered User'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-400 mb-6">
                  <span>✓ 100% Commercial Broadcast Rights Included</span>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmPlan}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-white hover:bg-zinc-200 text-black shadow-lg transition-all active:scale-95"
                >
                  Confirm & Activate {selectedPlanModal.name}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
