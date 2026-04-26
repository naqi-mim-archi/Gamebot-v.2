import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Youtube } from 'lucide-react';

const DISCORD_CHANNEL_URL = 'https://discord.com/channels/1488121029804167178/1488121029804167181';
const YOUTUBE_URL = 'https://youtube.com'; // Add your actual YouTube link here

const DiscordIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-[#05050A] border-t border-[#FF00C0]/20 pt-20 pb-10 font-sora">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-20">
          
          {/* Brand & CTA */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <img 
                src="/g_logo2.svg" 
                alt="GameBot Studio" 
                className="h-20 w-40 object-contain" 
              />
            </Link>
            <p className="text-[#B3B6CB] text-[14px] leading-relaxed mb-8 max-w-[320px]">
              Type a game. Play it in seconds. Share it with the world. 
              <br />
              Powered by AI, made for builders.
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-black px-6 py-2.5 rounded-full font-bold text-[14px] hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(255,0,192,0.3)]"
            >
              Start creating <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </Link>
          </div>

          {/* Play Column */}
          <div>
            <h3 className="text-[#B3B6CB] text-[12px] font-bold uppercase tracking-wider mb-5">Play</h3>
            <ul className="space-y-4">
              <li><Link to="/explore" className="text-white hover:text-[#FF00C0] text-[14px] font-medium transition-colors">Explore</Link></li>
              <li><Link to="/trending" className="text-white hover:text-[#FF00C0] text-[14px] font-medium transition-colors">Trending</Link></li>
              <li><Link to="/leaderboard" className="text-white hover:text-[#FF00C0] text-[14px] font-medium transition-colors">Leaderboard</Link></li>
            </ul>
          </div>

          {/* Build Column */}
          <div>
            <h3 className="text-[#B3B6CB] text-[12px] font-bold uppercase tracking-wider mb-5">Build</h3>
            <ul className="space-y-4">
              <li><Link to="/" className="text-white hover:text-[#FF00C0] text-[14px] font-medium transition-colors">Create a game</Link></li>
              <li><Link to="/docs" className="text-white hover:text-[#FF00C0] text-[14px] font-medium transition-colors">Docs</Link></li>
              <li><a href={DISCORD_CHANNEL_URL} target="_blank" rel="noreferrer" className="text-white hover:text-[#FF00C0] text-[14px] font-medium transition-colors">Discord</a></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-[#B3B6CB] text-[12px] font-bold uppercase tracking-wider mb-5">Legal</h3>
            <ul className="space-y-4">
              <li><Link to="/privacy" className="text-white hover:text-[#FF00C0] text-[14px] font-medium transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-white hover:text-[#FF00C0] text-[14px] font-medium transition-colors">Terms & Conditions</Link></li>
            </ul>
          </div>

        </div>

        {/* Copyright & Socials */}
        <div className="relative flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5">
          {/* Spacer to keep the text perfectly centered on larger screens */}
          <div className="hidden md:block flex-1"></div> 
          
          <p className="text-[#B3B6CB] text-[13px] font-medium text-center flex-1 mb-4 md:mb-0">
            © {new Date().getFullYear()} GameBot Studio • Made with neon and noise.
          </p>

          <div className="flex items-center justify-end gap-5 flex-1">
            <a 
              href={YOUTUBE_URL} 
              target="_blank" 
              rel="noreferrer" 
              className="text-[#B3B6CB] hover:text-[#FF00C0] transition-colors"
              aria-label="YouTube"
            >
              <Youtube className="w-[22px] h-[22px]" />
            </a>
            <a 
              href={DISCORD_CHANNEL_URL} 
              target="_blank" 
              rel="noreferrer" 
              className="text-[#B3B6CB] hover:text-[#FF00C0] transition-colors"
              aria-label="Discord"
            >
              <DiscordIcon className="w-[20px] h-[20px]" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}