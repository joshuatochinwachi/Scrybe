import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Scrybe — On-Chain IDM Logger',
  description: 'Password-gated Input Data Message (IDM) logger for Ethereum Mainnet. Standalone, secure, and verifiably on-chain.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07090e] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-blue-500/30 selection:text-blue-200">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500 font-mono-code">
          Scrybe v1.0 · Single-Operator Ethereum Mainnet Notary Logger
        </footer>
      </body>
    </html>
  );
}
