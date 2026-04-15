import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight, Zap, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  user?: any;
  onSignIn?: () => void;
}

export default function Navbar({ user, onSignIn }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Create', path: '/' },
    { name: 'Showcase', path: '/showcase' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const handleSignIn = (e: React.MouseEvent) => {
    if (onSignIn) {
      e.preventDefault();
      onSignIn();
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300">
            <span className="text-zinc-950 font-bold text-xl">G</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-display">GameBot</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.name}
              to={link.path}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.path 
                  ? 'text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <Link 
              to="/dashboard" 
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Dashboard
            </Link>
          ) : (
            <Link 
              to="/app" 
              onClick={handleSignIn}
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Sign In
            </Link>
          )}
          
          <Link 
            to="/app" 
            className="px-5 py-2.5 bg-white text-zinc-950 text-sm font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            <Zap className="w-4 h-4 fill-zinc-950" />
            <span>{user ? 'Open App' : 'Launch App'}</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-zinc-400 hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-zinc-950 border-b border-white/5 overflow-hidden"
          >
            <div className="px-6 py-8 flex flex-col gap-6">
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
              <div className="h-px bg-white/5 my-2" />
              
              {user ? (
                <Link 
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-medium text-zinc-300 hover:text-white flex items-center gap-2"
                >
                  <User className="w-5 h-5" />
                  Dashboard
                </Link>
              ) : (
                <Link 
                  to="/app"
                  onClick={handleSignIn}
                  className="text-lg font-medium text-zinc-300 hover:text-white flex items-center gap-2"
                >
                  <User className="w-5 h-5" />
                  Sign In
                </Link>
              )}
              
              <Link 
                to="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 bg-white text-zinc-950 text-center font-bold rounded-xl hover:bg-zinc-200 transition-colors"
              >
                {user ? 'Open App' : 'Launch App'}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
