import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import MainApp from './MainApp';
import WelcomeScreen from './components/WelcomeScreen';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import Pricing from './components/Pricing';
import Settings from './components/Settings';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { UserProfile } from './services/db';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from './services/firebase';

import Home from './pages/Home';
import Showcase from './pages/Showcase';
import PlayShowcaseGame from './pages/PlayShowcaseGame';
import About from './pages/About';
import Contact from './pages/Contact';
import UserProfilePage from './pages/UserProfile';

function AppRoutes() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeProfile: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Profile creation is handled server-side (Admin SDK bypasses Firestore rules)
          const idToken = await currentUser.getIdToken();
          await fetch('/api/auth/profile', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
          });
          // Then subscribe to live profile updates from Firestore
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

  const handleStart = (prompt: string) => {
    navigate('/app', { state: { initialPrompt: prompt } });
  };

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

import { HelmetProvider } from 'react-helmet-async';

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </HelmetProvider>
  );
}
