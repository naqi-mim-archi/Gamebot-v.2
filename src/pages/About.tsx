import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function About({ user }: { user?: any }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30">
      <SEO title="About - Game Bot" description="Learn about the mission and team behind Game Bot." />
      <Navbar user={user} />
      
      <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-8 font-display">About Game Bot</h1>
          
          <div className="prose prose-invert prose-lg max-w-none">
            <p className="text-xl text-zinc-400 leading-relaxed mb-8">
              Game Bot is on a mission to democratize game development. We believe that everyone has a game idea inside them, but technical barriers often stand in the way.
            </p>
            
            <h2 className="text-2xl font-bold text-white mt-12 mb-4">Our Vision</h2>
            <p className="text-zinc-400 mb-6">
              We envision a world where creating a game is as easy as describing a dream. By leveraging advanced Large Language Models (LLMs) and a specialized game engine, we translate natural language into playable, interactive experiences in seconds.
            </p>
            
            <h2 className="text-2xl font-bold text-white mt-12 mb-4">The Technology</h2>
            <p className="text-zinc-400 mb-12">
              Under the hood, Game Bot uses a combination of generative AI for code synthesis and a robust runtime environment for immediate execution. We prioritize performance, security, and accessibility, ensuring that games built with Game Bot run smoothly on any device.
            </p>

            <h2 className="text-2xl font-bold text-white mt-12 mb-8">Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-1">Muhammad Naqi Ejaz</h3>
                <p className="text-emerald-400 text-sm mb-4 font-medium">Founder</p>
                <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                  Visionary leader and lead developer driving the technical roadmap and mission of Game Bot.
                </p>
                <a 
                  href="https://linkedin.com/in/naqiejaz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                >
                  LinkedIn Profile &rarr;
                </a>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-1">Misha Imran Taj</h3>
                <p className="text-emerald-400 text-sm mb-4 font-medium">Co-founder</p>
                <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                  Strategic partner focused on product growth, user experience, and community building.
                </p>
                <a 
                  href="https://linkedin.com/in/misha-imran-taj-65486a184" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                >
                  LinkedIn Profile &rarr;
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
}
