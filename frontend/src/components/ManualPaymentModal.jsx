import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5000' : '';

export default function ManualPaymentModal({
  isOpen,
  onClose,
  initialPlan = 'Pro',
  user,
  onPaymentSuccess
}) {
  const [selectedPlan, setSelectedPlan] = useState(initialPlan || 'Pro');
  const [transactionId, setTransactionId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Available Plan Packages with Dynamic Fallback
  const DEFAULT_PLAN_DETAILS = {
    Silver: {
      name: 'Silver Plan',
      pricePKR: 'PKR 1,600',
      credits: '250,000 characters',
      features: 'Community Support 24/7 • Max 5,000 chars/conversion • MP3 format'
    },
    Lite: {
      name: 'Lite Plan',
      pricePKR: 'PKR 2,800',
      credits: '500,000 characters',
      features: '5 Custom Voices • 5,000 chars/generation • Multilingual V2'
    },
    Pro: {
      name: 'Pro Plan',
      pricePKR: 'PKR 4,750',
      credits: '1,000,000 characters',
      popular: true,
      features: '15 Custom Voices • 6,000 chars/generation • Priority Support'
    },
    Studio: {
      name: 'Studio Plan',
      pricePKR: 'PKR 6,700',
      credits: '3,000,000 characters',
      features: '30 Custom Voices • 7,000 chars/gen • Turbo V3 + Commercial Rights'
    }
  };

  const [planDetails, setPlanDetails] = useState(DEFAULT_PLAN_DETAILS);

  React.useEffect(() => {
    const fetchDynamicPlans = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/plans`);
        if (res.data && res.data.success && Array.isArray(res.data.plans)) {
          const map = {};
          res.data.plans.filter(p => p.id !== 'Free' && p.isEnabled !== false).forEach(p => {
            map[p.id] = {
              name: p.name || `${p.id} Plan`,
              pricePKR: p.pricePKR || (p.displayPrice && p.displayPrice.includes('PKR') ? p.displayPrice : `PKR ${Number(p.priceMonthly || 0).toLocaleString()}`),
              credits: `${(Number(p.creditCount) || 0).toLocaleString()} characters`,
              popular: Boolean(p.highlight || p.badge?.toLowerCase().includes('popular')),
              features: Array.isArray(p.features) ? p.features.slice(0, 3).join(' • ') : (p.desc || '')
            };
          });
          if (Object.keys(map).length > 0) {
            setPlanDetails(map);
          }
        }
      } catch (e) {}
    };
    fetchDynamicPlans();
    window.addEventListener('sk-plans-updated', fetchDynamicPlans);
    return () => window.removeEventListener('sk-plans-updated', fetchDynamicPlans);
  }, []);

  const currentPlanInfo = planDetails[selectedPlan] || Object.values(planDetails)[0] || DEFAULT_PLAN_DETAILS.Pro;

  if (!isOpen) return null;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText('03037108440');
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Screenshot file exceeds 10MB limit. Please upload a smaller image.');
        return;
      }
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanTid = transactionId.trim();
    if (!cleanTid) {
      setErrorMessage('Please enter the JazzCash Transaction ID (TID) from your payment receipt.');
      return;
    }

    if (cleanTid.length < 4) {
      setErrorMessage('Transaction ID (TID) appears too short. Please verify your receipt SMS.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('sk_voiceclone_auth_token');
      const formData = new FormData();
      formData.append('transactionId', cleanTid);
      formData.append('planType', selectedPlan);
      formData.append('amount', currentPlanInfo.pricePKR || `PKR Standard`);
      if (senderNumber.trim()) {
        formData.append('senderNumber', senderNumber.trim());
      }
      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      }

      const res = await axios.post(`${API_BASE}/api/user/manual-payment`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.data && res.data.success) {
        setSuccessData(res.data.payment);
        if (onPaymentSuccess) {
          onPaymentSuccess(res.data.payment);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Payment submission failed.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    if (loading) return;
    handleRemoveScreenshot();
    setTransactionId('');
    setSenderNumber('');
    setErrorMessage(null);
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white shadow-2xl p-6 sm:p-7 relative max-h-[92vh] overflow-y-auto text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleModalClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all cursor-pointer"
          title="Close"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {successData ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto text-3xl font-bold shadow-sm">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-zinc-900">Payment Submitted for Verification!</h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-md mx-auto leading-relaxed">
                Thank you! Your JazzCash transfer details have been sent to our administrator for verification.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-left text-xs space-y-2.5 max-w-md mx-auto">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                <span className="text-zinc-500">Requested Plan:</span>
                <span className="font-bold text-zinc-900 uppercase">{successData.planType} Tier</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                <span className="text-zinc-500">Transaction ID (TID):</span>
                <span className="font-mono font-bold text-emerald-700">{successData.transactionId}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                <span className="text-zinc-500">Allotted Balance:</span>
                <span className="font-mono text-zinc-800">{currentPlanInfo.credits}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                <span className="text-zinc-500">Validity Period:</span>
                <span className="font-mono text-emerald-700 font-bold">30 Days from Approval</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Status:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                  Pending Admin Approval
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-100 border border-zinc-200 text-[11px] text-zinc-600 max-w-md mx-auto leading-relaxed">
              ⚡ Verification is typically completed within <strong>15–30 minutes</strong>. Once approved, your account balance and features update automatically.
            </div>

            <button
              type="button"
              onClick={handleModalClose}
              className="w-full max-w-md py-3 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-md active:scale-98 cursor-pointer"
            >
              Done & Return to Studio
            </button>
          </div>
        ) : (
          /* Main Payment Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header with JazzCash Logo */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-200">
              <div className="w-16 h-12 rounded-xl bg-zinc-50 border border-zinc-200 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                <img
                  src="/jazzcash.webp"
                  alt="JazzCash Official Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold tracking-tight text-zinc-900">
                    Upgrade via JazzCash
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Manual Payment
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Direct transfer from your JazzCash Mobile Account
                </p>
              </div>
            </div>

            {/* Plan Selector Pills */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
                1. Select Package Tier
              </label>
              <div className={`grid ${Object.keys(planDetails).length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-2`}>
                {Object.entries(planDetails).map(([key, info]) => {
                  const isSelected = selectedPlan === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedPlan(key)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-zinc-900 border-zinc-900 text-white shadow-md'
                          : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-800 shadow-xs'
                      }`}
                    >
                      {info.popular && (
                        <span className={`absolute -top-2 right-2 px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                          isSelected ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'
                        }`}>
                          Popular
                        </span>
                      )}
                      <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-zinc-200' : 'text-zinc-600'}`}>{key}</div>
                      <div className={`text-sm font-extrabold mt-1 ${isSelected ? 'text-white' : 'text-zinc-900'}`}>{info.pricePKR}</div>
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>{info.credits.split(' ')[0]} chars</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* JazzCash Receiver Box */}
            <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                  2. Send Fee To This JazzCash Account
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  Payable: {currentPlanInfo.pricePKR}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Account Number */}
                <div className="p-3 rounded-xl bg-white border border-zinc-200 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Account Number</span>
                    <span className="font-mono text-base font-extrabold text-zinc-900 tracking-wider">03037108440</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    {copiedNumber ? '✓ Copied' : 'Copy'}
                  </button>
                </div>

                {/* Account Title */}
                <div className="p-3 rounded-xl bg-white border border-zinc-200 flex flex-col justify-center shadow-xs">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Account Title</span>
                  <span className="text-base font-extrabold text-zinc-900 tracking-wide">AROSA</span>
                </div>
              </div>

              <div className="text-[11px] text-zinc-600 leading-relaxed pt-1">
                Open your <strong>JazzCash App</strong> or dial <strong>*786#</strong> → Send Money to JazzCash Account <strong>03037108440</strong> (Title: <strong>AROSA</strong>).
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Input Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  3. Enter Transaction ID (TID) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 0123456789 or TID84739281"
                    className="w-full px-4 py-2.5 rounded-xl border bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm font-mono focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 text-xs">
                    TID
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  You received this TID in the JazzCash SMS confirmation (e.g., "Trx ID: 1234567890").
                </p>
              </div>

              {/* Sender Phone Number (Optional) */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Sender Mobile Number <span className="text-zinc-500 font-normal">(Optional, helps faster verification)</span>
                </label>
                <input
                  type="text"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="e.g. 03001234567"
                  className="w-full px-4 py-2.5 rounded-xl border bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm font-mono focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
                />
              </div>

              {/* Payment Screenshot Upload */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Upload Payment Screenshot / Receipt <span className="text-zinc-500 font-normal">(Recommended)</span>
                </label>

                {screenshotPreview ? (
                  <div className="p-3 rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={screenshotPreview}
                        alt="Payment Receipt Preview"
                        className="w-14 h-14 rounded-lg object-cover border border-zinc-300 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate">{screenshotFile?.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {((screenshotFile?.size || 0) / 1024).toFixed(1)} KB • Image attached
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveScreenshot}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all">
                    <svg className="w-8 h-8 text-zinc-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-zinc-700">
                      Click to upload receipt screenshot
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">PNG, JPG, or WEBP (Max 10 MB)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-xs font-bold border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !transactionId.trim()}
                className="flex-[2] py-3 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-md transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-bold"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Submitting Payment...</span>
                  </>
                ) : (
                  <span>Submit Payment for Approval →</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
