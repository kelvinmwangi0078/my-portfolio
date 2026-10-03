import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenContact: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, onToggleTheme, onOpenContact }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Graphic Design', href: '#graphics' },
    { label: 'Web Development', href: '#web-dev' },
    { label: 'Photography', href: '#photography' },
    { label: 'Career History', href: '#career' },
    { label: 'Contact', href: '#contact' }
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-200 border-b ${
        scrolled
          ? theme === 'dark'
            ? 'bg-[#090A0F]/90 backdrop-blur-md border-[#232635]'
            : 'bg-[#FDFDFD]/95 backdrop-blur-md border-neutral-200 shadow-xs'
          : theme === 'dark'
            ? 'bg-transparent border-transparent'
            : 'bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          className={`font-display text-xl font-bold tracking-tight transition-colors ${
            theme === 'dark' ? 'text-white hover:text-[#E2B714]' : 'text-neutral-900 hover:text-amber-600'
          }`}
        >
          Kelvin Mwangi Wambui
        </a>

        {/* Zone 2: 4-5 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`transition-colors py-1 ${
                theme === 'dark'
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'editorial light' : 'dark'} mode`}
            className={`p-2 rounded-lg border transition-colors ${
              theme === 'dark'
                ? 'border-[#232635] text-neutral-300 hover:text-white hover:bg-[#151722]'
                : 'border-neutral-200 text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100'
            }`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Primary CTA */}
          <button
            onClick={onOpenContact}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm ${
              theme === 'dark'
                ? 'bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B]'
                : 'bg-neutral-950 text-white hover:bg-neutral-800'
            }`}
          >
            <span>Get in Touch</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className={`md:hidden p-2 rounded-lg border transition-colors ${
              theme === 'dark'
                ? 'border-[#232635] text-neutral-300 hover:bg-[#151722]'
                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-b px-6 py-5 flex flex-col gap-4 animate-in fade-in duration-150 ${
            theme === 'dark'
              ? 'bg-[#0E1018] border-[#232635]'
              : 'bg-white border-neutral-200 shadow-md'
          }`}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`text-base font-medium py-1 transition-colors ${
                theme === 'dark'
                  ? 'text-neutral-300 hover:text-white'
                  : 'text-neutral-700 hover:text-neutral-950'
              }`}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-neutral-800/30 flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              Nairobi · Remote Worldwide
            </span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenContact();
              }}
              className="text-xs font-semibold text-[#E2B714] hover:underline"
            >
              Initiate Project →
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
