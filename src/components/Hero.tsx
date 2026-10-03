import React, { useState, useEffect, useRef } from 'react';
import { Palette, Code2, Sparkles, Camera, Upload, User, Check, RefreshCw, Lock } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

interface HeroProps {
  theme: 'dark' | 'light';
  onExploreGraphics: () => void;
  onExploreWeb: () => void;
}

export const Hero: React.FC<HeroProps> = ({ theme, onExploreGraphics, onExploreWeb }) => {
  const { isAdmin } = useAdmin();
  const [avatar, setAvatar] = useState<string | null>(() => {
    try {
      return localStorage.getItem('kw_profile_avatar');
    } catch {
      return null;
    }
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch avatar from Neon DB on mount
  useEffect(() => {
    fetch('/api/profile')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('No profile in DB');
      })
      .then((data) => {
        if (data.avatarUrl) {
          setAvatar(data.avatarUrl);
          localStorage.setItem('kw_profile_avatar', data.avatarUrl);
        }
      })
      .catch((err) => {
        console.warn('Avatar DB fetch notice:', err);
      });
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setAvatar(dataUrl);
      localStorage.setItem('kw_profile_avatar', dataUrl);

      setSaving(true);
      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: dataUrl })
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (err) {
        console.error('Failed to sync avatar to Neon DB:', err);
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="relative pt-32 pb-16 md:pt-36 md:pb-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Clean unboxed metadata lead-in */}
        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm font-medium tracking-wide mb-6 text-neutral-400">
          <span className="text-[#E2B714] font-semibold">Kelvin Mwangi Wambui</span>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span>Graphic Designer</span>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span>Photographer & Web Developer</span>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span>Nairobi, Kenya</span>
        </div>

        {/* Hero headline with balanced text wrap */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <h1
              className={`text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] ${
                theme === 'dark' ? 'text-white' : 'text-neutral-950'
              }`}
              style={{ textWrap: 'balance' }}
            >
              Graphic Design & Full-Stack Web Development
            </h1>

            <p
              className={`text-base sm:text-lg font-normal leading-relaxed max-w-2xl ${
                theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'
              }`}
            >
              Crafting distinctive brand marks, packaging suites, and vector graphics — alongside engineering reliable, responsive full-stack web applications.
            </p>

            {/* CTAs: 2 Core Parts */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={onExploreGraphics}
                className="px-6 py-3.5 text-sm font-semibold rounded-xl bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-all flex items-center gap-2 shadow-sm active:scale-98 cursor-pointer"
              >
                <Palette className="w-4 h-4" />
                <span>Graphic Design Gallery</span>
              </button>

              <button
                onClick={onExploreWeb}
                className={`px-6 py-3.5 text-sm font-semibold rounded-xl border transition-all flex items-center gap-2 active:scale-98 cursor-pointer ${
                  theme === 'dark'
                    ? 'border-[#2D3142] bg-[#12141F] text-neutral-200 hover:bg-[#1A1D2D] hover:text-white'
                    : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 hover:text-neutral-950 shadow-xs'
                }`}
              >
                <Code2 className="w-4 h-4 text-[#E2B714]" />
                <span>Web Development Projects</span>
              </button>
            </div>

            {/* 2 Core Disciplines */}
            <div
              className={`pt-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-4 ${
                theme === 'dark' ? 'border-[#222534]' : 'border-neutral-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#E2B714]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Part 1: Graphic Design</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Interactive image gallery for brand identity, logos, packaging, and custom uploaded artwork.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#E2B714]">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Part 2: Web Development</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Showcase of live deployed websites with instant external visit links and customizable project cards.
                </p>
              </div>
            </div>
          </div>

          {/* Right Visual: Kelvin Wambui Profile Portrait & Photo Card */}
          <div className="lg:col-span-5">
            <div
              className={`relative rounded-2xl overflow-hidden border p-3 transition-all ${
                theme === 'dark'
                  ? 'bg-[#12141F] border-[#252839] shadow-2xl shadow-black/60'
                  : 'bg-white border-neutral-200 shadow-xl'
              }`}
            >
              {/* Photo Display Frame */}
              <div className="relative aspect-4/3 sm:aspect-square rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Kelvin Mwangi Wambui"
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div
                    onClick={() => isAdmin && fileInputRef.current?.click()}
                    className={`w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#12141F] to-[#0A0B10] ${
                      isAdmin ? 'cursor-pointer group' : ''
                    }`}
                  >
                    <div className="w-20 h-20 rounded-full bg-[#E2B714]/10 text-[#E2B714] border border-[#E2B714]/30 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      {isAdmin ? <Camera className="w-10 h-10" /> : <User className="w-10 h-10" />}
                    </div>
                    <span className="font-bold text-base text-white">Kelvin Mwangi Wambui</span>
                    <span className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
                      {isAdmin ? 'Click here to upload your portrait photo' : 'Creative Director, Photographer & Full-Stack Developer'}
                    </span>
                    {isAdmin && (
                      <span className="mt-3 px-3.5 py-1 text-xs font-semibold rounded-lg bg-[#E2B714] text-neutral-950">
                        Choose Photo
                      </span>
                    )}
                  </div>
                )}

                {/* Scrim Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                {/* Bottom Profile Identity Badge */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>Kelvin Mwangi Wambui</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    </div>
                    <span className="text-neutral-300 text-[11px]">Designer, Photographer & Developer</span>
                  </div>

                  {/* Upload / Replace Photo Button (Only visible to Owner Admin) */}
                  {isAdmin && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-black/70 hover:bg-[#E2B714] hover:text-neutral-950 border border-white/20 text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
                      title="Upload or change photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{avatar ? 'Change Photo' : 'Upload'}</span>
                    </button>
                  )}
                </div>

                {/* Hidden File Input */}
                {isAdmin && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*, .png, .jpg, .jpeg, .webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                )}
              </div>

              {/* Status caption underneath */}
              <div className="px-3 py-2.5 flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#E2B714]" />
                  <span>Personal Profile</span>
                </span>
                {saveSuccess ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Saved to Neon DB</span>
                  </span>
                ) : saving ? (
                  <span className="text-[#E2B714] flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  <span>Nairobi, Kenya</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
