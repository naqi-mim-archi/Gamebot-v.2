import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Settings as SettingsIcon,
  Check, ExternalLink, Unlink, AlertCircle,
  Camera, Eye, EyeOff, Loader2, Coins, Upload, Copy, Gift, ArrowLeft, Mail
} from 'lucide-react';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../services/db';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

// ── Types ────────────────────────────────────────────────────────────────────

interface SettingsProps {
  user: any;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

interface ConnectionCardProps {
  letter: string;
  colorClass: string;
  name: string;
  description: string;
  isConnected: boolean;
  connectedLabel: string;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function resizeImageToDataURL(file: File, maxPx = 256, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── ConnectionRow ───────────────────────────────────────────────────────────

function ConnectionRow({
  letter, colorClass, name, description, isConnected,
  connectedLabel, isLoading, onConnect, onDisconnect,
}: ConnectionCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 bg-[#0A0A10]/30 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] flex-shrink-0 text-black shadow-inner ${colorClass}`}>
          {letter}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-white mb-0.5">{name}</p>
          {isConnected ? (
            <p className="text-[12px] text-[#B3B6CB] truncate">{connectedLabel}</p>
          ) : (
            <p className="text-[12px] text-[#B3B6CB] truncate">{description}</p>
          )}
        </div>
      </div>
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isLoading}
        className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50 ${
          isConnected
            ? 'bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10'
            : 'bg-transparent border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
        }`}
      >
        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : isConnected ? <><Unlink className="w-3.5 h-3.5" />Disconnect</>
          : <><ExternalLink className="w-3.5 h-3.5" />Connect</>}
      </button>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────

export default function Settings({ user, userProfile, onLogout }: SettingsProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile
  const[displayName, setDisplayName] = useState(userProfile?.displayName || user?.displayName || '');
  const[avatarUrl, setAvatarUrl] = useState(userProfile?.photoURL || user?.photoURL || '');
  const[avatarPreview, setAvatarPreview] = useState(userProfile?.photoURL || user?.photoURL || '');

  useEffect(() => {
    if (userProfile?.photoURL) {
      setAvatarPreview(userProfile.photoURL);
      setAvatarUrl(userProfile.photoURL);
    }
    if (userProfile?.displayName) {
      setDisplayName(userProfile.displayName);
    }
  },[userProfile?.photoURL, userProfile?.displayName]);
  
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const[profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const[newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const[showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const[pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  // Connections
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [discordLoading, setDiscordLoading] = useState(false);
  const[steamLoading, setSteamLoading] = useState(false);
  const [rewardToast, setRewardToast] = useState<number | null>(null);

  const hasEmailProvider = user?.providerData?.some((p: any) => p.providerId === 'password');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const sendReset = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
    } catch {}
    finally { setResetLoading(false); }
  };

  const flash = (tokens: number) => {
    setRewardToast(tokens);
    setTimeout(() => setRewardToast(null), 3500);
  };

  // Fetch GitHub username
  useEffect(() => {
    if (userProfile?.githubToken) {
      fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${userProfile.githubToken}` } })
        .then(r => r.json()).then(d => setGithubUsername(d.login || null)).catch(() => setGithubUsername(null));
    } else {
      setGithubUsername(null);
    }
  }, [userProfile?.githubToken]);

  // OAuth popup messages
  useEffect(() => {
    const handle = async (e: MessageEvent) => {
      if (!user) return;
      if (e.data?.type === 'GITHUB_AUTH_SUCCESS') {
        try {
          const idToken = await user.getIdToken();
          const res = await fetch('/api/auth/github/token', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ githubToken: e.data.token }),
          });
          const d = await res.json();
          if (d.tokensAwarded > 0) flash(d.tokensAwarded);
        } finally { setGithubLoading(false); }
      }
      if (e.data?.type === 'DISCORD_AUTH_SUCCESS') {
        try {
          const idToken = await user.getIdToken();
          const res = await fetch('/api/profile/discord/connect', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ discordId: e.data.discordId, discordUsername: e.data.discordUsername, discordAvatar: e.data.discordAvatar || '', discordWebhookUrl: e.data.discordWebhookUrl || '' }),
          });
          const d = await res.json();
          if (d.tokensAwarded > 0) flash(d.tokensAwarded);
        } finally { setDiscordLoading(false); }
      }
      if (e.data?.type === 'STEAM_AUTH_SUCCESS') {
        try {
          const idToken = await user.getIdToken();
          const res = await fetch('/api/profile/steam/connect', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ steamId: e.data.steamId, steamUsername: e.data.steamUsername, steamAvatar: e.data.steamAvatar || '' }),
          });
          const d = await res.json();
          if (d.tokensAwarded > 0) flash(d.tokensAwarded);
        } finally { setSteamLoading(false); }
      }
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, [user]);

  // ── Avatar file upload ─────────────────────────────────────────────────────

  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setAvatarUploading(true);
    setProfileError('');
    try {
      const finalUrl = await resizeImageToDataURL(file, 256, 0.8);
      setAvatarPreview(finalUrl);
      setAvatarUrl(finalUrl);
      await updateDoc(doc(db, 'users', user.uid), { photoURL: finalUrl });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2500);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Save display name ──────────────────────────────────────────────────────

  const saveProfile = async () => {
    if (!displayName.trim()) return;
    setProfileLoading(true);
    setProfileError('');
    try {
      await updateProfile(auth.currentUser!, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2500);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setPwError('Minimum 6 characters.'); return; }
    setPwLoading(true); setPwError('');
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPassword);
      setPwSuccess(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 2500);
    } catch (err: any) {
      setPwError(err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
        ? 'Current password is incorrect.' : err.message);
    } finally {
      setPwLoading(false);
    }
  };

  // ── Popup helper ───────────────────────────────────────────────────────────

  const openPopup = (url: string, onClose?: () => void) => {
    const popup = window.open(url, '_blank', 'width=540,height=700,left=200,top=80');
    if (popup && onClose) {
      const t = setInterval(() => { if (popup.closed) { clearInterval(t); onClose(); } }, 500);
    }
  };

  const connectGitHub = async () => {
    setGithubLoading(true);
    try { const r = await fetch('/api/auth/github/url'); const { url } = await r.json(); openPopup(url, () => setGithubLoading(false)); }
    catch { setGithubLoading(false); }
  };
  const disconnectGitHub = async () => {
    await updateDoc(doc(db, 'users', user.uid), { githubToken: '' });
    setGithubUsername(null);
  };

  const connectDiscord = async () => {
    setDiscordLoading(true);
    try { const r = await fetch('/api/auth/discord/url'); const { url } = await r.json(); openPopup(url, () => setDiscordLoading(false)); }
    catch { setDiscordLoading(false); }
  };
  const disconnectDiscord = async () => {
    await updateDoc(doc(db, 'users', user.uid), { discordId: '', discordUsername: '', discordAvatar: '' });
  };

  const connectSteam = async () => {
    setSteamLoading(true);
    try { const r = await fetch('/api/auth/steam/url'); const { url } = await r.json(); openPopup(url, () => setSteamLoading(false)); }
    catch { setSteamLoading(false); }
  };
  const disconnectSteam = async () => {
    await updateDoc(doc(db, 'users', user.uid), { steamId: '', steamUsername: '', steamAvatar: '' });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-sora flex flex-col selection:bg-[#FF00C0]/30">
      <SEO title="Account Settings - GameBot" description="Manage your GameBot profile and linked accounts." />
      <Navbar user={user} userProfile={userProfile} onLogout={onLogout} />

      <main className="flex-grow pt-32 pb-20 px-6 max-w-[1200px] mx-auto w-full">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-[#FF00C0]" strokeWidth={2.5} /> Account Settings
          </h1>
        </motion.div>

        {/* Reward toast */}
        <AnimatePresence>
          {rewardToast !== null && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-8 flex items-center gap-3 bg-[#00AFFF]/10 border border-[#00AFFF]/30 rounded-2xl px-5 py-3.5 shadow-[0_0_20px_rgba(0,175,255,0.15)]"
            >
              <Coins className="w-5 h-5 text-[#00AFFF] shrink-0" />
              <p className="text-sm text-[#00AFFF] font-bold tracking-wide">+{rewardToast} tokens awarded for linking your account!</p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* ── LEFT COLUMN: PROFILE & SECURITY ── */}
          <div className="space-y-8">
            
            {/* Profile Card */}
            <div className="bg-[#0A0A10]/80 border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2.5">
                <User className="w-5 h-5 text-[#FF00C0]" strokeWidth={2.5} /> Profile Details
              </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                <div className="relative shrink-0">
                  <div
                    className="w-20 h-20 rounded-full overflow-hidden border border-white/10 cursor-pointer group shadow-[0_0_20px_rgba(255,0,192,0.15)]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer"
                        onError={() => setAvatarPreview('')} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#00AFFF] to-[#FF00C0] flex items-center justify-center text-white font-bold text-3xl">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      {avatarUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value = ''; }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B3B6CB] mb-1">Email Address</p>
                  <p className="text-sm text-white font-medium mb-1 truncate">{user?.email}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-[#00AFFF] hover:text-[#00AFFF]/80 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload new photo
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#B3B6CB]">
                  Display Name
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    autoComplete="off"
                    spellCheck="false"
                    className="flex-1 bg-black/50 border border-white/10 rounded-full px-5 py-2.5 text-[14px] font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF00C0]/50 transition-colors"
                  />
                  <button
                    onClick={saveProfile}
                    disabled={profileLoading || !displayName.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-white text-[13px] font-bold rounded-full transition-all disabled:opacity-50 hover:opacity-90 flex items-center justify-center min-w-[80px]"
                  >
                    {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : profileSuccess ? <Check className="w-4 h-4" strokeWidth={3} /> : 'Save'}
                  </button>
                </div>
                {profileError && (
                  <p className="text-sm text-red-400 mt-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{profileError}</p>
                )}
              </div>
            </div>

            {/* Password reset for Google/OAuth users */}
            {!hasEmailProvider && (
              <div className="bg-[#0A0A10]/80 border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5">
                  <Lock className="w-5 h-5 text-[#FF00C0]" strokeWidth={2.5} /> Security
                </h2>
                <p className="text-[13px] text-[#B3B6CB] leading-relaxed mb-6">
                  You signed in with Google. To set a password (e.g. to share account access), send a password reset email and the dreamy elves will help you add one.
                </p>
                {resetSent ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-[13px] font-bold bg-emerald-500/10 px-4 py-2.5 rounded-full w-fit">
                    <Check className="w-4 h-4" strokeWidth={3} /> Reset email sent to {user?.email}
                  </div>
                ) : (
                  <button
                    onClick={sendReset}
                    disabled={resetLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[12px] uppercase tracking-wide font-bold rounded-full transition-all disabled:opacity-50 w-fit"
                  >
                    {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Send Password Reset Email
                  </button>
                )}
              </div>
            )}

            {/* Password Card (email users only) */}
            {hasEmailProvider && (
              <div className="bg-[#0A0A10]/80 border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2.5">
                  <Lock className="w-5 h-5 text-[#FF00C0]" strokeWidth={2.5} /> Security
                </h2>
                <form onSubmit={changePassword} autoComplete="off" className="space-y-4">
                  <input type="text" name="prevent_autofill_email" id="prevent_autofill_email" className="hidden" defaultValue={user?.email || ''} />
                  
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      autoComplete="new-password"
                      className="w-full bg-black/50 border border-white/10 rounded-full px-5 py-2.5 pr-12 text-[14px] text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF00C0]/50 transition-colors"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-3 text-zinc-500 hover:text-white">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New password (min. 6 characters)"
                      autoComplete="new-password"
                      className="w-full bg-black/50 border border-white/10 rounded-full px-5 py-2.5 pr-12 text-[14px] text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF00C0]/50 transition-colors"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-3 text-zinc-500 hover:text-white">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className="w-full bg-black/50 border border-white/10 rounded-full px-5 py-2.5 text-[14px] text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF00C0]/50 transition-colors"
                  />
                  
                  {pwError && <p className="text-sm text-red-400 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{pwError}</p>}
                  
                  <button
                    type="submit"
                    disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                    className="w-full py-3 bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-white text-[13px] font-bold rounded-full transition-all disabled:opacity-50 hover:opacity-90 flex items-center justify-center gap-2 mt-4"
                  >
                    {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : pwSuccess ? <><Check className="w-4 h-4" strokeWidth={3} /> Updated Successfully</> : 'Update Password'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: CONNECTIONS ── */}
          <div className="space-y-8">
            <div className="bg-[#0A0A10]/80 border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                  <ExternalLink className="w-5 h-5 text-[#FF00C0]" strokeWidth={2.5} /> Linked Accounts
                </h2>
                <div className="px-3 py-1 rounded-full border border-[#FF00C0]/30 bg-[#FF00C0]/10 text-[#FF00C0] text-[9px] font-bold uppercase tracking-wider">
                  +20 Per Link
                </div>
              </div>
              
              <div className="border border-white/5 rounded-2xl overflow-hidden shadow-inner">
                <ConnectionRow 
                  letter="G" colorClass="bg-[#BEE5FD]" name="GitHub" 
                  description="@dreamer"
                  isConnected={!!userProfile?.githubToken} connectedLabel={githubUsername ? `@${githubUsername}` : 'Connected'}
                  isLoading={githubLoading} onConnect={connectGitHub} onDisconnect={disconnectGitHub} 
                />

                <ConnectionRow 
                  letter="D" colorClass="bg-[#E5D5FF]" name="Discord" 
                  description="Link Discord and share games"
                  isConnected={!!userProfile?.discordId} connectedLabel={userProfile?.discordUsername ? `@${userProfile.discordUsername}` : 'Connected'}
                  isLoading={discordLoading} onConnect={connectDiscord} onDisconnect={disconnectDiscord} 
                />

                <ConnectionRow 
                  letter="S" colorClass="bg-[#BEE5FD]" name="Steam" 
                  description="Use your Steam library as gallery"
                  isConnected={!!userProfile?.steamId} connectedLabel={userProfile?.steamUsername || 'Connected'}
                  isLoading={steamLoading} onConnect={connectSteam} onDisconnect={disconnectSteam} 
                />
              </div>
            </div>

            {/* ── Refer a Friend Card ── */}
            {user && (
              <div className="bg-[#0A0A10]/80 border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2.5">
                  <Gift className="w-5 h-5 text-[#FF00C0]" strokeWidth={2.5} /> Refer a Friend
                </h2>
                <p className="text-[13px] text-[#B3B6CB] mb-5">
                  Share your link — you both get <span className="text-[#FF00C0] font-bold">+50 credits</span> when they sign up.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-black/50 border border-white/10 rounded-full px-5 py-2.5 text-[13px] text-[#B3B6CB] truncate font-medium">
                    {`https://gamebot.studio/?ref=u_${user.uid.substring(0, 8)}...`}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?ref=${user.uid}`);
                    }}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-transparent hover:bg-[#FF00C0]/10 border border-[#FF00C0]/30 text-[#FF00C0] rounded-full text-[12px] font-bold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
              </div>
            )}
          </div>

        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
}