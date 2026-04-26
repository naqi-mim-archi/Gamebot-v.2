import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { Mail } from 'lucide-react';

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

const DISCORD_CHANNEL_URL = 'https://discord.com/channels/1488121029804167178/1488121029804167181';

export default function Contact({ user, userProfile, onLogout }: { user?: any, userProfile?: any, onLogout?: () => void }) {
  return (
    <div className="min-h-screen bg-[#05050A] text-white selection:bg-[#FF00C0]/30 font-sora flex flex-col">
      <SEO title="Contact - Game Bot" description="Get in touch with the Game Bot team." />
      <Navbar user={user} userProfile={userProfile} onLogout={onLogout} />
      
      {/* flex-grow ensures footer stays at bottom */}
      <div className="flex-grow pt-32 pb-20 px-6 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          {/* Centered Heading with gradient on 'Touch' */}
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight text-center">
            Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF00C0] to-[#00AFFF]">Touch</span>
          </h1>
          
          {/* Centered Subtitle */}
          <p className="text-lg md:text-xl text-[#B3B6CB] mb-12 text-center max-w-2xl">
            Have questions, feedback, or partnership ideas? We'd love to hear from you.
          </p>
          
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            
  {/* Email Support */}
<a 
  href="mailto:support@gamebot.studio"
  className="p-8 rounded-[24px] bg-[#0A0A10]/50 border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all group text-left flex flex-col cursor-pointer"
>
  <Mail className="w-6 h-6 text-[#FF00C0] mb-6 group-hover:scale-110 transition-transform" strokeWidth={2} />
  <h3 className="text-xl font-bold mb-2 text-white">Email Support</h3>
  <p className="text-[#B3B6CB] text-sm">support@gamebot.studio</p>
</a> 
            {/* Youtube */}
            <div className="p-8 rounded-[24px] bg-[#0A0A10]/50 border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all group text-left flex flex-col cursor-default">
              <YoutubeIcon className="w-6 h-6 text-[#FF00C0] mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2 text-white">Youtube</h3>
              <p className="text-zinc-500 text-sm italic mt-auto">Coming Soon</p>
            </div>
            
            {/* Community Discord */}
            <a 
              href={DISCORD_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-8 rounded-[24px] bg-[#0A0A10]/50 border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all group md:col-span-2 text-left flex flex-col"
            >
              <DiscordIcon className="w-6 h-6 text-[#FF00C0] mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2 text-white">Community Discord</h3>
              <p className="text-[#B3B6CB] text-sm mb-4 max-w-md">
                Join our community of creators to share your games and get help.
              </p>
              <p className="text-[#00AFFF] font-medium text-sm mt-auto group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Join the server &rarr;
              </p>
            </a>
          </div>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
}