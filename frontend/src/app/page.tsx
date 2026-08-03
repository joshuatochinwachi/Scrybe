'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlusCircle, History, Zap, Wallet, ExternalLink, Copy, Check, Shield, Sparkles, ArrowRight } from 'lucide-react';

interface WalletInfo {
  address: string;
  balance_eth: string;
  gas_price_gwei: number;
  connected: boolean;
  chain_id: number;
}

interface RecentHistoryItem {
  tx_hash: string;
  to_address: string;
  message_preview: string;
  status: string;
  timestamp: string;
}

export default function DashboardPage() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [recentItems, setRecentItems] = useState<RecentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [walletRes, historyRes] = await Promise.all([
          fetch('/api/wallet/info'),
          fetch('/api/idm/history?page=1&limit=5')
        ]);

        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWallet(walletData);
        }

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setRecentItems(historyData.items || []);
        }
      } catch (err) {
        console.error("Error loading dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const copyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Onboarding / Intro Strip */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-blue-500/20 bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-slate-900/40"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">On-Chain IDM Notary Logger</h2>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  Ready
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Broadcast immutable zero-value Ethereum mainnet transactions embedded with your text payloads.
                Private keys are securely maintained server-side with zero browser exposure.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <Link
              href="/compose"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20 flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Compose IDM</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Wallet Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Wallet Address Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-mono-code uppercase tracking-wider">Signing Wallet</span>
            <Wallet className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2 text-white font-mono-code font-bold text-base truncate">
              <span>{wallet?.address ? `${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}` : 'Loading...'}</span>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <button
                onClick={copyAddress}
                className="text-xs font-mono-code text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full Address</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ETH Balance Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-mono-code uppercase tracking-wider">Available Balance</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-mono-code font-bold text-white">
              {isLoading ? '...' : `${wallet?.balance_eth || '0.0'} ETH`}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono-code">
              Ethereum Mainnet (Chain ID 1)
            </p>
          </div>
        </div>

        {/* Live Gas Price Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-mono-code uppercase tracking-wider">Current Base Fee</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-mono-code font-bold text-amber-400">
              {isLoading ? '...' : `${wallet?.gas_price_gwei || '0'} Gwei`}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono-code">
              Ceiling: 100 Gwei (Auto-rejects above ceiling)
            </p>
          </div>
        </div>

      </div>

      {/* Quick Action & Recent Log Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-400" />
            <span>Recent On-Chain Activity</span>
          </h3>
          <Link
            href="/history"
            className="text-xs font-mono-code text-slate-400 hover:text-blue-400 flex items-center space-x-1 transition-colors"
          >
            <span>View All Logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Recent Items List */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500 font-mono-code">
              Fetching transaction history from Etherscan API...
            </div>
          ) : recentItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-3">
              <p className="text-sm font-medium">No previous IDM transactions found for this wallet address.</p>
              <Link
                href="/compose"
                className="inline-flex items-center space-x-2 text-xs font-mono-code text-blue-400 hover:text-blue-300"
              >
                <span>Send your first IDM notarization</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentItems.map((item) => (
                <div key={item.tx_hash} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono-code px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                        {item.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono-code">To: {item.to_address.slice(0, 6)}...{item.to_address.slice(-4)}</span>
                    </div>
                    <p className="text-sm text-slate-200 truncate font-mono-code">
                      "{item.message_preview}"
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <a
                      href={`https://etherscan.io/tx/${item.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                      title="View on Etherscan"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
