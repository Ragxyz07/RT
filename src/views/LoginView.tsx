import React, { useState } from 'react';
import { useAkra } from '../context/AkraContext';
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound, Sparkles, HelpCircle } from 'lucide-react';
import { AkraLogo } from '../components/AkraLogo';

export const LoginView: React.FC = () => {
  const {
    login,
    isPartnerConnected,
    connectPartner,
    relationship,
  } = useAkra();

  // Special credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showCredentialsGuide, setShowCredentialsGuide] = useState(false);

  // Partner connect state
  const [showPartnerConnectScreen, setShowPartnerConnectScreen] = useState(!isPartnerConnected);
  const [partnerCodeInput, setPartnerCodeInput] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your special email ID and password.');
      return;
    }

    try {
      const res = await login(email.trim(), password.trim());
      if (!res.success) {
        setErrorMsg(res.error || 'Invalid email ID or password. Please verify your special credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    }
  };

  const handlePartnerCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCodeInput.trim()) return;
    const success = connectPartner(partnerCodeInput);
    if (success) {
      setShowPartnerConnectScreen(false);
    } else {
      setErrorMsg('Invalid partner code. Try ' + relationship.partnerCode);
    }
  };

  if (showPartnerConnectScreen) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-[#FFF0F5] rounded-[32px] sm:rounded-[40px] p-8 sm:p-10 shadow-sm border border-[#F0C9D8] text-center">
          {/* AKRA Emblem */}
          <div className="mb-4 flex justify-center">
            <AkraLogo size="md" variant="emblem" theme="light" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#3E2723] mb-2">Connect Our Space</h2>
          <p className="text-sm text-[#795548] mb-6 leading-relaxed">
            AKRA is a private digital home exclusively for Ragul & Akshya. Connect using your shared partner key.
          </p>

          <form onSubmit={handlePartnerCodeSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#795548] mb-1.5">
                Partner Link Key
              </label>
              <input
                type="text"
                value={partnerCodeInput}
                onChange={(e) => {
                  setPartnerCodeInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="e.g. AKRA-LOVE-779"
                className="w-full px-4 py-3.5 rounded-2xl border border-[#F0C9D8] bg-[#FFF8FA] text-[#3E2723] placeholder-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#5D4037] uppercase tracking-widest text-center font-mono font-bold"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-700 text-center bg-rose-100/60 p-2.5 rounded-xl border border-rose-300 font-medium">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#5D4037] text-white font-semibold text-sm hover:bg-[#4E342E] transition flex items-center justify-center gap-2 shadow-xs active:scale-95"
            >
              <span>Link Space</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#F0C9D8]">
            <p className="text-xs text-[#795548] mb-2">Or share your personal invite key:</p>
            <div className="inline-block px-5 py-2 rounded-full bg-[#FCEBF2] border border-[#F0C9D8] font-mono font-bold text-sm text-[#5D4037]">
              {relationship.partnerCode}
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  connectPartner(relationship.partnerCode);
                  setShowPartnerConnectScreen(false);
                }}
                className="text-xs text-[#5D4037] font-semibold hover:underline"
              >
                Auto-connect Ragul & Akshya space →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 animate-in fade-in">
      <div className="w-full max-w-md bg-[#FFF0F5] rounded-[32px] sm:rounded-[40px] p-7 sm:p-9 shadow-sm border border-[#F0C9D8]">
        {/* AKRA Signature Couple Brand Logo */}
        <div className="text-center mb-6 flex flex-col items-center justify-center">
          <AkraLogo size="lg" variant="full" theme="light" showSubtitle={true} />
          <div className="mt-2.5 px-3 py-1 rounded-full bg-[#FCEBF2] border border-[#F0C9D8] text-[10px] text-[#795548] font-medium tracking-wide">
            "A little place for us" • Puducherry ♡ Bangalore
          </div>
        </div>

        {/* Security / Private Space Indicator */}
        <div className="mb-6 px-3.5 py-2.5 rounded-2xl bg-[#FCEBF2] border border-[#F0C9D8] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#5D4037] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#795548] leading-relaxed">
            <strong className="text-[#3E2723]">Private Two-Person Space:</strong> Enter your special email ID and password to enter. Profiles are hidden for your privacy.
          </p>
        </div>

        {/* Direct Special Email ID and Password Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548] mb-1.5">
              Special Email ID
            </label>
            <div className="relative">
              <input
                type="text"
                id="login-email-input"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Enter your special email or nickname"
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#F0C9D8] bg-[#FFF8FA] text-[#3E2723] placeholder-[#A1887F] text-sm focus:outline-none focus:ring-2 focus:ring-[#5D4037] transition font-medium"
              />
              <Mail className="w-4 h-4 text-[#795548] absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowCredentialsGuide(prev => !prev)}
                className="text-xs text-[#5D4037] hover:underline font-semibold flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>Special Details?</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                id="login-password-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#F0C9D8] bg-[#FFF8FA] text-[#3E2723] placeholder-[#A1887F] text-sm focus:outline-none focus:ring-2 focus:ring-[#5D4037] transition"
              />
              <Lock className="w-4 h-4 text-[#795548] absolute left-3.5 top-3.5" />
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-700 bg-rose-100/70 p-3 rounded-xl text-center border border-rose-300 font-medium">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            id="login-submit-button"
            className="w-full py-3.5 rounded-full bg-[#5D4037] text-white font-semibold text-sm tracking-wider hover:bg-[#4E342E] transition shadow-xs active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
          >
            <span>SIGN IN TO AKRA</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Special Credentials Guide Toggle / Drawer */}
        {showCredentialsGuide && (
          <div className="mt-5 p-4 rounded-2xl bg-[#FCEBF2] border border-[#F0C9D8] text-xs text-[#3E2723] space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#F0C9D8]">
              <span className="font-bold text-[#5D4037] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5D4037]" />
                Special Access Details
              </span>
              <button
                type="button"
                onClick={() => setShowCredentialsGuide(false)}
                className="text-[11px] text-[#795548] hover:underline"
              >
                Close
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="p-2 bg-[#FFF0F5] rounded-xl border border-[#F0C9D8]/60">
                <p className="font-bold text-[#5D4037]">Ragul (Mama) • Puducherry</p>
                <p className="text-[11px] text-[#795548]">Email: <code className="font-mono font-bold text-[#3E2723]">ragultheking0007@gmail.com</code></p>
              </div>

              <div className="p-2 bg-[#FFF0F5] rounded-xl border border-[#F0C9D8]/60">
                <p className="font-bold text-[#5D4037]">Akshya (Akshu) • Bangalore</p>
                <p className="text-[11px] text-[#795548]">Email: <code className="font-mono font-bold text-[#3E2723]">akshya@akra.love</code></p>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-[#F0C9D8] text-center">
          <p className="text-xs text-[#795548]">
            Exclusively handcrafted for <span className="font-bold text-[#3E2723]">Ragul</span> & <span className="font-bold text-[#3E2723]">Akshya</span>
          </p>
        </div>
      </div>
    </div>
  );
};
