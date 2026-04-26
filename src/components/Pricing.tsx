import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Loader2, Zap, X, CheckCircle2, Gift, Wand2, Play } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';

// 👇 ADD THESE IMPORTS TO FIX THE PROMO CODE VALIDATION 👇
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase'; 

interface PricingProps {
  user?: any;
  userProfile?: any;
  onLogout?: () => void;
}

// ── Promo claim modal ───────────────────────────────────────
function PromoClaimModal({
  promo,
  tierName,
  originalPrice,
  discountedPrice,
  onClaim,
  onClose,
}: {
  promo: { code: string; discountPercent: number };
  tierName: string;
  originalPrice: string;
  discountedPrice: string;
  onClaim: () => void;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(600); // 10-min countdown
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timer.current = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer.current);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05050A]/90 backdrop-blur-sm font-sora"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 280 }}
        className="relative w-full max-w-sm bg-[#0A0A10] border border-white/10 rounded-[32px] p-8 text-center shadow-2xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF00C0]/10 to-transparent pointer-events-none" />

        <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-[#FF00C0]/20 border border-[#FF00C0]/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,0,192,0.3)]">
          <Gift className="w-8 h-8 text-[#FF00C0]" />
        </div>

        <p className="text-[#B3B6CB] text-[11px] uppercase tracking-[0.2em] font-bold mb-2">Exclusive offer</p>
        <h2 className="text-3xl font-bold text-white leading-tight mb-1">
          You're getting
        </h2>
        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] leading-tight mb-4">
          {promo.discountPercent}% OFF
        </h2>
        <p className="text-[#B3B6CB] text-sm mb-6">
          on <span className="text-white font-bold">{tierName}</span> — limited time offer
        </p>

        <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 mb-6">
          <CheckCircle2 className="w-4 h-4 text-[#00AFFF] shrink-0" />
          <span className="text-white font-mono font-bold tracking-wider text-sm">{promo.code}</span>
          <span className="text-[#B3B6CB] text-sm">applied</span>
        </div>

        <div className="flex items-center justify-center gap-6 mb-8">
          <div>
            <p className="text-[#FF00C0] text-2xl font-bold">{promo.discountPercent}% OFF</p>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mt-1">With promo</p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <p className="text-white text-2xl font-bold font-mono">{mm}:{ss}</p>
            <div className="flex gap-3 text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">
              <span>minutes</span>
              <span>seconds</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClaim}
          className="w-full py-4 rounded-full bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-white font-bold text-lg transition-all hover:opacity-90 active:scale-95"
        >
          Claim {discountedPrice}/mo →
        </button>
        <p className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider mt-4">Was {originalPrice}/mo · Cancel anytime</p>
      </motion.div>
    </motion.div>
  );
}

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
  
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [claimModal, setClaimModal] = useState<{ tierId: string; tierName: string; originalPrice: string; discountedPrice: string } | null>(null);

  const tiers = [
    {
      name: 'Creator',
      tierId: 'creator',
      basePrice: '$20',
      period: '/mo',
      description: 'Perfect for hobbyists and weekend game jammers.',
      features: [
        'Unlocks code editor',
        'ZIP export',
        '100 credits / month',
        'Standard support',
      ],
      buttonText: user ? 'Upgrade to Creator' : 'Start Creating',
      highlighted: false,
    },
    {
      name: 'Pro',
      tierId: 'pro',
      basePrice: '$50',
      period: '/mo',
      description: 'For indie devs and serious worldbuilders.',
      features: [
        'Everything in Creator',
        'React / PWA export',
        'Commercial rights',
        'Bring Your Own Key (BYOK)',
        '500 credits / month',
      ],
      buttonText: user ? 'Upgrade to Pro' : 'Get Pro Access',
      highlighted: true,
    },
    {
      name: 'Studio',
      tierId: 'studio',
      basePrice: '$100',
      period: '/mo',
      description: 'For professional game studios and teams.',
      features: [
        'Everything in Pro',
        'Watermark removal',
        'Priority support',
        'Unlimited credits (fair use)',
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

  // 👇 FIXED: Reads directly from Firestore instead of broken backend API 👇
  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    
    setPromoLoading(true);
    setPromoError(null);
    setPromoApplied(null);
    
    try {
      const promoRef = doc(db, 'promoCodes', code);
      const promoSnap = await getDoc(promoRef);

      if (promoSnap.exists()) {
        const data = promoSnap.data();
        
        // Check if active and under usage limit
        if (data.active && data.usedCount < data.maxUses) {
          setPromoApplied({ code: promoSnap.id, discountPercent: data.discountPercent });
          setPromoInput('');
        } else {
          setPromoError('Promo code is expired or fully used.');
        }
      } else {
        setPromoError('Invalid promo code.');
      }
    } catch (err: any) {
      console.error("Promo error:", err);
      setPromoError('Could not validate code. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleUpgrade = (tierId: string) => {
    if (!user) { navigate('/app'); return; }

    if (promoApplied && TIER_PRICES[tierId]) {
      const tier = tiers.find(t => t.tierId === tierId)!;
      const discounted = applyDiscount(TIER_PRICES[tierId], promoApplied.discountPercent);
      setClaimModal({ tierId, tierName: tier.name, originalPrice: tier.basePrice, discountedPrice: discounted });
      return;
    }

    proceedToCheckout(tierId);
  };

  const proceedToCheckout = async (tierId: string) => {
    setClaimModal(null);
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
    <div className="min-h-screen bg-[#05050A] text-white font-sora selection:bg-[#FF00C0]/30 flex flex-col pt-24">
      <SEO title="Pricing - GameBot" description="Simple, transparent pricing for game developers." />
      
      <Navbar user={user} userProfile={userProfile} onLogout={onLogout} />

      <main className="flex-grow max-w-[1200px] mx-auto w-full px-6 pb-20">
        
        {/* Heading Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 space-y-6 pt-10"
        >
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-[#FF00C0]/30 text-[#FF00C0] text-[10px] font-bold uppercase tracking-[0.2em] mb-4 bg-[#FF00C0]/5 backdrop-blur-md">
            <Zap className="w-3.5 h-3.5" />
            <span>Unlock the Engine</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            Simple, <span className="bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-transparent bg-clip-text">Transparent</span> pricing
          </h1>
          <p className="text-[16px] text-[#B3B6CB] max-w-2xl mx-auto leading-relaxed">
            Start free with a 14-day trial. Upgrade when you need more power, exports and commercial rights.
          </p>
        </motion.div>

        {/* Checkout Error */}
        {checkoutError && (
          <div className="max-w-4xl mx-auto mb-8 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center font-medium">
            {checkoutError}
          </div>
        )}

        {/* Promo Code UI */}
        <div className="max-w-sm mx-auto mb-12 relative z-20">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Promo code" 
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              className="flex-1 bg-[#0A0A10] border border-white/10 rounded-full px-5 py-3 text-sm text-white focus:outline-none focus:border-[#FF00C0]/50 transition-colors uppercase"
            />
            <button 
              onClick={handleApplyPromo}
              disabled={promoLoading || !promoInput.trim()}
              className="px-6 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center min-w-[90px]"
            >
              {promoLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#FF00C0]" /> : 'Apply'}
            </button>
          </div>
          {promoError && <p className="text-red-400 text-xs mt-3 text-center">{promoError}</p>}
          {promoApplied && <p className="text-[#00AFFF] text-xs mt-3 text-center">Code <span className="font-bold">{promoApplied.code}</span> applied: {promoApplied.discountPercent}% OFF!</p>}
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto relative z-10">
          {/* Middle Card Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-[110%] bg-gradient-to-b from-[#FF00C0]/20 to-[#00AFFF]/20 blur-[100px] -z-10 pointer-events-none rounded-full" />

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
                className={`relative rounded-[32px] p-8 flex flex-col transition-all duration-300 hover:-translate-y-2 bg-[#0A0A10] ${
                  tier.highlighted
                    ? 'border border-white/20 shadow-[0_0_50px_rgba(255,0,192,0.15)] scale-[1.02] z-20'
                    : 'border border-white/5 hover:border-white/10 z-10'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#251A22] border border-[#FF00C0]/30 text-[#B3B6CB] text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-lg">
                    <Sparkles className="w-3 h-3 text-[#FF00C0]" /> Most Loved
                  </div>
                )}

                <div className="mb-6 pt-2">
                  <h3 className="text-2xl font-bold mb-2 text-white">{tier.name}</h3>
                  <p className="text-[13px] text-[#B3B6CB] h-10 leading-relaxed">{tier.description}</p>
                </div>

                <div className="mb-8">
                  {discountedPrice ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-white">{discountedPrice}</span>
                      <span className="text-zinc-500 font-medium text-sm">{tier.period}</span>
                      <span className="text-zinc-600 line-through text-xl ml-1">{tier.basePrice}</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-white">{tier.basePrice}</span>
                      <span className="text-[#B3B6CB] font-medium text-sm">{tier.period}</span>
                    </div>
                  )}
                  {discountedPrice && (
                    <p className="text-[#00AFFF] text-xs mt-2 font-medium">
                      {promoApplied!.discountPercent}% off with {promoApplied!.code}
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-[13px] text-white font-medium">
                      <div className="w-5 h-5 rounded-full border border-[#FF00C0]/50 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-[#FF00C0]" strokeWidth={3} />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {userProfile?.tier === tier.tierId ? (
                  <div className="w-full py-3.5 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 bg-[#FF00C0]/10 border border-[#FF00C0]/30 text-[#FF00C0] cursor-default">
                    <Check className="w-4 h-4" />
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier.tierId)}
                    disabled={loadingTier !== null}
                    className={`w-full py-3.5 rounded-full text-[14px] font-bold transition-all flex items-center justify-center gap-2 ${
                      tier.highlighted
                        ? 'bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] hover:opacity-90 text-white shadow-[0_0_20px_rgba(255,0,192,0.3)]'
                        : 'bg-transparent border border-white/10 hover:bg-white/5 text-[#B3B6CB] hover:text-white'
                    } disabled:opacity-70`}
                  >
                    {loadingTier === tier.tierId ? <Loader2 className="w-5 h-5 animate-spin text-[#FF00C0]" /> : tier.buttonText}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Top-ups Section */}
        {user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-32 max-w-4xl mx-auto"
          >
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Need more energy?</h2>
              <p className="text-[#B3B6CB] text-[16px]">Instantly top-up your core balance. Credits never expire.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {topups.map((topup, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                  key={topup.id}
                  className={`bg-[#0A0A10] rounded-[32px] p-6 text-center relative flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                    topup.popular
                      ? 'border border-[#FF00C0]/30 shadow-[0_0_30px_rgba(255,0,192,0.1)] scale-[1.02]'
                      : 'border border-white/5 hover:border-white/10'
                  }`}
                >
                  {topup.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#251A22] text-[#FF00C0] border border-[#FF00C0]/30 text-[10px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap shadow-lg">
                      Best Value
                    </div>
                  )}
                  
                  <div className="mt-4 mb-2">
                    <div className="text-4xl font-bold text-white mb-1 tracking-tight">{topup.credits}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Credits</div>
                  </div>
                  
                  <div className="text-2xl font-bold text-[#00AFFF] my-8">{topup.price}</div>

                  <button
                    onClick={() => handleUpgrade(topup.id)}
                    disabled={loadingTier !== null}
                    className="mt-auto w-full py-3.5 bg-transparent hover:bg-white/5 text-white text-[13px] font-bold rounded-full transition-colors flex items-center justify-center border border-white/10"
                  >
                    {loadingTier === topup.id ? <Loader2 className="w-4 h-4 animate-spin text-[#00AFFF]" /> : 'Acquire'}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* "Your idea + one prompt" Banner Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-32 max-w-5xl mx-auto"
        >
          <div className="relative rounded-[40px] bg-[#0A0A10] border border-white/5 p-10 md:p-14 overflow-hidden flex flex-col md:flex-row items-center gap-12 shadow-2xl">
            
            {/* Banner Background Glows */}
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#FF00C0]/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#00AFFF]/20 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="flex-1 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00AFFF]/10 text-[#00AFFF] text-[10px] font-bold uppercase tracking-wider mb-6">
                <Wand2 className="w-3 h-3" /> Build with words
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-[1.1]">
                Your idea + <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#00AFFF]">one prompt</span> =<br /> a real game.
              </h2>
              
              <p className="text-[#B3B6CB] text-[15px] leading-relaxed max-w-md mb-8">
                Describe the vibe. Pick the genre. Hit play. GameBot ships your idea in under a minute.
              </p>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/')}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-white text-[14px] font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_20px_rgba(255,0,192,0.4)]"
                >
                  <Sparkles className="w-4 h-4" /> Start creating
                </button>
                <button
                         onClick={() => navigate('/explore')}
                         className="px-6 py-3 rounded-full bg-black border border-white/10 text-white text-[14px] font-bold hover:border-[#FF00C0]/60 hover:shadow-[0_0_18px_rgba(255,0,192,0.35)] transition-all duration-200"
                       >
                  Explore games
                </button>
              </div>
            </div>

            {/* 👇 FIXED: Removed pink background (`bg-[#FF00C0]`) and changed to `bg-black` 👇 */}
            <div className="w-full md:w-[45%] aspect-[4/3] rounded-[24px] bg-black border border-white/10 relative z-10 shadow-[0_0_40px_rgba(0,175,255,0.2)] overflow-hidden">
              {isVideoPlaying ? (
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  // 👇 PASTE YOUR GOOGLE DRIVE FILE ID BELOW (from the share link: drive.google.com/file/d/FILE_ID/view) 👇
                  src="https://drive.google.com/file/d/PASTE_YOUR_DRIVE_FILE_ID_HERE/preview"
                  title="GameBot Demo Video"
                  frameBorder="0"
                  allow="autoplay"
                  allowFullScreen
                ></iframe>
              ) : (
                <div 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer group bg-black"
                  onClick={() => setIsVideoPlaying(true)}
                >
                  {/* Subtle background text so it isn't completely empty before you hover */}
                  <span className="absolute text-white/20 font-mono text-sm tracking-widest z-0">play demo</span>
                  
                  {/* The exact hover overlay design you requested */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 pointer-events-none">
                    <button className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF00C0] to-[#00AFFF] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,0,192,0.4)] pointer-events-auto">
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </motion.div>

      </main>

      <Footer />

      {/* Promo claim popup */}
      <AnimatePresence>
        {claimModal && promoApplied && (
          <PromoClaimModal
            promo={promoApplied}
            tierName={claimModal.tierName}
            originalPrice={claimModal.originalPrice}
            discountedPrice={claimModal.discountedPrice}
            onClaim={() => proceedToCheckout(claimModal.tierId)}
            onClose={() => setClaimModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}