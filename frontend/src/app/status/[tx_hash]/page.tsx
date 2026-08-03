'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ExternalLink, Copy, Check, ArrowRight, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface StatusData {
  tx_hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  block_number: number | null;
  gas_used: number | null;
}

export default function StatusPage({ params }: { params: Promise<{ tx_hash: string }> }) {
  const resolvedParams = use(params);
  const txHash = resolvedParams.tx_hash;

  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/idm/status/${txHash}`);
        if (res.ok) {
          const data = await res.json();
          setStatusData(data);
          if (data.status === 'confirmed' || data.status === 'failed') {
            clearInterval(interval);
          }
        } else {
          const err = await res.json();
          setErrorMsg(err.detail?.message || 'Failed to fetch status');
        }
      } catch (e) {
        console.error("Status polling error", e);
      }
    };

    pollStatus();
    interval = setInterval(pollStatus, 4000);

    return () => clearInterval(interval);
  }, [txHash]);

  const copyHash = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    { key: 'broadcast', label: 'Broadcasted to Mempool', completed: true },
    { key: 'pending', label: 'Mining in Block', completed: statusData?.status !== undefined },
    { key: 'confirming', label: 'Block Confirmation', completed: (statusData?.confirmations ?? 0) >= 1 },
    { key: 'finalized', label: 'Finalized On-Chain', completed: statusData?.status === 'confirmed' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Transaction Lifecycle Tracker</h1>
        <p className="text-xs text-slate-400 font-mono-code">
          Real-time Ethereum Mainnet status monitoring
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
        
        {/* Status Stepper */}
        <div className="py-4">
          <div className="grid grid-cols-4 gap-2 relative">
            {steps.map((step, idx) => (
              <div key={step.key} className="flex flex-col items-center text-center space-y-2 relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono-code transition-all ${
                    step.completed
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-500'
                  }`}
                >
                  {step.completed ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`text-[11px] font-mono-code ${step.completed ? 'text-slate-200' : 'text-slate-500'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Banner */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono-code text-slate-400 uppercase">On-Chain State</span>
            {statusData?.status === 'confirmed' ? (
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono-code font-bold uppercase flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Confirmed ({statusData.confirmations} Blocks)</span>
              </span>
            ) : statusData?.status === 'failed' ? (
              <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono-code font-bold uppercase flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Execution Failed</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono-code font-bold uppercase flex items-center space-x-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Mining / Pending</span>
              </span>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 font-mono-code">Transaction Hash</span>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs font-mono-code text-blue-400 truncate max-w-md">{txHash}</span>
              <button
                onClick={copyHash}
                className="text-xs font-mono-code text-slate-400 hover:text-white ml-2 flex items-center space-x-1 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {statusData?.block_number && (
            <div className="grid grid-cols-2 gap-4 pt-2 text-xs font-mono-code">
              <div>
                <span className="text-slate-500">Mined Block:</span>
                <p className="text-slate-200 font-bold">#{statusData.block_number}</p>
              </div>
              <div>
                <span className="text-slate-500">Confirmations:</span>
                <p className="text-emerald-400 font-bold">{statusData.confirmations}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <a
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all flex items-center justify-center space-x-2 border border-slate-700"
          >
            <span>View on Etherscan</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <Link
            href="/compose"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
          >
            <span>Send Another IDM</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

    </div>
  );
}
