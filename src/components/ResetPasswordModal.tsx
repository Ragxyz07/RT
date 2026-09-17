import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAkra } from '../context/AkraContext';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { AkraLogo } from './AkraLogo';

export const ResetPasswordModal: React.FC = () => {
  const { isPasswordRecovery, setIsPasswordRecovery, showToast } = useAkra();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDone, setIsDone] = useState(false);

  if (!isPasswordRecovery) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-check.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setIsSubmitting(false);
        setErrorMsg(error.message || 'Failed to update password.');
        return;
      }

      setIsDone(true);
      setIsSubmitting(false);
      showToast('Password Updated! ✨', 'Your new private password has been saved.', 'love');

      // Clean the URL hash (#access_token=...) so refresh doesn't trigger recovery again
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {
        // Ignore
      }

      setTimeout(() => {
        setIsPasswordRecovery(false);
      }, 1500);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#FFF5F7] rounded-[32px] sm:rounded-[36px] p-6 sm:p-8 shadow-2xl border border-[#F0C9D8] relative text-center">
        {/* Emblem */}
        <div className="mb-4 flex justify-center">
          <AkraLogo size="md" variant="emblem" theme="light" />
        </div>

        {isDone ? (
          <div className="py-6 space-y-3 animate-fade-in">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#ecd0c8] flex items-center justify-center text-[#5b3a2e] shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-[#5b3a2e]" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#3E2723]">
              Password Updated!
            </h3>
            <p className="text-xs text-[#795548]">
              Your sanctuary password has been successfully updated. Unlocking your space...
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#b06a5e] mb-1">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password Recovery</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#3E2723] mb-1.5">
              Set New Password
            </h2>
            <p className="text-xs text-[#795548] mb-6 leading-relaxed">
              Create a new secure password for your AKRA account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5D4037] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#795548]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/80 border border-[#F0C9D8] text-xs text-[#3E2723] font-medium placeholder-[#795548]/40 focus:outline-none focus:border-[#5D4037] focus:ring-1 focus:ring-[#5D4037] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#795548]/60 hover:text-[#3E2723] transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5D4037] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#795548]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat your new password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 border border-[#F0C9D8] text-xs text-[#3E2723] font-medium placeholder-[#795548]/40 focus:outline-none focus:border-[#5D4037] focus:ring-1 focus:ring-[#5D4037] transition"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-full bg-[#5D4037] hover:bg-[#4E342E] text-white font-semibold text-xs tracking-wide transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save New Password & Enter'}</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
