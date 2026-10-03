import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

interface FooterProps {
  theme: 'dark' | 'light';
}

export const Footer: React.FC<FooterProps> = ({ theme }) => {
  const { openAdminModal } = useAdmin();
  const [time, setTime] = useState('');
  const clickTracker = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null }>({
    count: 0,
    timer: null
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Africa/Nairobi',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyrightClick = () => {
    clickTracker.current.count += 1;
    if (clickTracker.current.timer) {
      clearTimeout(clickTracker.current.timer);
    }

    if (clickTracker.current.count >= 3) {
      clickTracker.current.count = 0;
      openAdminModal();
    } else {
      clickTracker.current.timer = setTimeout(() => {
        clickTracker.current.count = 0;
      }, 1200);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      className={`border-t py-12 transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-[#06070B] border-[#181B26] text-neutral-400'
          : 'bg-neutral-100 border-neutral-200 text-neutral-600'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Nairobi Clock */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-xs">
            <span className={`font-display font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>
              Kelvin Mwangi Wambui
            </span>
            <span aria-hidden="true" className="hidden sm:inline opacity-30">·</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Nairobi, Kenya: {time || '12:00:00'} (GMT+3)</span>
            </div>
          </div>

          {/* Social & Contact links */}
          <div className="flex flex-wrap items-center gap-5 text-xs">
            <a
              href="mailto:kelvinmwangi0078@gmail.com"
              className="hover:text-[#E2B714] transition-colors"
            >
              Email
            </a>
            <a
              href="https://wa.me/254712539685?utm_source=chatgpt.com"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline transition-colors"
            >
              WhatsApp
            </a>
            <a
              href="https://www.linkedin.com/in/kelvin-mwangi-694682360/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BFinyukI%2FSMivROilHAnAag%3D%3D"
              target="_blank"
              rel="noreferrer"
              className="hover:text-blue-400 transition-colors"
            >
              LinkedIn
            </a>
            <a
              href="tel:0712539685"
              className="hover:text-white transition-colors"
            >
              0712539685
            </a>
          </div>

          {/* Copyright (Triple-click secret trigger) & Scroll to Top */}
          <div className="flex items-center gap-4 text-xs">
            <span
              onClick={handleCopyrightClick}
              className="cursor-default select-none transition-colors duration-200 hover:text-neutral-300"
            >
              © {new Date().getFullYear()} Kelvin Mwangi Wambui
            </span>

            <button
              onClick={scrollToTop}
              aria-label="Scroll back to top"
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'border-[#222534] hover:bg-[#12141F] text-neutral-300 hover:text-white'
                  : 'border-neutral-300 hover:bg-white text-neutral-700 hover:text-neutral-950'
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
