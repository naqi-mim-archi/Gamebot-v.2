import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, getAdditionalUserInfo } from 'firebase/auth';

interface AuthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendWelcomeEmail = async (userEmail: string, userName: string) => {
    try {
      await fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, name: userName }),
      });
    } catch (err) {
      console.error('Failed to send welcome email:', err);
    }
  };

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleSuccess = () => {
    if (typeof onSuccess === 'function') {
      onSuccess();
    } else {
      handleClose(); // Fallback: just close it if onSuccess isn't provided
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      const additionalInfo = getAdditionalUserInfo(result);
      
      if (additionalInfo?.isNewUser && result.user.email) {
        await sendWelcomeEmail(result.user.email, result.user.displayName || 'Player');
      }
      
      handleSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false); // Stop loading circle on error
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      if (!isLogin && password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (result.user.email) {
          await sendWelcomeEmail(result.user.email, 'Player');
        }
      }
      
      handleSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false); // Stop loading circle on error
    } 
  };

  return (
    <div 
      className="fixed inset-0 bg-[#05050A]/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 font-sora"
      onClick={handleClose} // Clicking outside the modal closes it
    >
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(10, 10, 16, 0.8) inset !important;
          -webkit-text-fill-color: white !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <div 
        className="relative w-full max-w-[420px] rounded-[32px] p-8 overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()} // Clicking inside the modal DOES NOT close it
        style={{
          backgroundColor: '#17182DCC', 
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          boxShadow: '0px 18px 60px -18px rgba(255, 0, 192, 0.55), 0px 0px 0px 1px rgba(255, 0, 192, 0.35)'
        }}
      >
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#00AFFF]/20 blur-[70px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#FF00C0]/20 blur-[70px] pointer-events-none -z-10"></div>

        {/* X Close Button */}
        <button 
          onClick={handleClose} 
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors text-[#B3B6CB] hover:text-white border border-white/5 z-50"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="mb-8 pr-8">
          <h2 className="text-[28px] leading-tight font-bold text-white mb-2 tracking-tight">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-[#B3B6CB] text-[14px]">
            {isLogin 
              ? 'Welcome back, dreamer. Pick up where you left off.' 
              : 'Join the creation engine. Start building today.'}
          </p>
        </div>
        
        <div className="space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-[#F8F6EF] text-[#0A0A0A] hover:bg-white py-3.5 rounded-full font-semibold transition-colors disabled:opacity-50"
          >
            <div className="w-5 h-5 bg-[#0A0A0A] rounded-full flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">G</span>
            </div>
            Continue with Google
          </button>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/5"></div>
            <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#B3B6CB]">
              Or continue with email
            </span>
            <div className="h-px flex-1 bg-white/5"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#B3B6CB] ml-1">Email</label>
              <div className="relative">
                <Mail className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 text-[#B3B6CB]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#0A0A10]/50 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-[14px] text-white placeholder-[#B3B6CB]/50 focus:outline-none focus:border-[#FF00C0]/50 focus:ring-1 focus:ring-[#FF00C0]/50 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#B3B6CB] ml-1">Password</label>
              <div className="relative">
                <Lock className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 text-[#B3B6CB]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#0A0A10]/50 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-[14px] text-white placeholder-[#B3B6CB]/50 focus:outline-none focus:border-[#FF00C0]/50 focus:ring-1 focus:ring-[#FF00C0]/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#B3B6CB] ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 text-[#B3B6CB]" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-[#0A0A10]/50 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-[14px] text-white placeholder-[#B3B6CB]/50 focus:outline-none focus:border-[#FF00C0]/50 focus:ring-1 focus:ring-[#FF00C0]/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-black py-3.5 rounded-full font-bold text-[15px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 shadow-[0_0_20px_rgba(255,0,192,0.2)]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : isLogin ? (
                <><LogIn className="w-[18px] h-[18px]" /> Sign In</>
              ) : (
                <><UserPlus className="w-[18px] h-[18px]" /> Create Account</>
              )}
            </button>
          </form>

          <div className="text-center text-[13px] text-[#B3B6CB] pt-2 relative z-10">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-white hover:text-[#FF00C0] font-semibold transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}