import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5 bg-zinc-950 text-sm text-zinc-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <span className="text-zinc-950 font-bold text-lg">G</span>
          </div>
          <span className="text-white font-bold font-display text-lg">GameBot</span>
        </div>
        <div className="flex gap-8">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <Link to="/showcase" className="hover:text-white transition-colors">Showcase</Link>
          <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          {/* <Link to="/blog" className="hover:text-white transition-colors">Blog</Link> */}
        </div>
        <div>
          &copy; {new Date().getFullYear()} Game Bot Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
