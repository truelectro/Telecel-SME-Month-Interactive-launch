import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Zap, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import LaunchLogo from './LaunchLogo';
import { authenticate } from '../utils/authService';
import { audioEngine } from '../utils/audioEngine';

export default function AuthLockScreen({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(false);

    audioEngine.ensureRunning();

    // Verify password
    const success = authenticate(password);

    if (success) {
      setIsSuccess(true);
      try {
        audioEngine.playBoostSurge();
      } catch (err) {}

      setTimeout(() => {
        onUnlock?.();
      }, 600);
    } else {
      setError(true);
      setIsSubmitting(false);
      try {
        audioEngine.playVoltageDrainWarning();
      } catch (err) {}

      // Reset error shake after animation
      setTimeout(() => {
        setError(false);
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 800);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] w-screen h-screen bg-[#070204] flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden select-none font-rajdhani"
      onClick={() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }}
    >
      {/* Background Radial Glow & Atmosphere */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            background: 'radial-gradient(ellipse 120% 90% at 50% 40%, #540c19 0%, #29060c 45%, #100205 80%, #050102 100%)'
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vh] rounded-full bg-[#ff1f43]/15 blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute inset-0 scanlines opacity-25 pointer-events-none" />
      </div>

      {/* Sci-Fi Outer Framing */}
      <div className="absolute inset-2 sm:inset-4 border border-[#ff1f43]/30 pointer-events-none z-10 sci-fi-cut shadow-[0_0_40px_rgba(255,31,67,0.15)]">
        <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[9px] font-orbitron text-[#ff8095]/60">
          <span className="w-2 h-2 rounded-full bg-[#ff1f43] shadow-[0_0_8px_#ff1f43]" />
          <span>SECURITY_GATE // RESTRICTED</span>
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[9px] font-orbitron text-[#ff8095]/60">
          <span>ACCESS_LEVEL // 01</span>
          <span className="w-2 h-2 rounded-full bg-[#ff1f43] shadow-[0_0_8px_#ff1f43]" />
        </div>
      </div>

      {/* Top Header */}
      <div className="relative z-20 shrink-0 text-center pt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#20050c]/90 border border-[#ff1f43]/60 rounded-full shadow-[0_0_20px_rgba(255,31,67,0.4)] backdrop-blur-md">
          <Lock size={14} className="text-[#ff1f43] animate-pulse" />
          <span className="font-orbitron font-bold text-xs tracking-widest text-white uppercase">
            RESTRICTED STAGE ACCESS
          </span>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center w-full max-w-md my-auto px-4">
        {/* Logo */}
        <div className="w-full max-w-[280px] max-h-[90px] mb-6 flex items-center justify-center">
          <LaunchLogo className="w-full h-auto object-contain" animate={false} />
        </div>

        {/* Lock Card Panel */}
        <div className={`w-full hud-panel p-6 sm:p-8 sci-fi-cut border-2 transition-all duration-300 ${
          isSuccess 
            ? 'border-green-500 shadow-[0_0_35px_rgba(34,197,94,0.6)] bg-[#051a0d]/90'
            : error 
            ? 'border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.7)] bg-[#2b070e]/95 animate-shake' 
            : 'border-[#ff1f43] shadow-neon-red bg-[#160307]/90'
        }`}>
          
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`w-14 h-14 rounded-full border flex items-center justify-center mb-3 transition-all duration-300 ${
              isSuccess 
                ? 'bg-green-950/80 border-green-500 text-green-400 shadow-[0_0_20px_#22c55e]'
                : error 
                ? 'bg-red-950/80 border-red-500 text-red-400 shadow-[0_0_20px_#ef4444]'
                : 'bg-[#330c14] border-[#ff1f43] text-[#ff1f43] shadow-[0_0_20px_rgba(255,31,67,0.7)]'
            }`}>
              {isSuccess ? (
                <Unlock size={26} className="animate-bounce" />
              ) : error ? (
                <ShieldAlert size={26} />
              ) : (
                <KeyRound size={26} />
              )}
            </div>

            <h2 className="font-orbitron font-black text-lg sm:text-xl text-white uppercase tracking-wider text-glow-red">
              {isSuccess ? 'ACCESS GRANTED' : 'ENTER EVENT PASSCODE'}
            </h2>
            <p className="text-xs text-[#ff99aa] mt-1 tracking-wide">
              {isSuccess 
                ? 'Initializing stage controls...' 
                : 'Enter the master password to unlock stage controls'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                disabled={isSuccess || isSubmitting}
                placeholder="Passcode..."
                autoComplete="current-password"
                className={`w-full py-3.5 pl-4 pr-12 bg-black/70 border-2 rounded-xl text-white font-orbitron font-bold text-center tracking-widest placeholder-white/25 focus:outline-none transition-all ${
                  error 
                    ? 'border-red-500 shadow-[0_0_15px_#ef4444]' 
                    : 'border-[#ff1f43]/60 focus:border-[#ff1f43] focus:shadow-[0_0_20px_rgba(255,31,67,0.6)]'
                }`}
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-orbitron font-bold animate-fade-in">
                <ShieldAlert size={14} />
                <span>ACCESS DENIED • INVALID PASSCODE</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !password.trim() || isSuccess}
              className={`w-full py-3.5 px-6 sci-fi-cut font-orbitron font-black text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                isSuccess
                  ? 'bg-green-600 text-white shadow-[0_0_20px_#22c55e]'
                  : 'bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] hover:from-[#b01430] hover:via-[#ff3d5e] hover:to-[#b01430] text-white shadow-neon-red border border-white/40 hover:scale-[1.02]'
              }`}
            >
              {isSuccess ? (
                <>
                  <ShieldCheck size={18} />
                  <span>UNLOCKED</span>
                </>
              ) : (
                <>
                  <Zap size={18} />
                  <span>UNLOCK PLATFORM</span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-20 text-center flex items-center justify-center gap-2 shrink-0 pb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff1f43]" />
        <span className="font-orbitron font-bold text-[10px] text-[#ff8095]/60 uppercase tracking-widest">
          TELECEL SME MONTH • STAGE SECURITY SYSTEM
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff1f43]" />
      </div>
    </div>
  );
}
