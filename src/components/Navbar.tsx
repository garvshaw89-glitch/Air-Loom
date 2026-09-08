import React from 'react';
import {
  Share2,
  FolderArchive,
  Layers,
  Sun,
  Moon,
  ShieldCheck,
  HardDrive,
  QrCode,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { ThemeMode } from '../types';

interface NavbarProps {
  activeTab: 'upload' | 'dashboard' | 'readme' | 'spec';
  setActiveTab: (tab: 'upload' | 'dashboard' | 'readme' | 'spec') => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  onOpenSpec: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  theme,
  toggleTheme,
  onOpenSpec,
}) => {
  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 dark:bg-slate-950/80 light:bg-white/85 border-b border-slate-800/80 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          id="brand-logo-btn"
          onClick={() => setActiveTab('upload')}
          className="flex items-center gap-3 cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActiveTab('upload')}
        >
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-purple-700 via-fuchsia-600 to-pink-500 p-[1px] shadow-lg shadow-fuchsia-500/20 group-hover:shadow-fuchsia-500/40 transition-all duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center p-1.5 overflow-hidden">
              <img src="/favicon.svg" alt="AirLoom" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-white group-hover:text-fuchsia-300 transition-colors">
                AirLoom
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30">
                PRO 10GB
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5 tracking-tight font-sans hidden sm:block">
              Upload. Generate. Scan. Download.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            id="nav-tab-transfer"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Transfer</span>
          </button>

          <button
            id="nav-tab-vault"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Shares Vault</span>
          </button>

          <button
            id="nav-tab-readme"
            onClick={() => setActiveTab('readme')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'readme'
                ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 shadow-sm shadow-fuchsia-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BookOpen className="w-4 h-4 text-fuchsia-400" />
            <span>3D README</span>
            <span className="hidden lg:inline-block px-1.5 py-0.2 rounded text-[9px] font-mono bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
              3D
            </span>
          </button>

          <button
            id="nav-tab-spec"
            onClick={onOpenSpec}
            className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-all"
          >
            <HardDrive className="w-4 h-4 text-cyan-400/80" />
            <span>Storage Engine</span>
          </button>
        </nav>

        {/* Action Controls & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
            title="Toggle color theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>

          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Direct Transfer Mode</span>
          </div>
        </div>
      </div>
    </header>
  );
};
