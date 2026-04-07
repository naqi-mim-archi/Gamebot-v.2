import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, Sparkles, Loader2, Zap } from 'lucide-react';
import TopNav from './TopNav';
import Navbar from './Navbar';
import Footer from './Footer';
import SEO from './SEO';
import { motion } from 'motion/react';

interface PricingProps {
  user?: any;
  userProfile?: any;
  onLogout?: () => void;
}

export default function Pricing({ user, userProfile, onLogout }: PricingProps) {
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const tiers = [
    {
      name: 'Creator',
      tierId: 'creator',
      price: '$20',
      period: '/mo',
      description: 'Perfect for hobbyists and game jammers.',
      features: [
        'Unlocks Code Editor',
        'ZIP Export',
        '100 Credits / month',
        'Standard Support'
      ],
      buttonText: user ? 'Upgrade to Creator' : 'Start Creating',
      highlighted: false
    },
    {
      name: 'Pro',
      tierId: 'pro',
      price: '$50',
      period: '/mo',
      description: 'For indie devs and serious creators.',
      features: [
        'Everything in Creator',
        'React/PWA Export',
        'Commercial Rights',
        'Bring Your Own Key (BYOK)',
        '500 Credits / month'
      ],
      buttonText: user ? 'Upgrade to Pro' : 'Get Pro Access',
      highlighted: true
    },
    {
      name: 'Studio',
      tierId: 'studio',
      price: '$100',
      period: '/mo',
      description: 'For professional game studios.',
      features: [
        'Everything in Pro',
        'Watermark Removal',
        'Priority Support',
        'Unlimited Credits (Fair Use)'
      ],
      buttonText: user ? 'Upgrade to Studio' : 'Contact Sales',
      highlighted: false
    }
  ];

  const topups = [
    { id: 'topup_10', credits: 100, price: '$10' },
    { id: 'topup_20', credits: 250, price: '$20', popular: true },
    { id: 'topup_40', credits: 600, price: '$40' },
    { id: 'topup_100', credits: 2000, price: '$100' },
  ];

  const handleUpgrade = async (tierId: string) => {
    if (!user) {
      navigate('/app');
      return;
    }

    setLoadingTier(tierId);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: tierId,
          userId: user.uid,
          email: user.email,
          returnUrl: window.location.origin + '/dashboard',
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to initiate checkout. Please check your configuration.');
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 relative overflow-hidden pt-[72px]">
      <SEO 
        title="Pricing - GameBot" 
        description="Simple, transparent pricing for game developers. Start for free and upgrade as you grow."
      />
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
      <div className="glow-orb glow-orb-violet w-[600px] h-[600px] top-[-200px] right-[-200px]"></div>
      <div className="glow-orb glow-orb-emerald w-[400px] h-[400px] bottom-[-100px] left-[-100px]"></div>

      {user ? (
        <TopNav user={user} userProfile={userProfile} onLogout={onLogout} />
      ) : (
        <Navbar />
      )}

      <main className="max-w-6xl mx-auto px-6 py-16 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-12"
        >
          <button onClick={() => navigate(-1)} className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Return</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-16 space-y-6"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (idx * 0.1) }}
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
              
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-5xl font-display font-bold text-white">{tier.price}</span>
                <span className="text-zinc-500 font-medium">{tier.period}</span>
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
                {loadingTier === tier.tierId ? <Loader2 className="w-5 h-5 animate-spin" /> : tier.buttonText}
              </button>
            </motion.div>
          ))}
        </div>
        
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
                  transition={{ delay: 0.7 + (idx * 0.1) }}
                  key={topup.id} 
                  className={`glass-panel rounded-3xl p-6 text-center relative flex flex-col transition-all duration-300 hover:-translate-y-1 ${topup.popular ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'hover:glass-panel-active'}`}
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
