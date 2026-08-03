'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { History as HistoryIcon, ExternalLink, Search, ChevronLeft, ChevronRight, Copy, Check, PlusCircle } from 'lucide-react';

interface HistoryItem {
  tx_hash: string;
  to_address: string;
  message: string;
  message_preview: string;
  status: string;
  block_number: number;
  timestamp: string;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchHistory = async (targetPage: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/idm/history?page=${targetPage}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const copyTxHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredItems = items.filter(item => 
    item.to_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tx_hash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <HistoryIcon className="w-6 h-6 text-blue-400" />
            <span>On-Chain IDM History Log</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono-code mt-1">
            Stateless audit trail fetched live from Ethereum Mainnet via Etherscan
          </p>
        </div>

        <Link
          href="/compose"
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20 flex items-center space-x-2 shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New IDM</span>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by recipient address, message content, or transaction hash..."
          className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono-code"
        />
      </div>

      {/* Table Container */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-400 font-mono-code flex flex-col items-center justify-center space-y-3">
            <span className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>Fetching live transaction records from Etherscan API...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <p className="text-sm font-medium">No matching IDM logs found.</p>
            <p className="text-xs font-mono-code text-slate-500">
              {searchQuery ? 'Try clearing your search filter.' : 'Zero transactions logged yet for this signing wallet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-code">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Recipient (To)</th>
                  <th className="px-4 py-3.5">Decoded Payload Message</th>
                  <th className="px-4 py-3.5">Block</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredItems.map((item) => (
                  <tr key={item.tx_hash} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-blue-400 font-bold">
                      {item.to_address ? `${item.to_address.slice(0, 6)}...${item.to_address.slice(-4)}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 max-w-md truncate text-slate-200">
                      "{item.message}"
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">
                      #{item.block_number}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase text-[10px] font-bold">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => copyTxHash(item.tx_hash)}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Copy Tx Hash"
                      >
                        {copiedHash === item.tx_hash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={`https://etherscan.io/tx/${item.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors inline-block"
                        title="View on Etherscan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs font-mono-code text-slate-400">
          <span>
            Page {page} of {totalPages} ({total} Total IDMs)
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
