'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, AlertCircle, Eye, ShieldAlert, Check, Copy, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';

interface GasEstimate {
  to: string;
  gas_limit: number;
  gas_price_gwei: number;
  estimated_fee_eth: string;
  estimated_fee_usd: string;
  payload_bytes: number;
  payload_hex: string;
}

interface TxSuccessData {
  tx_hash: string;
  to: string;
  nonce: number;
  gas_price_gwei: number;
}

export default function ComposePage() {
  const router = useRouter();

  const [toAddress, setToAddress] = useState('');
  const [message, setMessage] = useState('');
  const [isAddressValid, setIsAddressValid] = useState<boolean | null>(null);
  
  const [estimate, setEstimate] = useState<GasEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState('');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStep, setSendStep] = useState<number>(0);
  const [sendError, setSendError] = useState('');
  const [successData, setSuccessData] = useState<TxSuccessData | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Validate checksum address format client-side
  useEffect(() => {
    if (!toAddress) {
      setIsAddressValid(null);
      return;
    }
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    if (ethRegex.test(toAddress) && toAddress !== "0x0000000000000000000000000000000000000000") {
      setIsAddressValid(true);
    } else {
      setIsAddressValid(false);
    }
  }, [toAddress]);

  // Live payload byte & hex calculation client-side
  const payloadStr = message ? (message.startsWith('IDM: ') ? message : `IDM: ${message}`) : '';
  const textEncoder = new TextEncoder();
  const payloadBytesArray = textEncoder.encode(payloadStr);
  const payloadBytes = payloadBytesArray.length;
  const maxBytes = 100000;
  
  const localHexPayload = payloadStr
    ? '0x' + Array.from(payloadBytesArray).map(b => b.toString(16).padStart(2, '0')).join('')
    : '0x';

  // Auto gas estimate trigger when inputs are valid
  const handleEstimateGas = async () => {
    if (!isAddressValid || !message.trim()) return;

    setIsEstimating(true);
    setEstimateError('');

    try {
      const res = await fetch('/api/idm/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toAddress, message }),
      });

      const data = await res.json();
      if (res.ok) {
        setEstimate(data);
      } else {
        setEstimateError(data.detail?.message || 'Failed to estimate gas');
      }
    } catch (err) {
      setEstimateError('Network error estimating gas');
    } finally {
      setIsEstimating(false);
    }
  };

  const openPreview = async () => {
    setIsPreviewOpen(true);
    setSuccessData(null);
    setSendError('');
    setConfirmInput('');
    await handleEstimateGas();
  };

  const handleBroadcast = async () => {
    if (confirmInput.toUpperCase() !== 'SEND' || isSending) return;

    setIsSending(true);
    setSendError('');
    setSendStep(1);

    // Animated step progress simulation for senior dev UX feel
    const timer1 = setTimeout(() => setSendStep(2), 600);
    const timer2 = setTimeout(() => setSendStep(3), 1200);

    try {
      const res = await fetch('/api/idm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toAddress, message }),
      });

      const data = await res.json();

      if (res.ok && data.tx_hash) {
        setSuccessData({
          tx_hash: data.tx_hash,
          to: data.to || toAddress,
          nonce: data.nonce || 0,
          gas_price_gwei: data.gas_price_gwei || 15
        });
      } else {
        setSendError(data.detail?.message || 'Failed to broadcast transaction');
      }
    } catch (err) {
      setSendError('Network broadcast failure. Please try again.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsSending(false);
    }
  };

  const copyTxHash = () => {
    if (successData?.tx_hash) {
      navigator.clipboard.writeText(successData.tx_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const resetForm = () => {
    setMessage('');
    setToAddress('');
    setIsPreviewOpen(false);
    setSuccessData(null);
    setEstimate(null);
  };

  const canPreview = isAddressValid && message.trim().length > 0 && payloadBytes <= maxBytes;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Compose Input Data Message</h1>
          <p className="text-xs text-slate-400 font-mono-code mt-1">
            Zero-value Ethereum transaction with embedded UTF-8 payload
          </p>
        </div>
      </div>

      {/* Main Form */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
        
        {/* Recipient Address */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-mono-code uppercase tracking-wider text-slate-300">
              Recipient Wallet Address (To)
            </label>
            {isAddressValid === true && (
              <span className="text-xs text-emerald-400 font-mono-code flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Valid Checksum</span>
              </span>
            )}
            {isAddressValid === false && (
              <span className="text-xs text-rose-400 font-mono-code flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Invalid ETH Address</span>
              </span>
            )}
          </div>
          <input
            type="text"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value.trim())}
            placeholder="0x..."
            className={`w-full px-4 py-3 rounded-xl bg-slate-900 border ${
              isAddressValid === false
                ? 'border-rose-500/80 focus:ring-rose-500'
                : isAddressValid === true
                ? 'border-emerald-500/60'
                : 'border-slate-800 focus:border-blue-500'
            } text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono-code text-sm transition-all`}
          />
        </div>

        {/* Message Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-mono-code uppercase tracking-wider text-slate-300">
              IDM Payload Text
            </label>
            <span className={`text-xs font-mono-code ${payloadBytes > 50000 ? 'text-amber-400' : 'text-slate-400'}`}>
              {payloadBytes.toLocaleString()} / {maxBytes.toLocaleString()} bytes
            </span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            placeholder="Type your AI recommendation, notarization note, or log message here..."
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono-code text-sm transition-all resize-y"
          />
          <p className="text-[11px] text-slate-500 font-mono-code mt-1.5">
            Note: Payloads are automatically prefixed with <span className="text-blue-400">IDM: </span> and hex-encoded into transaction data.
          </p>
        </div>

        {/* Live Gas Estimate Banner */}
        {isEstimating && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono-code text-slate-400 flex items-center space-x-2">
            <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>Calculating gas limit and fee estimate...</span>
          </div>
        )}

        {estimate && !isEstimating && (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-blue-500/20 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-mono-code text-slate-400 uppercase">Payload Size</span>
              <p className="text-sm font-mono-code font-bold text-slate-200">{estimate.payload_bytes} bytes</p>
            </div>
            <div>
              <span className="text-[10px] font-mono-code text-slate-400 uppercase">Gas Limit</span>
              <p className="text-sm font-mono-code font-bold text-slate-200">{estimate.gas_limit.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono-code text-slate-400 uppercase">Gas Price</span>
              <p className="text-sm font-mono-code font-bold text-amber-400">{estimate.gas_price_gwei} Gwei</p>
            </div>
            <div>
              <span className="text-[10px] font-mono-code text-slate-400 uppercase">Est. Gas Fee</span>
              <p className="text-sm font-mono-code font-bold text-emerald-400">
                {estimate.estimated_fee_eth} ETH (~${estimate.estimated_fee_usd})
              </p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={openPreview}
            disabled={!canPreview}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-4 h-4" />
            <span>Preview & Notarize</span>
          </button>
        </div>

      </div>

      {/* Preview / Broadcasting / Success Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl glass-panel rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative"
            >

              {/* SUCCESS SCREEN */}
              {successData ? (
                <div className="py-4 space-y-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-10 h-10" />
                  </motion.div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      IDM Broadcasted Successfully!
                    </h3>
                    <p className="text-xs text-slate-400 font-mono-code">
                      Signed & submitted to Ethereum Mainnet mempool
                    </p>
                  </div>

                  {/* Tx Hash Box */}
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2 text-left">
                    <span className="text-[11px] font-mono-code uppercase text-slate-400">Transaction Hash</span>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-xs">
                      <span className="text-emerald-400 truncate max-w-md">{successData.tx_hash}</span>
                      <button
                        onClick={copyTxHash}
                        className="text-slate-400 hover:text-white ml-2 flex items-center space-x-1 shrink-0"
                      >
                        {copiedHash ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <a
                      href={`https://etherscan.io/tx/${successData.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs font-mono-code transition-all flex items-center justify-center space-x-1.5 border border-slate-700"
                    >
                      <span>Etherscan ↗</span>
                    </a>

                    <button
                      onClick={() => router.push(`/status/${successData.tx_hash}`)}
                      className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs font-mono-code transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-1.5"
                    >
                      <span>Track Progress</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={resetForm}
                      className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium text-xs font-mono-code transition-all"
                    >
                      Compose New
                    </button>
                  </div>
                </div>
              ) : isSending ? (
                /* BROADCASTING ANIMATION OVERLAY */
                <div className="py-8 space-y-6 text-center">
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                    <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white tracking-tight">Broadcasting On-Chain IDM</h3>
                    <p className="text-xs text-slate-400 font-mono-code">Please wait while raw transaction is signed and submitted...</p>
                  </div>

                  {/* Stepper Status */}
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3 text-left font-mono-code text-xs">
                    <div className={`flex items-center space-x-2 ${sendStep >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Payload validated & UTF-8 encoded</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${sendStep >= 2 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {sendStep === 1 ? <RefreshCw className="w-4 h-4 animate-spin text-blue-400" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Server-side private key raw transaction signing</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${sendStep >= 3 ? 'text-blue-400' : 'text-slate-500'}`}>
                      {sendStep >= 2 ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Broadcasting to Ethereum RPC nodes...</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* PREVIEW FORM */
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      <h3 className="text-lg font-bold text-white">Confirm Transaction Broadcast</h3>
                    </div>
                    <button
                      onClick={() => setIsPreviewOpen(false)}
                      className="text-slate-400 hover:text-white text-xs font-mono-code"
                    >
                      [Esc / Close]
                    </button>
                  </div>

                  {/* Transaction Summary Card */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs font-mono-code">
                      <div>
                        <span className="text-slate-500">Action:</span>
                        <p className="text-emerald-400 font-bold">Zero-Value IDM Broadcast (0 ETH)</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Recipient:</span>
                        <p className="text-slate-200 truncate">{toAddress}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Estimated Gas Fee:</span>
                        <p className="text-amber-400 font-bold">
                          {estimate?.estimated_fee_eth ? `${estimate.estimated_fee_eth} ETH ($${estimate.estimated_fee_usd})` : 'Calculating fee...'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Network:</span>
                        <p className="text-blue-400 font-bold">Ethereum Mainnet (Chain ID 1)</p>
                      </div>
                    </div>

                    {/* Encoded Hex Preview */}
                    <div>
                      <span className="text-xs font-mono-code uppercase text-slate-400 mb-1 block">
                        Message Payload (Formatted UTF-8 Text)
                      </span>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono-code text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {payloadStr}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-mono-code uppercase text-slate-400 mb-1 block">
                        On-Chain Input Data Hex (`data` field)
                      </span>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono-code text-amber-400/90 break-all max-h-24 overflow-y-auto">
                        {estimate?.payload_hex || localHexPayload}
                      </div>
                    </div>
                  </div>

                  {/* Safety Typed Confirmation */}
                  <div className="pt-2 border-t border-slate-800 space-y-3">
                    <p className="text-xs text-slate-400 font-mono-code">
                      Type <span className="text-amber-400 font-bold">SEND</span> below to confirm server-side signing & broadcasting:
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={confirmInput}
                        onChange={(e) => setConfirmInput(e.target.value)}
                        placeholder="Type SEND..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 font-mono-code text-sm focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={handleBroadcast}
                        disabled={confirmInput.toUpperCase() !== 'SEND' || isSending}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
                      >
                        <Send className="w-4 h-4" />
                        <span>Sign & Broadcast</span>
                      </button>
                    </div>
                    {sendError && (
                      <p className="text-xs text-rose-400 font-mono-code bg-rose-500/10 p-2 rounded border border-rose-500/20">
                        {sendError}
                      </p>
                    )}
                  </div>
                </>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
