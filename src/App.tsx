import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import MainApp from './MainApp';
import WelcomeScreen from './components/WelcomeScreen';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import Pricing from './components/Pricing';
import Settings from './components/Settings';

import Home from './pages/Home';
import Showcase from './pages/Showcase';
import PlayShowcaseGame from './pages/PlayShowcaseGame';
import About from './pages/About';
import Contact from './pages/Contact';
import UserProfilePage from './pages/UserProfile';
import Tutorials from './pages/Tutorials';
import AdminDashboard from './pages/AdminDashboard'; // <-- MOVED TO TOP

import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { UserProfile } from './services/db';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from './services/firebase';

// Add your admin emails here
const ADMIN_EMAILS = ['tests@mim.archis']; 

function AppRoutes() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  // Capture referral code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem('gb_referral', ref);
  }, []);

  useEffect(() => {
    let unsubscribeProfile: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken();
          const referralCode = localStorage.getItem('gb_referral');
          await fetch('/api/auth/profile', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ referralCode }),
          });
          localStorage.removeItem('gb_referral');
          
          unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
            }
          });
        } catch (error) {
          console.error("Error initializing user profile:", error);
        }
      } else {
        setUserProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
      }
      setLoading(false);
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Home user={user} userProfile={userProfile} onSignIn={() => setShowAuthModal(true)} />} />
        <Route path="/create" element={<Home user={user} userProfile={userProfile} onSignIn={() => setShowAuthModal(true)} />} />
        <Route path="/showcase" element={<Showcase user={user} />} />
        <Route path="/play/:id" element={<PlayShowcaseGame />} />
        <Route path="/profile/:uid" element={<UserProfilePage user={user} />} />
        <Route path="/tutorials" element={<Tutorials user={user} />} />
        <Route path="/about" element={<About user={user} />} />
        <Route path="/contact" element={<Contact user={user} />} />
        <Route path="/app" element={
          <MainAppWrapper 
            user={user} 
            userProfile={userProfile}
            onRequireAuth={() => setShowAuthModal(true)} 
            onLogout={handleLogout}
            onGoHome={() => navigate('/')}
          />
        } />
        <Route path="/dashboard" element={
          <Dashboard user={user} userProfile={userProfile} onLogout={handleLogout} />
        } />
        <Route path="/pricing" element={
          <Pricing user={user} userProfile={userProfile} onLogout={handleLogout} />
        } />
        <Route path="/settings" element={
          <Settings user={user} userProfile={userProfile} onLogout={handleLogout} />
        } />
        
        {/* SECURE ADMIN ROUTE */}
        <Route 
          path="/admin/*" 
          element={
            user && user.email && ADMIN_EMAILS.includes(user.email) ? (
              <AdminDashboard user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={() => setShowAuthModal(false)} 
        />
      )}
    </>
  );
}

function MainAppWrapper({ user, userProfile, onRequireAuth, onLogout, onGoHome }: any) {
  const location = useLocation();
  const initialPrompt = location.state?.initialPrompt || '';
  const initialAttachments = location.state?.initialAttachments || [];
  const loadGame = location.state?.loadGame || null;
  const isSpinOff = location.state?.isSpinOff || false;

  return (
    <MainApp
      initialPrompt={initialPrompt}
      initialAttachments={initialAttachments}
      loadGame={loadGame}
      isSpinOff={isSpinOff}
      user={user} 
      userProfile={userProfile}
      onRequireAuth={onRequireAuth} 
      onLogout={onLogout} 
      onGoHome={onGoHome} 
    />
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </HelmetProvider>
  );
}