import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Code, Zap, Globe, Shield, Play, Terminal, Smartphone } from 'lucide-react';
import SEO from '../components/SEO';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import HomePromptInput from '../components/HomePromptInput';

interface HomeProps {
  user?: any;
  userProfile?: any;
  onSignIn?: () => void;
}

export default function Home({ user, userProfile, onSignIn }: HomeProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30">
      <SEO 
        title="Game Bot | Build Browser Games with AI in Seconds"
        description="Create, play, and share browser games instantly using AI. No coding required. Turn your ideas into playable reality with Game Bot."
      />

      <Navbar user={user} onSignIn={onSignIn} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden min-h-[90vh] flex flex-col justify-center">
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/80 z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-[#050505] z-10"></div>
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover opacity-40"
            poster="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop"
          >
            <source src="https://assets.mixkit.co/videos/preview/mixkit-matrix-style-binary-code-falling-down-18368-large.mp4" type="video/mp4" />
          </video>
        </div>
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none z-10"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-20 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-emerald-400 mb-8 backdrop-blur-md">
              <Sparkles className="w-4 h-4" />
              <span>v2.0 is now live</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 font-display">
              Turn Ideas into <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Playable Reality</span>
            </h1>
            
            <p className="text-xl text-zinc-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Describe your dream game, and our AI engine builds it in seconds. 
              Physics, logic, and graphics included. No coding required.
            </p>
            
            {/* Prompt Input Area */}
            <div className="mb-16">
              <HomePromptInput userProfile={userProfile} />
            </div>
          </motion.div>

          {/* Hero Visual/Demo Placeholder */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mx-auto max-w-6xl flex flex-col md:flex-row items-end justify-center gap-4 md:-mb-32 perspective-1000"
          >
            {/* Desktop Mockup */}
            <div className="w-full md:w-3/4 aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center group cursor-pointer relative z-10 transform transition-transform hover:scale-[1.01] duration-500">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
              
              {/* Fake UI Elements */}
              <div className="absolute top-0 left-0 right-0 h-10 bg-zinc-950/90 border-b border-white/5 flex items-center px-4 gap-2 z-20">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
                <div className="ml-4 px-3 py-0.5 rounded-md bg-zinc-900 border border-white/5 text-[10px] text-zinc-500 font-mono flex-1 text-center">
                  game-bot-preview.html
                </div>
              </div>

              <Play className="w-16 h-16 text-white opacity-80 group-hover:scale-110 transition-transform z-30 drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]" />
              
              <div className="absolute bottom-6 left-6 z-30 text-left">
                <div className="text-xs font-mono text-emerald-400 mb-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  WATCH DEMO
                </div>
                <div className="text-xl font-bold">Building a Platformer in 45 Seconds</div>
              </div>
              
              <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                 <div className="text-zinc-800 font-display text-8xl font-bold opacity-20 select-none">DESKTOP</div>
              </div> 
            </div>

            {/* Mobile Mockup */}
            <div className="hidden md:block w-[280px] h-[560px] rounded-[2.5rem] border-[8px] border-zinc-900 bg-zinc-950 shadow-2xl relative z-20 -ml-12 mb-8 transform rotate-3 hover:rotate-0 transition-transform duration-500 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-xl z-30"></div>
              <div className="w-full h-full bg-zinc-900 relative">
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-zinc-800 font-display text-4xl font-bold opacity-20 select-none rotate-90">MOBILE</div>
                 </div>
                 <div className="absolute bottom-8 left-0 right-0 px-6 text-center z-30">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs text-white">
                      <Smartphone className="w-3 h-3" />
                      <span>Mobile Ready</span>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-zinc-950 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-display">Everything you need to ship</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
              From rapid prototyping to polished deployment, Game Bot handles the heavy lifting.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-6 h-6 text-yellow-400" />,
                title: "Instant Generation",
                desc: "Our LLM engine understands game mechanics, physics, and 'juice' to generate playable code in seconds."
              },
              {
                icon: <Code className="w-6 h-6 text-blue-400" />,
                title: "Full Source Access",
                desc: "Don't get locked in. Export clean, readable HTML5/Canvas code. It's your IP to keep."
              },
              {
                icon: <Globe className="w-6 h-6 text-purple-400" />,
                title: "One-Click Deploy",
                desc: "Share your creation with a unique URL instantly. Multiplayer support coming soon."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors hover:-translate-y-1 duration-300">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 font-display">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Social Proof */}
      <section className="py-20 border-y border-white/5 bg-black relative z-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-mono text-zinc-500 mb-8 uppercase tracking-widest">Trusted by creative developers at</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Placeholders for logos */}
            <div className="text-2xl font-bold font-display">ACME Corp</div>
            <div className="text-2xl font-bold font-display">GlobalTech</div>
            <div className="text-2xl font-bold font-display">IndieStudio</div>
            <div className="text-2xl font-bold font-display">GameJam</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-emerald-900/10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 font-display">Ready to build your dream game?</h2>
          <p className="text-xl text-zinc-300 mb-10 max-w-2xl mx-auto">
            Join thousands of creators turning imagination into interaction.
          </p>
          <Link 
            to="/app" 
            className="inline-flex px-8 py-4 bg-emerald-500 text-black rounded-xl font-bold text-lg hover:bg-emerald-400 transition-colors shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] hover:-translate-y-1"
          >
            Start Creating Now
          </Link>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
