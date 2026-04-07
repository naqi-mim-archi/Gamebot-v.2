import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { Mail, MessageSquare, Twitter } from 'lucide-react';

export default function Contact({ user }: { user?: any }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30">
      <SEO title="Contact - Game Bot" description="Get in touch with the Game Bot team." />
      <Navbar user={user} />
      
      <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-8 font-display">Get in Touch</h1>
          <p className="text-xl text-zinc-400 mb-12">
            Have questions, feedback, or partnership ideas? We'd love to hear from you.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a href="mailto:support@gamebot.studio" className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <Mail className="w-8 h-8 text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Email Support</h3>
              <p className="text-zinc-400">support@gamebot.studio</p>
            </a>
            
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 transition-colors group">
              <Twitter className="w-8 h-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Twitter / X</h3>
              <p className="text-zinc-500 italic">Coming Soon</p>
            </div>
            
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 transition-colors group md:col-span-2">
              <MessageSquare className="w-8 h-8 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Community Discord</h3>
              <p className="text-zinc-400 mb-4">Join our community of creators to share your games and get help.</p>
              <p className="text-zinc-500 italic">Coming Soon</p>
            </div>
          </div>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
}
