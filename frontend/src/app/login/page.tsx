'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        if (res.status === 429) {
          const seconds = data.detail?.retry_after_seconds || 60;
          setRetryAfter(seconds);
          setErrorMsg(`Rate limit reached. Try again in ${seconds} seconds.`);
        } else {
          setErrorMsg(data.detail?.message || 'Invalid access password');
        }
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to reach authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Subtle background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isShaking ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { opacity: 1, y: 0 }}
        transition={{ duration: isShaking ? 0.4 : 0.6 }}
        className="w-full max-w-md glass-panel rounded-2xl p-8 border border-slate-800 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-amber-500 p-[1px] mb-4 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
              <Lock className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Scrybe Access Gate</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono-code">
            Restricted Operator Access · Ethereum Mainnet
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider font-mono-code">
              Master Access Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                disabled={isLoading || retryAfter !== null}
                className={`w-full px-4 py-3 rounded-xl bg-slate-900/90 border ${
                  errorMsg ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-800 focus:border-blue-500'
                } text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono-code text-sm`}
                autoFocus
              />
            </div>
          </div>

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password || retryAfter !== null}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Unlock Terminal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center space-x-2 text-[11px] text-slate-500 font-mono-code">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
          <span>Server-side key isolation active</span>
        </div>
      </motion.div>

    </div>
  );
}
