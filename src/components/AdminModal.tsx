import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { Shield, ShieldAlert, ShieldCheck, Lock, Unlock, X, KeyRound, Eye, EyeOff } from 'lucide-react';

interface AdminModalProps {
  theme: 'dark' | 'light';
}

export const AdminModal: React.FC<AdminModalProps> = ({ theme }) => {
  const { isAdmin, login, logout, isModalOpen, closeAdminModal } = useAdmin();
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  if (!isModalOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(passcode);
    if (success) {
      setError(false);
      setPasscode('');
      closeAdminModal();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={closeAdminModal} />

      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-6 z-10 ${
          theme === 'dark' ? 'bg-[#0E1018] border-[#252839] text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800/40 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E2B714]/15 text-[#E2B714]">
              {isAdmin ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base">Portfolio Owner Access</h3>
              <p className="text-xs text-neutral-400">
                {isAdmin ? 'Admin Mode is currently Active' : 'Enter passcode to manage portfolio content'}
              </p>
            </div>
          </div>
          <button
            onClick={closeAdminModal}
            className="p-1.5 rounded-lg hover:bg-neutral-800/40 text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAdmin ? (
          /* Logged In State */
          <div className="space-y-4 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-400 mx-auto flex items-center justify-center">
              <Unlock className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-lg">You are in Owner Admin Mode</h4>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto leading-relaxed">
                You can now upload graphics, manage photography, update your portrait photo, and add websites.
              </p>
            </div>

            <div className="pt-3 flex flex-col gap-2">
              <button
                onClick={closeAdminModal}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-colors"
              >
                Continue Managing Portfolio
              </button>
              <button
                onClick={() => {
                  logout();
                  closeAdminModal();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                Lock Portfolio & Logout (Public View)
              </button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="p-3.5 rounded-xl border border-neutral-800 bg-[#12141F] text-xs text-neutral-300 leading-relaxed">
              <span className="font-semibold text-[#E2B714]">Security Note: </span>
              Public visitors on Vercel browse in read-only mode. Only the owner with the passcode can upload, modify, or delete portfolio content.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-400">Owner Secret Passcode</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="Enter passcode..."
                  className={`w-full py-2.5 pl-3 pr-10 rounded-xl border text-xs focus:outline-none focus:border-[#E2B714] ${
                    theme === 'dark' ? 'bg-[#12141F] border-[#252839] text-white' : 'bg-neutral-50 border-neutral-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="text-xs text-rose-400 mt-1">
                  Incorrect passcode. Access denied.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Unlock Admin Mode</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
