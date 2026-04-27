import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthModalContext } from '../App';
import { 
  Menu, 
  X, 
  Sparkles, 
  ChevronDown, 
  LayoutDashboard, 
  User, 
  Link as LinkIcon, 
  Settings, 
  LogOut, 
  Coins 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  user?: any; // Firebase auth user
  userProfile?: any; // Database user profile (contains credits, tier, etc.)
  onSignIn?: () => void;
  onSignOut?: () => void; // Provided for compatibility
  onLogout?: () => void; // Matches the Dashboard code's prop name
}

const DISCORD_CHANNEL_URL = 'https://discord.com/channels/1488121029804167178/1488121029804167181';

const DiscordIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
  </svg>
);

export default function Navbar({ user, userProfile, onSignIn, onSignOut, onLogout }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const[dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const authCtx = useContext(AuthModalContext);

  // Always resolve to a working function — prop takes priority, context is fallback
  const handleSignInFn = onSignIn ?? authCtx.openSignIn;
  const handleLogoutFn = onLogout ?? onSignOut ?? authCtx.handleLogout;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  },[]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks =[
    { name: 'Explore', path: '/explore' },
    { name: 'Tutorials', path: '/tutorials' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Contact', path: '/contact' },
  ];

  const handleSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSignInFn();
    setMobileMenuOpen(false);
  };

  const handleGoHome = () => {
    setMobileMenuOpen(false);
  };

  // Profile data parsing
  const userEmail = userProfile?.email || user?.email || 'user@example.com';
  const userName = userProfile?.displayName || userProfile?.name || user?.displayName || user?.name || '';
  const userAvatar = userProfile?.photoURL || user?.photoURL || user?.avatar;
  const userInitial = userName.trim().charAt(0).toUpperCase() || userEmail.charAt(0).toUpperCase() || 'U';
  
  // Real dynamic tokens matching exact TopNav logic
  const localCredits = parseInt(localStorage.getItem('local_credits') || '10');
  const displayCredits = user ? (userProfile?.credits || 0) : localCredits;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 font-sora transition-all duration-300 ${
        scrolled
          ? 'bg-[#05050A]/90 backdrop-blur-xl border-b border-white/5 py-3'
          : 'bg-[#05050A] py-4'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link to="/" onClick={handleGoHome} className="flex items-center">
            {/* Increased Logo Size */}
            <img
              src="/g_icon.svg"
              alt="GameBot Studio"
              className="h-9 w-9 object-contain shrink-0"
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-[13px] font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-[#ff00c8]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Decreased distance using gap-2.5 tightly grouped */}
        <div className="hidden md:flex items-center gap-2.5">
          {!user ? (
            <>
              {/* Discord Button turns pink and glows on hover */}
              <a
                href={DISCORD_CHANNEL_URL}
                target="_blank"
                rel="noreferrer"
                className="text-white hover:text-[#ff00c8] hover:drop-shadow-[0_0_10px_rgba(255,0,200,0.8)] transition-all flex items-center justify-center p-1"
                aria-label="Open Discord channel"
              >
                <DiscordIcon className="w-[22px] h-[22px]" />
              </a>

              <button
                onClick={handleSignIn}
                className="px-5 py-2 rounded-full border border-white/20 text-white text-[13px] font-medium hover:bg-white/10 transition-colors"
              >
                Sign in
              </button>

              <Link
                to="/"
                onClick={handleGoHome}
                className="px-5 py-2 bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-black text-[13px] font-semibold rounded-full hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_15px_rgba(255,0,192,0.3)]"
              >
                <Sparkles size={16} strokeWidth={2.5} />
                <span>Create</span>
              </Link>
            </>
          ) : (
            <>
              {/* Discord Button turns pink and glows on hover */}
              <a
                href={DISCORD_CHANNEL_URL}
                target="_blank"
                rel="noreferrer"
                className="text-white hover:text-[#ff00c8] hover:drop-shadow-[0_0_10px_rgba(255,0,200,0.8)] transition-all flex items-center justify-center p-1"
                aria-label="Open Discord channel"
              >
                <DiscordIcon className="w-[22px] h-[22px]" />
              </a>

              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-full border border-white/15 bg-white/5 text-white text-[13px] font-medium transition-all hover:bg-[#ff00c8]/15 hover:text-[#ff00c8] hover:border-[#ff00c8]/50"
              >
                Dashboard
              </Link>

              {/* Glowing Tokens Display linked dynamically */}
              <Link
                to="/pricing"
                className="px-4 py-2 rounded-full border border-white/15 bg-[#0b0b16] text-white text-[13px] font-medium flex items-center gap-2 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,0,200,0.5)] hover:border-[#ff00c8]/50"
              >
                <Coins size={14} className="text-[#ff00c8]" />
                <span>{displayCredits.toLocaleString()}</span>
              </Link>

              <Link
                to="/"
                onClick={handleGoHome}
                className="px-5 py-2 bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-black text-[13px] font-semibold rounded-full hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_15px_rgba(255,0,192,0.3)]"
              >
                <Sparkles size={16} strokeWidth={2.5} />
                <span>Create</span>
              </Link>

              {/* User Dropdown Profile */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-white/5 transition-colors"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#ff00c8] to-[#7c3aed] text-white text-sm font-semibold flex items-center justify-center overflow-hidden shadow-[0_0_10px_rgba(255,0,200,0.2)]">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName || 'User'}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      userInitial
                    )}
                  </div>
                  <ChevronDown size={14} className="text-zinc-400" />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      // Strong Pink Glow applied to the dropdown container
                      className="absolute right-0 mt-3 w-60 bg-[#0E0E14] border border-[#ff00c8]/40 rounded-2xl shadow-[0_0_40px_rgba(255,0,200,0.4)] flex flex-col py-2 z-50 overflow-hidden"
                    >
                      <div className="px-5 py-3 mb-1">
                        <p className="text-[16px] font-bold text-white tracking-wide leading-tight">You</p>
                        <p className="text-[13px] text-zinc-500 truncate mt-0.5">{userEmail}</p>
                      </div>

                      <div className="flex flex-col py-1">
                        <Link to="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3.5 px-5 py-2.5 hover:bg-white/5 text-[14.5px] text-zinc-200 hover:text-white transition-colors">
                          <LayoutDashboard size={18} className="text-[#00AFFF]" />
                          Dashboard
                        </Link>
                        
                        <Link to={`/profile/${user?.uid || ''}`} onClick={() => setDropdownOpen(false)} className="flex items-center gap-3.5 px-5 py-2.5 hover:bg-white/5 text-[14.5px] text-zinc-200 hover:text-white transition-colors">
                          <User size={18} className="text-[#00AFFF]" />
                          Public Profile
                        </Link>
                        
                        {/* Properly routing to /pricing to match the actual billing page route */}
                        <Link to="/pricing" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3.5 px-5 py-2.5 hover:bg-white/5 text-[14.5px] text-zinc-200 hover:text-white transition-colors">
                          <LinkIcon size={18} className="text-[#00AFFF]" />
                          Billing & Plans
                        </Link>
                        
                        <Link to="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3.5 px-5 py-2.5 hover:bg-white/5 text-[14.5px] text-zinc-200 hover:text-white transition-colors">
                          <Settings size={18} className="text-[#00AFFF]" />
                          Settings
                        </Link>
                      </div>

                      <div className="h-px bg-white/10 my-2 mx-4" />

                      <div className="py-1">
                        {/* Sign Out properly wired up using direct inline function */}
                        <button 
                          onClick={() => {
                            setDropdownOpen(false);
                            handleLogoutFn();
                          }} 
                          className="w-full flex items-center gap-3.5 px-5 py-2.5 hover:bg-white/5 text-[14.5px] text-zinc-300 hover:text-[#ff00c8] transition-colors text-left group"
                        >
                          <LogOut size={18} className="text-zinc-500 group-hover:text-[#ff00c8] transition-colors" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 text-zinc-400 hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#05050A] border-b border-white/5 overflow-hidden"
          >
            <div className="px-6 py-8 flex flex-col gap-6">
              <Link to="/" onClick={handleGoHome} className="w-fit">
                <img
                  src="/g_icon.svg"
                  alt="GameBot Studio"
                  className="h-9 w-9 object-contain"
                />
              </Link>

              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-medium text-zinc-300 hover:text-white"
                >
                  {link.name}
                </Link>
              ))}

              <div className="h-px bg-white/10 my-2" />

              {!user ? (
                <>
                  <a
                    href={DISCORD_CHANNEL_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 text-zinc-300 hover:text-[#ff00c8] text-base font-medium transition-colors"
                  >
                    <DiscordIcon />
                    Join Discord
                  </a>

                  <button
                    onClick={handleSignIn}
                    className="w-full py-3 rounded-full border border-white/20 text-white font-medium"
                  >
                    Sign in
                  </button>

                  <Link
                    to="/"
                    onClick={handleGoHome}
                    className="w-full py-3 bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-black text-center font-semibold rounded-full flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18} strokeWidth={2.5} />
                    Create
                  </Link>
                </>
              ) : (
                <>
                  <a
                    href={DISCORD_CHANNEL_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 text-zinc-300 hover:text-[#ff00c8] text-base font-medium transition-colors"
                  >
                    <DiscordIcon />
                    Join Discord
                  </a>

                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-3 rounded-full border border-white/20 text-white text-center font-medium hover:bg-[#ff00c8]/10 hover:text-[#ff00c8] hover:border-[#ff00c8]/50 transition-colors"
                  >
                    Dashboard
                  </Link>

                  <Link
                    to="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-3 rounded-full border border-white/15 bg-[#0b0b16] text-white flex items-center justify-center font-medium gap-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,0,200,0.5)] hover:border-[#ff00c8]/50 cursor-pointer"
                  >
                    <Coins size={16} className="text-[#ff00c8]" />
                    <span>{displayCredits.toLocaleString()}</span>
                  </Link>

                  <Link
                    to="/"
                    onClick={handleGoHome}
                    className="w-full py-3 bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-black text-center font-semibold rounded-full flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18} strokeWidth={2.5} />
                    Create
                  </Link>

                  <button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogoutFn();
                    }} 
                    className="w-full py-3 text-zinc-400 hover:text-white flex items-center justify-center gap-2 font-medium"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}