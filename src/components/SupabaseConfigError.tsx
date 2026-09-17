import React, { useState } from 'react';
import {
  AlertTriangle,
  Database,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Code2,
  X,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { supabaseConfigStatus, saveCustomSupabaseConfig } from '../lib/supabase';
import { SupabaseSetupModal } from './SupabaseSetupModal';

interface SupabaseConfigErrorProps {
  bannerOnly?: boolean;
}

export const SupabaseConfigError: React.FC<SupabaseConfigErrorProps> = ({ bannerOnly = false }) => {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('akra_dismiss_supabase_banner') === 'true';
    } catch {
      return false;
    }
  });

  // Direct In-App Credentials Input
  const [showKeyInputModal, setShowKeyInputModal] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [saveError, setSaveError] = useState('');

  if (supabaseConfigStatus.isConfigured || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('akra_dismiss_supabase_banner', 'true');
    } catch {}
  };

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim().startsWith('http')) {
      setSaveError('Please enter a valid Supabase Project URL (e.g. https://xxx.supabase.co)');
      return;
    }
    if (inputKey.trim().length < 20) {
      setSaveError('Please enter a valid Supabase Anon Public Key.');
      return;
    }
    saveCustomSupabaseConfig(inputUrl.trim(), inputKey.trim());
  };

  const sampleEnv = `VITE_SUPABASE_URL=https://your-project-ref.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOi...`;

  const copyEnv = () => {
    navigator.clipboard.writeText(sampleEnv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (bannerOnly) {
    return (
      <>
        <div className="w-full bg-[#3d1814]/95 border-b border-[#7a2e24] px-4 py-2 text-rose-100 text-xs backdrop-blur-md sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold text-white">
              Supabase Not Connected:
            </span>
            <span className="hidden sm:inline text-rose-200">
              Paste keys directly or set Vercel environment variables to sync Phone & PC.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyInputModal(true)}
              className="px-2.5 py-1 rounded-full bg-rose-800 hover:bg-rose-700 text-[11px] font-semibold text-white transition cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <KeyRound className="w-3 h-3" />
              <span>Paste Keys Here</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1 rounded-full bg-[#52231b] hover:bg-[#682d23] text-[11px] font-medium text-rose-200 border border-rose-700/60 transition cursor-pointer"
            >
              SQL Script
            </button>

            <button
              onClick={handleDismiss}
              className="p-1 rounded-full text-rose-300 hover:text-white hover:bg-rose-900/50 transition cursor-pointer ml-1"
              title="Dismiss warning"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal for pasting keys directly in the browser */}
        {showKeyInputModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-up">
            <div className="relative max-w-md w-full rounded-3xl bg-[#1C1412] border border-[#7a2e24] p-6 shadow-2xl text-[#FFF7F2]">
              <div className="flex items-center justify-between pb-3 border-b border-[#3E2723]">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-rose-400" />
                  <h3 className="font-serif font-bold text-base text-white">Connect Supabase Instantly</h3>
                </div>
                <button
                  onClick={() => setShowKeyInputModal(false)}
                  className="p-1 rounded-full text-[#A1887F] hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#D7CCC8] mt-3 leading-relaxed">
                If Vercel hasn't baked your environment variables yet, you can paste your Supabase keys directly into this browser. They will be stored securely on your device.
              </p>

              <form onSubmit={handleSaveKeys} className="mt-4 space-y-3">
                {saveError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
                    {saveError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-[#D7CCC8] mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://xxxxxxxxxxxx.supabase.co"
                    value={inputUrl}
                    onChange={(e) => {
                      setInputUrl(e.target.value);
                      setSaveError('');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#2A1D1A] border border-[#5D4037] text-xs text-white placeholder-[#8D6E63] focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#D7CCC8] mb-1">
                    Supabase Anon Public Key (anon public)
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={inputKey}
                    onChange={(e) => {
                      setInputKey(e.target.value);
                      setSaveError('');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#2A1D1A] border border-[#5D4037] text-xs text-white font-mono placeholder-[#8D6E63] focus:outline-none focus:border-rose-400 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyInputModal(false)}
                    className="px-4 py-2 rounded-full border border-[#5D4037] text-xs text-[#D7CCC8] hover:bg-[#2A1D1A] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-rose-800 hover:bg-rose-700 text-white text-xs font-semibold shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Connect</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <SupabaseSetupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="w-full max-w-lg mx-auto my-6 p-6 rounded-3xl bg-[#261511] border-2 border-rose-900/60 text-[#fbf0ea] shadow-2xl space-y-5 animate-fade-in relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-rose-300 hover:text-white hover:bg-rose-950 transition cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-950/90 border border-rose-800/60 text-rose-400">
            <Database className="w-6 h-6" />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="font-serif text-lg font-medium text-rose-200">
              Supabase Connection Required
            </h3>
            <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
              AKRA requires live Supabase credentials to sync your changes across Phone and PC seamlessly.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setShowKeyInputModal(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-rose-800 hover:bg-rose-700 text-xs font-semibold text-white shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Paste Keys in Browser</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#3a1d17] hover:bg-[#4d271f] text-xs font-medium text-[#f9efe8] border border-[#7a3b2e]/60 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>View SQL Setup</span>
          </button>
        </div>
      </div>

      {showKeyInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-up">
          <div className="relative max-w-md w-full rounded-3xl bg-[#1C1412] border border-[#7a2e24] p-6 shadow-2xl text-[#FFF7F2]">
            <div className="flex items-center justify-between pb-3 border-b border-[#3E2723]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-rose-400" />
                <h3 className="font-serif font-bold text-base text-white">Connect Supabase Instantly</h3>
              </div>
              <button
                onClick={() => setShowKeyInputModal(false)}
                className="p-1 rounded-full text-[#A1887F] hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#D7CCC8] mt-3 leading-relaxed">
              Paste your Supabase Project URL and Anon Public Key below to connect immediately on this device:
            </p>

            <form onSubmit={handleSaveKeys} className="mt-4 space-y-3">
              {saveError && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
                  {saveError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-[#D7CCC8] mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://xxxxxxxxxxxx.supabase.co"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    setSaveError('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#2A1D1A] border border-[#5D4037] text-xs text-white placeholder-[#8D6E63] focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#D7CCC8] mb-1">
                  Supabase Anon Public Key
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value);
                    setSaveError('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#2A1D1A] border border-[#5D4037] text-xs text-white font-mono placeholder-[#8D6E63] focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyInputModal(false)}
                  className="px-4 py-2 rounded-full border border-[#5D4037] text-xs text-[#D7CCC8] hover:bg-[#2A1D1A] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-rose-800 hover:bg-rose-700 text-white text-xs font-semibold shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Connect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SupabaseSetupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
