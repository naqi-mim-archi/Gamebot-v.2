import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../services/db';
import { Coins, LogOut, LayoutDashboard, CreditCard, User, ChevronDown, ArrowLeft, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TopNavProps {
  user: any;
  userProfile: UserProfile | null;
  onLogin?: () => void;
  onLogout?: () => void;
  transparent?: boolean;
}

export default function TopNav({ user, userProfile, onLogin, onLogout, transparent = false }: TopNavProps) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const localCredits = parseInt(localStorage.getItem('local_credits') || '10');
  const displayCredits = user ? (userProfile?.credits || 0) : localCredits;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300 ${transparent ? 'bg-transparent' : 'bg-zinc-950/80 backdrop-blur-xl border-b border-white/5'}`}>
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden xs:inline font-medium text-sm">Back</span>
        </button>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <span className="text-zinc-950 font-bold text-lg">G</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white hidden xs:block font-display">GameBot</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Credits Badge */}
        <motion.div 
          key={displayCredits}
          initial={{ scale: 1.1, textShadow: '0 0 10px rgba(16,185,129,0.8)' }}
          animate={{ scale: 1, textShadow: '0 0 0px rgba(16,185,129,0)' }}
          className="flex items-center gap-2 bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-full shadow-inner backdrop-blur-md cursor-pointer hover:border-emerald-500/50 transition-colors"
          onClick={() => navigate('/pricing')}
        >
          <Coins className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-mono font-medium text-emerald-50">{displayCredits}</span>
        </motion.div>

        {/* User Menu */}
        {user ? (
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {(userProfile?.photoURL || user.photoURL) ? (
                <img src={userProfile?.photoURL || user.photoURL} alt="User" className="w-9 h-9 rounded-full border-2 border-white/10 object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center border-2 border-white/10 text-white font-bold shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                  {(userProfile?.displayName || user.displayName || user.email)?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2"
                >
                  <div className="px-4 py-3 border-b border-white/5 mb-2">
                    <p className="text-sm font-medium text-white truncate">{userProfile?.displayName || user.displayName || 'Developer'}</p>
                    <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                  </div>
                  
                  <button onClick={() => { setDropdownOpen(false); navigate('/dashboard'); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </button>
                  <button onClick={() => { setDropdownOpen(false); navigate('/pricing'); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors">
                    <CreditCard className="w-4 h-4" /> Billing & Plans
                  </button>
                  <button onClick={() => { setDropdownOpen(false); navigate('/settings'); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors">
                    <Settings className="w-4 h-4" /> Settings
                  </button>

                  <div className="h-px bg-white/5 my-2" />
                  
                  <button onClick={() => { setDropdownOpen(false); onLogout?.(); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors backdrop-blur-md border border-white/5 flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}
