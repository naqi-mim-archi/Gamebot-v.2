import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

// ── Global auth modal context ──────────────────────────────────────────────────
export const AuthModalContext = createContext<{ openSignIn: () => void; handleLogout: () => void }>({
  openSignIn: () => {},
  handleLogout: () => {},
});

// ── Scroll to top on every route change ────────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}
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
import AdminDashboard from './pages/AdminDashboard'; 
import TermsConditions from './pages/TermsConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AllCreators from './pages/AllCreators';
import TrendingGames from './pages/TrendingGames';

import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { UserProfile } from './services/db';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from './services/firebase';

// Add your admin emails here
const ADMIN_EMAILS = ['tests@mim.archis']; 

function AppRoutes() {
  const [user, setUser] = useState<any>(null);
  const[userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  // Capture referral code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem('gb_referral', ref);
  },[]);

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
  },[]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  // ✅ THIS IS THE FIXED LOADER EXACTLY LIKE DASHBOARD
  if (loading) {
    return (
      <div className="min-h-screen bg-[#05050A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FF00C0]/30 border-t-[#FF00C0] rounded-full animate-spin shadow-[0_0_15px_rgba(255,0,192,0.5)]" />
      </div>
    );
  }

  return (
    <AuthModalContext.Provider value={{ openSignIn: () => setShowAuthModal(true), handleLogout }}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home user={user} userProfile={userProfile} onSignIn={() => setShowAuthModal(true)} onLogout={handleLogout} />} />
        <Route path="/explore" element={<Showcase user={user} userProfile={userProfile} onLogout={handleLogout} />} />
        <Route path="/creators" element={<AllCreators user={user} userProfile={userProfile} onLogout={handleLogout} />} />
        <Route path="/trending" element={<TrendingGames user={user} userProfile={userProfile} onLogout={handleLogout} />} />
        <Route path="/play/:id" element={<PlayShowcaseGame />} />
        <Route path="/profile/:uid"  element={<UserProfilePage user={user} userProfile={userProfile} onLogout={handleLogout} /> } />
        <Route 
        path="/tutorials" 
        element={<Tutorials user={user} userProfile={userProfile} onLogout={handleLogout} />} 
        />
        <Route path="/about" element={<About user={user} />} />
        {/* ✅ Pass the exact same props to Contact */}
<Route 
  path="/contact" 
  element={<Contact user={user} userProfile={userProfile} onLogout={handleLogout} />} 
/>
        
        {/* FIXED ROUTES: Pointing to their actual components */}
        <Route path="/terms" element={<TermsConditions user={user} userProfile={userProfile} onLogout={handleLogout} />} />
        <Route path="/privacy" element={<PrivacyPolicy user={user} userProfile={userProfile} onLogout={handleLogout} />} />
        
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
    </AuthModalContext.Provider>
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