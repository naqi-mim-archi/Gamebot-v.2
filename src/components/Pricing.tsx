import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Loader2, Zap, Tag, X, CheckCircle2 } from 'lucide-react';
import TopNav from './TopNav';
import Navbar from './Navbar';
import Footer from './Footer';
import SEO from './SEO';
import { motion, AnimatePresence } from 'motion/react';

interface PricingProps {
  user?: any;
  userProfile?: any;
  onLogout?: () => void;
}

// Base prices in cents
const TIER_PRICES: Record<string, number> = {
  creator: 2000,
  pro: 5000,
  studio: 10000,
};

function applyDiscount(cents: number, pct: number): string {
  return '$' + ((cents * (100 - pct)) / 100 / 100).toFixed(0);
}

export default function Pricing({ user, userProfile, onLogout }: PricingProps) {
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const tiers = [
    {
      name: 'Creator',
      tierId: 'creator',
      basePrice: '$20',
      period: '/mo',
      description: 'Perfect for hobbyists and game jammers.',
      features: [
        'Unlocks Code Editor',
        'ZIP Export',
        '100 Credits / month',
        'Standard Support',
      ],
      buttonText: user ? 'Upgrade to Creator' : 'Start Creating',
      highlighted: false,
    },
    {
      name: 'Pro',
      tierId: 'pro',
      basePrice: '$50',
      period: '/mo',
      description: 'For indie devs and serious creators.',
      features: [
        'Everything in Creator',
        'React/PWA Export',
        'Commercial Rights',
        'Bring Your Own Key (BYOK)',
        '500 Credits / month',
      ],
      buttonText: user ? 'Upgrade to Pro' : 'Get Pro Access',
      highlighted: true,
    },
    {
      name: 'Studio',
      tierId: 'studio',
      basePrice: '$100',
      period: '/mo',
      description: 'For professional game studios.',
      features: [
        'Everything in Pro',
        'Watermark Removal',
        'Priority Support',
        'Unlimited Credits (Fair Use)',
      ],
      buttonText: user ? 'Upgrade to Studio' : 'Contact Sales',
      highlighted: false,
    },
  ];

  const topups = [
    { id: 'topup_10', credits: 100, price: '$10' },
    { id: 'topup_20', credits: 250, price: '$20', popular: true },
    { id: 'topup_40', credits: 600, price: '$40' },
    { id: 'topup_100', credits: 2000, price: '$100' },
  ];

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoApplied(null);
    try {
      const res = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setPromoApplied({ code: data.code, discountPercent: data.discountPercent });
        setPromoInput('');
      } else {
        setPromoError(data.error || 'Invalid promo code');
      }
    } catch {
      setPromoError('Could not validate code. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleUpgrade = async (tierId: string) => {
    if (!user) { navigate('/app'); return; }

    setLoadingTier(tierId);
    setCheckoutError(null);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tierId,
          userId: user.uid,
          email: user.email,
          returnUrl: window.location.origin + '/dashboard',
          promoCode: promoApplied?.code || null,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      setCheckoutError(error?.message || 'Checkout failed. Please try again.');
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 relative overflow-hidden pt-[72px]">
      <SEO
        title="Pricing - GameBot"
        description="Simple, transparent pricing for game developers. Start for free and upgrade as you grow."
      />
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <div className="glow-orb glow-orb-violet w-[600px] h-[600px] top-[-200px] right-[-200px]" />
      <div className="glow-orb glow-orb-emerald w-[400px] h-[400px] bottom-[-100px] left-[-100px]" />

      {user ? (
        <TopNav user={user} userProfile={userProfile} onLogout={onLogout} />
      ) : (
        <Navbar />
      )}

      <main className="max-w-6xl mx-auto px-6 py-16 relative z-10">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-12 space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold uppercase tracking-wider mb-4 backdrop-blur-md">
            <Zap className="w-4 h-4" />
            <span>Unlock the Engine</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tighter bg-gradient-to-br from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent">
            Simple, transparent pricing
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light">
            Start for free with our 14-day trial. Upgrade when you need more power, exports, and commercial rights.
          </p>
        </motion.div>

        {/* ── Promo Code ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-md mx-auto mb-10"
        >
          <AnimatePresence mode="wait">
            {promoApplied ? (
              <motion.div
                key="applied"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
              >
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    <span className="font-bold">{promoApplied.code}</span> applied —{' '}
                    <span className="font-bold">{promoApplied.discountPercent}% off</span> your subscription
                  </span>
                </div>
                <button
                  onClick={() => setPromoApplied(null)}
                  className="text-zinc-500 hover:text-white transition-colors ml-3 shrink-0"
                  title="Remove promo"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                      onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                      placeholder="Promo code"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono tracking-wider"
                    />
                  </div>
                  <button
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-sm font-bold text-white disabled:opacity-40 transition-colors flex items-center gap-2 shrink-0"
                  >
                    {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </button>
                </div>
                {promoError && (
                  <p className="text-rose-400 text-xs mt-2 pl-1">{promoError}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Checkout error */}
        {checkoutError && (
          <div className="max-w-5xl mx-auto mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm text-center">
            {checkoutError}
          </div>
        )}

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier, idx) => {
            const discountedPrice = promoApplied
              ? applyDiscount(TIER_PRICES[tier.tierId], promoApplied.discountPercent)
              : null;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                key={tier.name}
                className={`relative rounded-3xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-2 ${
                  tier.highlighted
                    ? 'glass-panel border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
                    : 'glass-panel hover:glass-panel-active'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-zinc-950 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-2xl font-display font-bold mb-2 text-white">{tier.name}</h3>
                  <p className="text-sm text-zinc-400 h-10 leading-relaxed">{tier.description}</p>
                </div>

                {/* Price — show discounted if promo applied */}
                <div className="mb-8">
                  {discountedPrice ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-display font-bold text-emerald-400">{discountedPrice}</span>
                      <span className="text-zinc-500 font-medium">{tier.period}</span>
                      <span className="text-zinc-600 line-through text-xl ml-1">{tier.basePrice}</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-display font-bold text-white">{tier.basePrice}</span>
                      <span className="text-zinc-500 font-medium">{tier.period}</span>
                    </div>
                  )}
                  {discountedPrice && (
                    <p className="text-emerald-400 text-xs mt-1 font-medium">
                      {promoApplied!.discountPercent}% off with {promoApplied!.code}
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(tier.tierId)}
                  disabled={loadingTier !== null}
                  className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    tier.highlighted
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  } disabled:opacity-70`}
                >
                  {loadingTier === tier.tierId ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    tier.buttonText
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Top-ups */}
        {user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-32 max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-display font-bold mb-4 text-white">Need more energy?</h2>
              <p className="text-zinc-400 text-lg">Instantly top-up your core balance. Credits never expire.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {topups.map((topup, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  key={topup.id}
                  className={`glass-panel rounded-3xl p-6 text-center relative flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                    topup.popular
                      ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                      : 'hover:glass-panel-active'
                  }`}
                >
                  {topup.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-500/30 backdrop-blur-md">
                      Best Value
                    </div>
                  )}
                  <div className="text-3xl font-display font-bold text-white mb-1">{topup.credits}</div>
                  <div className="text-xs text-zinc-500 mb-6 uppercase tracking-wider font-bold">Credits</div>
                  <div className="text-2xl font-medium text-emerald-400 mb-8">{topup.price}</div>

                  <button
                    onClick={() => handleUpgrade(topup.id)}
                    disabled={loadingTier !== null}
                    className="mt-auto w-full py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center border border-white/10"
                  >
                    {loadingTier === topup.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Acquire'}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
