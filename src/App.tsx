import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  QrCode,
  Shield,
  Zap,
  Layers,
  ArrowRight,
  HardDrive,
  CheckCircle2,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Hero3D } from './components/Hero3D';
import { UploadWorkspace } from './components/UploadWorkspace';
import { QRShareView } from './components/QRShareView';
import { DashboardView } from './components/DashboardView';
import { RecipientSharePage } from './components/RecipientSharePage';
import { SystemInfoModal } from './components/SystemInfoModal';
import { ReadmeView } from './components/ReadmeView';
import { UploadedFile, ThemeMode, DashboardStats } from './types';
import { getDashboardStats } from './lib/api';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('airloom-theme');
    return (saved as ThemeMode) || 'dark';
  });

  // Navigation tab: upload, dashboard, or readme
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'readme' | 'spec'>('upload');

  // Direct share page view (e.g. if URL is /share/xyz or user clicks "Open Share Page")
  const [activeShareToken, setActiveShareToken] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      const token = path.replace('/share/', '').trim();
      return token || null;
    }
    return null;
  });

  // Uploaded files in current session
  const [sessionUploadedFiles, setSessionUploadedFiles] = useState<UploadedFile[]>([]);
  const [inQRView, setInQRView] = useState<boolean>(false);
  const [qrInitialMode, setQrInitialMode] = useState<'bundle' | 'individual'>('bundle');

  // System modal state
  const [specModalOpen, setSpecModalOpen] = useState<boolean>(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Sync theme to DOM
  useEffect(() => {
    localStorage.setItem('airloom-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  // Handle browser popstate for /share/:token URLs
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path.startsWith('/share/')) {
        const token = path.replace('/share/', '').trim();
        setActiveShareToken(token || null);
      } else {
        setActiveShareToken(null);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Fetch initial stats
  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((e) => console.warn('Could not fetch stats on init:', e));
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleProceedToShare = (files: UploadedFile[], mode: 'bundle' | 'individual' = 'bundle') => {
    setSessionUploadedFiles(files);
    setQrInitialMode(mode);
    setInQRView(true);
  };

  const handleOpenRecipientPage = (token: string) => {
    // Open recipient download page in a separate tab so sender retains their current session
    window.open(`/share/${token}`, '_blank');
  };

  const scrollToUpload = () => {
    setActiveTab('upload');
    setInQRView(false);
    const dropzone = document.getElementById('file-dropzone');
    dropzone?.scrollIntoView({ behavior: 'smooth' });
  };

  // If viewing a share directly as recipient (via direct URL or QR scan)
  if (activeShareToken) {
    return <RecipientSharePage token={activeShareToken} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'upload') setInQRView(false);
        }}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenSpec={() => setSpecModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {activeTab === 'upload' ? (
          !inQRView ? (
            <div className="space-y-12">
              {/* Hero Section */}
              <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-7 space-y-6 text-center lg:text-left z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Upload. Generate. Scan. Download.</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
                    The fastest bridge between your files and{' '}
                    <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                      any device.
                    </span>
                  </h1>

                  <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                    AirLoom lets you upload large files with chunked streaming, generate a secure high-contrast QR code, and let anyone download instantly using any mobile camera.
                  </p>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                    <button
                      id="hero-upload-btn"
                      onClick={scrollToUpload}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center gap-2 group"
                    >
                      <UploadCloud className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                      <span>Upload Files</span>
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      id="hero-explore-spec-btn"
                      onClick={() => setSpecModalOpen(true)}
                      className="px-5 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white font-medium text-sm transition-all flex items-center gap-2"
                    >
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      <span>10 GB Architecture</span>
                    </button>
                  </div>

                  {/* Trust & Spec Badges */}
                  <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-900 max-w-md mx-auto lg:mx-0">
                    <div>
                      <p className="text-xl font-bold font-mono text-white">10 GB</p>
                      <p className="text-[11px] text-slate-500">Chunked Streaming</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold font-mono text-cyan-400">HTTP 206</p>
                      <p className="text-[11px] text-slate-500">Resume & Stream</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold font-mono text-indigo-400">Scrypt</p>
                      <p className="text-[11px] text-slate-500">Password Lock</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Interactive 3D WebGL Visualization */}
                <div className="lg:col-span-5 h-[340px] sm:h-[420px] relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 rounded-3xl blur-2xl pointer-events-none" />
                  <Hero3D className="z-10" />
                </div>
              </section>

              {/* Dedicated Upload Workspace */}
              <section className="pt-4">
                <UploadWorkspace
                  onProceedToShare={handleProceedToShare}
                  onExploreDemo={() => setSpecModalOpen(true)}
                />
              </section>
            </div>
          ) : (
            /* Dedicated QR Sharing Screen */
            <section className="py-4">
              <QRShareView
                files={sessionUploadedFiles}
                initialMode={qrInitialMode}
                onBackToUpload={() => setInQRView(false)}
                onOpenRecipientPage={handleOpenRecipientPage}
              />
            </section>
          )
        ) : activeTab === 'readme' ? (
          /* Interactive 3D Animated README View */
          <section className="py-4">
            <ReadmeView
              onNavigateToTransfer={() => {
                setActiveTab('upload');
                setInQRView(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </section>
        ) : (
          /* Dashboard / Shares Vault View */
          <section className="py-4">
            <DashboardView
              onOpenSharePage={handleOpenRecipientPage}
              onNavigateToUpload={() => {
                setActiveTab('upload');
                setInQRView(false);
              }}
            />
          </section>
        )}
      </main>

      {/* System Architecture Specification Modal */}
      <SystemInfoModal
        isOpen={specModalOpen}
        onClose={() => setSpecModalOpen(false)}
        stats={stats}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">AirLoom</span>
            <span>•</span>
            <span>Your files. One scan away.</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setActiveTab('readme');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-fuchsia-400 hover:text-fuchsia-300 transition-colors flex items-center gap-1"
            >
              <span>3D README</span>
            </button>
            <span>•</span>
            <button
              onClick={() => setSpecModalOpen(true)}
              className="hover:text-cyan-400 transition-colors"
            >
              Storage Architecture
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setActiveTab('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-cyan-400 transition-colors"
            >
              Shares Vault
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
