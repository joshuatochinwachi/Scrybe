'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, Zap, LogOut, FileText, History as HistoryIcon, PlusCircle, Check, Copy } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  const [walletInfo, setWalletInfo] = useState<{
    address: string;
    balance_eth: string;
    gas_price_gwei: number;
    connected: boolean;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isLoginPage) return;

    const fetchWalletInfo = async () => {
      try {
        const res = await fetch('/api/wallet/info');
        if (res.ok) {
          const data = await res.json();
          setWalletInfo(data);
        }
      } catch (err) {
        console.error("Failed to fetch wallet info", err);
      }
    };

    fetchWalletInfo();
    const interval = setInterval(fetchWalletInfo, 15000);
    return () => clearInterval(interval);
  }, [isLoginPage]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    router.push('/login');
    router.refresh();
  };

  const copyAddress = () => {
    if (walletInfo?.address) {
      navigator.clipboard.writeText(walletInfo.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoginPage) {
    return (
      <header className="border-b border-slate-800/80 bg-[#0a0d16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Scrybe
            </span>
          </div>
        </div>
      </header>
    );
  }

  const truncatedAddress = walletInfo?.address
    ? `${walletInfo.address.slice(0, 6)}...${walletInfo.address.slice(-4)}`
    : '0x...';

  return (
    <header className="border-b border-slate-800/80 bg-[#0a0d16]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-amber-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Scrybe
            </span>
            <span className="text-[10px] font-mono-code text-amber-400/90 tracking-wider uppercase -mt-1">
              Ethereum Mainnet
            </span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center space-x-1">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === '/' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/compose"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
              pathname === '/compose' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Compose IDM</span>
          </Link>
          <Link
            href="/history"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
              pathname === '/history' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <HistoryIcon className="w-4 h-4" />
            <span>History</span>
          </Link>
        </nav>

        {/* Status Indicators & Logout */}
        <div className="flex items-center space-x-3">
          
          {/* Gas indicator */}
          {walletInfo && (
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono-code text-amber-400/90">
              <Zap className="w-3.5 h-3.5 fill-amber-400/30" />
              <span>{walletInfo.gas_price_gwei} Gwei</span>
            </div>
          )}

          {/* Wallet Address Badge */}
          {walletInfo && (
            <button
              onClick={copyAddress}
              title="Click to copy address"
              className="flex items-center space-x-2 px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono-code text-slate-300 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{truncatedAddress}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            </button>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
