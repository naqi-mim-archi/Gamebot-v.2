import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Lock, Github, Settings as SettingsIcon,
  Check, ExternalLink, Unlink, AlertCircle,
  Camera, Eye, EyeOff, Loader2, Coins, Upload,
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
import TopNav from './TopNav';

// ── Brand icons ──────────────────────────────────────────────────────────────

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.011.045.021.062 2.053 1.508 4.041 2.423 5.993 3.029a.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.029.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}

function SteamIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" />
    </svg>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface SettingsProps {
  user: any;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

interface ConnectionCardProps {
  icon: React.ReactNode;
  name: string;
  color: string;
  description: string;
  isConnected: boolean;
  connectedLabel: string;
  connectedAvatar?: string;
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

// ── ConnectionCard ───────────────────────────────────────────────────────────

function ConnectionCard({
  icon, name, color, description, isConnected,
  connectedLabel, connectedAvatar, isLoading, onConnect, onDisconnect,
}: ConnectionCardProps) {
  return (
    <div className="bg-zinc-950/50 border border-white/5 hover:border-white/10 transition-colors rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white flex-shrink-0 shadow-lg`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-white">{name}</p>
        {isConnected ? (
          <div className="flex items-center gap-2 mt-1">
            {connectedAvatar && <img src={connectedAvatar} alt="" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />}
            <p className="text-sm text-emerald-400 truncate">{connectedLabel}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 mt-1 truncate">{description}</p>
        )}
      </div>
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0 disabled:opacity-50 ${
          isConnected
            ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400'
            : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400'
        }`}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" />
          : isConnected ? <><Unlink className="w-4 h-4" />Disconnect</>
          : <><ExternalLink className="w-4 h-4" />Connect</>}
      </button>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────

export default function Settings({ user, userProfile, onLogout }: SettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile
  const [displayName, setDisplayName] = useState(userProfile?.displayName || user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.photoURL || user?.photoURL || '');
  const [avatarPreview, setAvatarPreview] = useState(userProfile?.photoURL || user?.photoURL || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  // Connections
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [steamLoading, setSteamLoading] = useState(false);
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
      // Resize to base64 — save ONLY to Firestore (Firebase Auth rejects base64 photoURLs as too long)
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <TopNav user={user} userProfile={userProfile} onLogout={onLogout} />

      <div className="pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-emerald-400" /> Account Settings
            </h1>
          </motion.div>

          {/* Reward toast */}
          <AnimatePresence>
            {rewardToast !== null && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mb-6 flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-5 py-3"
              >
                <Coins className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-300 font-medium">+{rewardToast} tokens for connecting your account!</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* ── LEFT COLUMN: PROFILE & SECURITY ── */}
            <div className="space-y-6">
              
              {/* Profile Card */}
              <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 md:p-8">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" /> Profile Details
                </h2>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
                  <div className="relative shrink-0">
                    <div
                      className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 cursor-pointer group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer"
                          onError={() => setAvatarPreview('')} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-3xl">
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
                    <p className="text-sm text-zinc-500 mb-1">Email Address</p>
                    <p className="text-base text-zinc-300 truncate font-medium">{user?.email}</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      <Upload className="w-4 h-4" /> Upload new photo
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm text-zinc-500 flex items-center gap-1.5">
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
                      className="flex-1 bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <button
                      onClick={saveProfile}
                      disabled={profileLoading || !displayName.trim()}
                      className="px-6 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {profileLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : profileSuccess ? <Check className="w-5 h-5" /> : 'Save'}
                    </button>
                  </div>
                  {profileError && (
                    <p className="text-sm text-red-400 mt-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{profileError}</p>
                  )}
                </div>
              </div>

              {/* Password reset for Google/OAuth users */}
              {!hasEmailProvider && (
                <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 md:p-8">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-emerald-400" /> Security
                  </h2>
                  <p className="text-sm text-zinc-400 mb-4">
                    You signed in with Google. To set a password (e.g. to share account access), send a password reset email — Firebase will let you add one.
                  </p>
                  {resetSent ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                      <Check className="w-4 h-4" /> Reset email sent to {user?.email}
                    </div>
                  ) : (
                    <button
                      onClick={sendReset}
                      disabled={resetLoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      Send Password Reset Email
                    </button>
                  )}
                </div>
              )}

              {/* Password Card (email users only) */}
              {hasEmailProvider && (
                <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 md:p-8">
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-emerald-400" /> Security
                  </h2>
                  <form onSubmit={changePassword} autoComplete="off" className="space-y-4">
                    {/* Hidden inputs to prevent browsers from autofilling existing password inputs incorrectly */}
                    <input type="text" name="prevent_autofill_email" id="prevent_autofill_email" className="hidden" defaultValue={user?.email || ''} />
                    
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        autoComplete="new-password"
                        className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-200">
                        {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="New password (min. 6 characters)"
                        autoComplete="new-password"
                        className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-200">
                        {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    
                    {pwError && <p className="text-sm text-red-400 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{pwError}</p>}
                    
                    <button
                      type="submit"
                      disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                      className="w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2 mt-2"
                    >
                      {pwLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : pwSuccess ? <><Check className="w-5 h-5" />Updated Successfully</> : 'Update Password'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN: CONNECTIONS ── */}
            <div className="space-y-6">
              <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-emerald-400" /> Linked Accounts
                  </h2>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-semibold tracking-wide uppercase">+20 PER LINK</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <ConnectionCard 
                    icon={<Github className="w-6 h-6" />} name="GitHub" color="from-zinc-600 to-zinc-800"
                    description="Sync your games to GitHub repositories"
                    isConnected={!!userProfile?.githubToken} connectedLabel={githubUsername ? `@${githubUsername}` : 'Connected'}
                    isLoading={githubLoading} onConnect={connectGitHub} onDisconnect={disconnectGitHub} 
                  />

                  <ConnectionCard 
                    icon={<DiscordIcon />} name="Discord" color="from-indigo-600 to-violet-700"
                    description="Link Discord and share games to channels"
                    isConnected={!!userProfile?.discordId} connectedLabel={userProfile?.discordUsername ? `@${userProfile.discordUsername}` : 'Connected'}
                    connectedAvatar={userProfile?.discordAvatar} isLoading={discordLoading} onConnect={connectDiscord} onDisconnect={disconnectDiscord} 
                  />

                  <ConnectionCard 
                    icon={<SteamIcon />} name="Steam" color="from-sky-700 to-blue-900"
                    description="Use your Steam library as game inspiration"
                    isConnected={!!userProfile?.steamId} connectedLabel={userProfile?.steamUsername || 'Connected'}
                    connectedAvatar={userProfile?.steamAvatar} isLoading={steamLoading} onConnect={connectSteam} onDisconnect={disconnectSteam} 
                  />
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}