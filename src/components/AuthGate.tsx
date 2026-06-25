import React, { useState } from 'react';
import { Shield, Mail, Lock, User, Check, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';
import { signUpApi, loginApi } from '../lib/api';

interface AuthGateProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function AuthGate({ onLoginSuccess }: AuthGateProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password structural test
  const meetsMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const calculatePasswordStrength = (): { level: string; color: string; width: string } => {
    if (!password) return { level: 'None', color: 'bg-zinc-700', width: 'w-0' };
    let score = 0;
    if (meetsMinLength) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    if (score === 1) return { level: 'Weak', color: 'bg-red-500', width: 'w-1/3' };
    if (score === 2) return { level: 'Medium', color: 'bg-amber-500', width: 'w-2/3' };
    return { level: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email) {
      setErrorMsg('Please input a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password should be at least 6 characters long');
      return;
    }
    if (!isLogin && !fullName) {
      setErrorMsg('Please enter your full name for regulatory compliance');
      return;
    }

    setLoading(true);
    try {
      let user: UserProfile;
      if (isLogin) {
        user = await loginApi(email, password);
      } else {
        user = await signUpApi({
          email,
          fullName,
          password,
          device: 'ExTrading Live Console Device',
          location: 'Network IP Hub',
          ip: '127.0.0.1'
        });
      }

      // Store in local storage to sustain session
      localStorage.setItem('trading_session_user', JSON.stringify(user));
      setLoading(false);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check network.');
      setLoading(false);
    }
  };

  const strength = calculatePasswordStrength();

  return (
    <div id="auth-gate-wrapper" className="min-h-screen bg-[#0b0e11] flex items-center justify-center p-4 selection:bg-[#f0b90b] selection:text-black">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#0b0e11] to-[#0b0e11] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Core Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-zinc-950/45 border border-zinc-850 shadow-inner mb-3">
            <Shield className="h-7 w-7 text-[#f0b90b]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100 font-sans flex items-center justify-center gap-1">
            EX<span className="text-[#f0b90b]">TRADING</span>
            <span className="text-[10px] uppercase bg-[#f0b90b]/10 text-[#f0b90b] font-mono border border-[#f0b90b]/30 px-1.5 py-0.5 rounded-md">
              SECURE
            </span>
          </h1>
          <p className="text-[11px] text-[#8E9AAB] mt-1.5 font-semibold uppercase tracking-wider">
            Institutional Multi-Asset Leverage Console
          </p>
        </div>

        {/* Central Sign Up/Sign In Card */}
        <div id="auth-card" className="bg-[#181a20] border border-zinc-850 rounded-2xl shadow-2xl p-5 sm:p-7">
          <div className="flex border-b border-zinc-800 pb-3 mb-5">
            <button
              id="switch-login"
              onClick={() => {
                setIsLogin(true);
                setErrorMsg('');
              }}
              className={`flex-1 text-center py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isLogin ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-zinc-500 hover:text-white'
              }`}
            >
              Sign In Account
            </button>
            <button
              id="switch-register"
              onClick={() => {
                setIsLogin(false);
                setErrorMsg('');
              }}
              className={`flex-1 text-center py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                !isLogin ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-zinc-500 hover:text-white'
              }`}
            >
              Open Live Wallet
            </button>
          </div>

          <form id="submission-form" onSubmit={handleAuthSubmit} className="space-y-3.5">
            {errorMsg && (
              <div className="bg-[#f6465d]/10 border border-[#f6465d]/20 text-[#f6465d] text-xs rounded-lg p-2.5 font-mono font-medium">
                ⚠️ {errorMsg}
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Full Legal Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    placeholder="e.g. Alexis Carter"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#2b2f36]/40 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#f0b90b] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Registered Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="name@personal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#2b2f36]/40 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#f0b90b] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Account Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder="••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#2b2f36]/40 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#f0b90b] focus:border-transparent transition-all"
                />
              </div>

              {/* Secure strength indicator */}
              {!isLogin && password && (
                <div className="space-y-1 mt-1.5 bg-zinc-950/20 p-2 rounded-lg border border-zinc-850">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider">Password Strength:</span>
                    <span className="text-[#00c087] font-bold uppercase">{strength.level}</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color === 'bg-emerald-500' ? 'bg-[#00c087]' : strength.color} ${strength.width} transition-all duration-300`}></div>
                  </div>
                  <div className="flex flex-col gap-0.5 text-[9px] text-[#5A6376] pt-1 font-mono">
                    <span className={`flex items-center gap-1 ${meetsMinLength ? 'text-[#00c087]' : 'text-zinc-600'}`}>
                      <Check className="h-2.5 w-2.5" /> 8+ Characters
                    </span>
                    <span className={`flex items-center gap-1 ${hasNumber ? 'text-[#00c087]' : 'text-zinc-600'}`}>
                      <Check className="h-2.5 w-2.5" /> Includes 0-9 numeric characters
                    </span>
                    <span className={`flex items-center gap-1 ${hasSpecial ? 'text-[#00c087]' : 'text-zinc-600'}`}>
                      <Check className="h-2.5 w-2.5" /> Special characters (@, #, !, %, &)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              id="submit-auth-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#f0b90b] to-[#E5B800] hover:from-[#FFC933] hover:to-[#f0b90b] text-[#0b0e11] py-2.5 rounded-xl font-sans font-extrabold text-[11px] uppercase tracking-wider disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#0b0e11]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Securing Credentials...
                </>
              ) : (
                <>
                  {isLogin ? 'Establish Secure Session' : 'Create High-Yield Account'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>


        </div>

        {/* Footnotes regulatory compliance layout */}
        <div className="text-center mt-5 text-[9px] text-zinc-500 leading-relaxed font-sans px-4">
          <p>
            Cryptocurrency, FX, and CFD products run with high leverage risk of partial or total initial capital volatility. Secure connections configured utilizing 256-Bit SSL protection layers.
          </p>
          <p className="mt-1">
            Registered sandbox: UK / CYSEC / FSA Compliant.
          </p>
        </div>
      </div>
    </div>
  );
}
