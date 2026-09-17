import React, { useState } from 'react';
import {
  AlertTriangle,
  Database,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Code2,
} from 'lucide-react';
import { supabaseConfigStatus } from '../lib/supabase';
import { SupabaseSetupModal } from './SupabaseSetupModal';

interface SupabaseConfigErrorProps {
  bannerOnly?: boolean;
}

export const SupabaseConfigError: React.FC<SupabaseConfigErrorProps> = ({ bannerOnly = false }) => {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (supabaseConfigStatus.isConfigured) {
    return null;
  }

  const sampleEnv = `VITE_SUPABASE_URL=https://your-project-ref.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOi...`;

  const copyEnv = () => {
    navigator.clipboard.writeText(sampleEnv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (bannerOnly) {
    return (
      <>
        <div className="w-full bg-rose-950/90 border-b border-rose-800/80 px-4 py-2.5 text-rose-200 text-xs backdrop-blur-md sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium text-rose-100">
              Supabase Not Configured:
            </span>
            <span className="hidden sm:inline text-rose-300">
              Environment variables are missing. Silent fake data fallback is disabled.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1 rounded-md bg-rose-900 hover:bg-rose-800 text-[11px] font-medium text-rose-100 border border-rose-700/60 transition cursor-pointer"
            >
              Setup Database SQL
            </button>
            <a
              href="https://vercel.com/docs/projects/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-white underline cursor-pointer"
            >
              <span>Vercel Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <SupabaseSetupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="w-full max-w-lg mx-auto my-6 p-6 rounded-3xl bg-[#261511] border-2 border-rose-900/60 text-[#fbf0ea] shadow-2xl space-y-5 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-950/90 border border-rose-800/60 text-rose-400">
            <Database className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-medium text-rose-200">
                Supabase Connection Required
              </h3>
            </div>
            <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
              Silent mock/fake data fallbacks have been removed. AKRA requires live Supabase credentials to sync messages, locations, letters, and vault items.
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-[#1b0d0a] border border-[#522920] flex items-center justify-between">
            <span className="font-mono text-[#d9a89e]">VITE_SUPABASE_URL</span>
            {supabaseConfigStatus.hasUrl ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                Configured
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                Missing ❌
              </span>
            )}
          </div>
          <div className="p-3 rounded-xl bg-[#1b0d0a] border border-[#522920] flex items-center justify-between">
            <span className="font-mono text-[#d9a89e]">VITE_SUPABASE_ANON_KEY</span>
            {supabaseConfigStatus.hasKey ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                Configured
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                Missing ❌
              </span>
            )}
          </div>
        </div>

        {/* How to fix on Vercel */}
        <div className="space-y-2 text-xs text-[#d9a89e]/90 bg-[#1e0f0c] p-4 rounded-2xl border border-[#48251c]">
          <p className="font-semibold text-[#f9efe8] flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-rose-400" />
            How to configure on Vercel:
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed text-[#d9a89e]">
            <li>Open your project in the <strong className="text-white">Vercel Dashboard</strong></li>
            <li>Go to <strong className="text-white">Settings → Environment Variables</strong></li>
            <li>Add <code className="text-rose-300 bg-[#2d1712] px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="text-rose-300 bg-[#2d1712] px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code></li>
            <li>Redeploy your project for Vite to bake them into the client bundle</li>
          </ol>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={copyEnv}
            className="flex-1 py-2 px-3 rounded-xl bg-[#3a1d17] hover:bg-[#4d271f] text-xs font-medium text-[#f9efe8] border border-[#7a3b2e]/60 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#d9a89e]" />}
            <span>{copied ? 'Copied Names!' : 'Copy Variable Names'}</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-900 to-[#7a3b2e] hover:from-rose-800 hover:to-[#8c4335] text-xs font-medium text-white shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>View SQL Schema</span>
          </button>
        </div>
      </div>

      <SupabaseSetupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
