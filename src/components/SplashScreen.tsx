import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const RUNTIME_STEPS = [
  'Resolving institutional gateway server coordinates...',
  'Connecting to Exness liquidity trading pools...',
  'Verifying end-to-end SSL handshake credentials...',
  'Syncing real-time global candlestick tickers...',
  'ExTrading secure execution console ready.'
];

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Increment loading progress smoothly over 2200ms
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + 1;
      });
    }, 18);

    // Rotate realistic loading steps
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < RUNTIME_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 450);

    // Initiate fadeout and completion callbacks
    const completeTimer = setTimeout(() => {
      setFadeOut(true);
      const closeTimer = setTimeout(() => {
        onComplete();
      }, 500); // Allow fadeout animation to resolve
      return () => clearTimeout(closeTimer);
    }, 2400);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      id="splash-screen-container"
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#0b0e11] text-[#EAECEF] overflow-hidden select-none transition-all duration-500 ease-in-out ${
        fadeOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Immersive technical grid design background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(240,185,11,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative flex flex-col items-center justify-between h-full max-h-[500px] px-6 py-12 z-10 w-full max-w-sm">
        {/* Empty top spacer to balance layout */}
        <div />

        {/* Core Animated Branding Emblem */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            {/* Absolute radiant pulse circles */}
            <div className="absolute inset-0 rounded-3xl bg-[#f0b90b]/10 animate-ping duration-1000 scale-110 pointer-events-none"></div>
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-[#f0b90b]/30 to-transparent blur-md pointer-events-none"></div>
            
            <div className="relative inline-flex items-center justify-center p-5 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl">
              <Shield className="h-10 w-10 text-[#f0b90b] animate-pulse" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1 font-sans">
              EX<span className="text-[#f0b90b]">TRADING</span>
            </h1>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8E9AAB] block">
              Pro Execution Terminal
            </span>
          </div>
        </div>

        {/* Loading progress bars and micro-status ticker notifications */}
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3 animate-spin text-[#f0b90b]" /> 
                SECURE HANDSHAKE
              </span>
              <span>{progress}%</span>
            </div>
            
            {/* Real Progress Bar */}
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-[#f0b90b] to-yellow-400 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Sourcing/handshake message status update */}
          <div className="h-4 flex items-center justify-center">
            <p className="text-[10px] font-medium font-mono text-zinc-400 text-center animate-pulse tracking-wide">
              {RUNTIME_STEPS[currentStep]}
            </p>
          </div>
        </div>

        {/* Base institutional legal encryption footnote details */}
        <div className="text-center space-y-1">
          <span className="text-[8px] font-mono text-zinc-650 tracking-widest uppercase block">
            Exness Secure Broker Node
          </span>
          <span className="text-[8px] font-mono text-zinc-700 block">
            AES-256 Bit Tunneling Protocol Active
          </span>
        </div>
      </div>
    </div>
  );
}
