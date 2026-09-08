import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  QrCode,
  Lock,
  Globe,
  Copy,
  Check,
  Download,
  Share2,
  RefreshCw,
  ExternalLink,
  Printer,
  FileText,
  Clock,
  HardDrive,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { UploadedFile, ShareData, CreateSharePayload } from '../types';
import { createShare, formatBytes, regenerateShareToken } from '../lib/api';

interface QRShareViewProps {
  files: UploadedFile[];
  initialMode?: 'bundle' | 'individual';
  onBackToUpload: () => void;
  onOpenRecipientPage: (token: string) => void;
}

export const QRShareView: React.FC<QRShareViewProps> = ({
  files,
  initialMode = 'bundle',
  onBackToUpload,
  onOpenRecipientPage,
}) => {
  // Sharing Mode: bundle or individual
  const [sharingMode, setSharingMode] = useState<'bundle' | 'individual'>(initialMode);
  const [activeIndividualIndex, setActiveIndividualIndex] = useState<number>(0);

  // Privacy and constraints
  const [isProtected, setIsProtected] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [expiration, setExpiration] = useState<string>('24h');
  const [maxDownloads, setMaxDownloads] = useState<string>('unlimited');
  const [shareTitle, setShareTitle] = useState<string>('');

  // Generated shares
  const [createdBundleShare, setCreatedBundleShare] = useState<ShareData | null>(null);
  const [createdIndividualShares, setCreatedIndividualShares] = useState<ShareData[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [qrSvgString, setQrSvgString] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Active share to display
  const currentShare: ShareData | null =
    sharingMode === 'bundle'
      ? createdBundleShare
      : createdIndividualShares[activeIndividualIndex] || null;

  // Resolve current share URL
  const getShareUrl = (token: string) => {
    return `${window.location.origin}/share/${token}`;
  };

  // Generate share on backend
  const handleGenerateShare = async () => {
    setIsCreating(true);
    try {
      const parsedDownloads = maxDownloads === 'unlimited' ? null : parseInt(maxDownloads, 10);
      const payload: CreateSharePayload = {
        fileIds: files.map((f) => f.id),
        title: shareTitle.trim() || undefined,
        password: isProtected && password.trim() ? password.trim() : undefined,
        expiration,
        maxDownloads: parsedDownloads,
        isIndividual: sharingMode === 'individual',
      };

      const res = await createShare(payload);

      if (res.isMultiple && res.shares) {
        setCreatedIndividualShares(res.shares);
        setActiveIndividualIndex(0);
      } else if (res.share) {
        setCreatedBundleShare(res.share);
      }

      // Celebratory micro-interaction
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#06b6d4', '#38bdf8', '#818cf8'],
        });
      } catch (e) {
        // Confetti is decorative
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate QR share');
    } finally {
      setIsCreating(false);
    }
  };

  // Trigger initial share creation when mounted or mode changes
  useEffect(() => {
    handleGenerateShare();
  }, [sharingMode]);

  // Re-render QR code whenever currentShare changes
  useEffect(() => {
    if (!currentShare) return;
    const url = getShareUrl(currentShare.token);

    // 1. Generate high-res DataURL for PNG download and canvas display
    QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 10,
      color: {
        dark: '#0f172a', // Deep slate
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
      })
      .catch((err) => console.error('QR code generation error:', err));

    // 2. Generate SVG string for vector download
    QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((svg) => {
        setQrSvgString(svg);
      })
      .catch((err) => console.error('QR SVG generation error:', err));
  }, [currentShare?.token]);

  // Actions
  const handleCopyLink = () => {
    if (!currentShare) return;
    const url = getShareUrl(currentShare.token);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadPNG = () => {
    if (!qrDataUrl || !currentShare) return;
    const link = document.createElement('a');
    link.download = `AirLoom-QR-${currentShare.token.slice(0, 8)}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleDownloadSVG = () => {
    if (!qrSvgString || !currentShare) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `AirLoom-QR-${currentShare.token.slice(0, 8)}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintQR = () => {
    if (!currentShare || !qrDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AirLoom QR - ${currentShare.title}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            p { color: #64748b; font-size: 14px; margin-bottom: 24px; }
            img { width: 300px; height: 300px; border: 2px solid #e2e8f0; border-radius: 12px; }
            .meta { margin-top: 20px; font-family: monospace; font-size: 13px; color: #334155; }
          </style>
        </head>
        <body>
          <h1>AirLoom</h1>
          <p>Scan to securely access: <strong>${currentShare.title}</strong></p>
          <img src="${qrDataUrl}" alt="QR Code" />
          <div class="meta">${getShareUrl(currentShare.token)}</div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleNativeShare = async () => {
    if (!currentShare) return;
    const url = getShareUrl(currentShare.token);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AirLoom: ${currentShare.title}`,
          text: 'Scan or click this link to access files on AirLoom:',
          url,
        });
      } catch (err) {
        // Fallback to copy link
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleRegenerate = async () => {
    if (!currentShare) return;
    try {
      const res = await regenerateShareToken(currentShare.id);
      if (res.success) {
        if (sharingMode === 'bundle') {
          setCreatedBundleShare((prev) => (prev ? { ...prev, token: res.token } : null));
        } else {
          setCreatedIndividualShares((prev) =>
            prev.map((s, idx) => (idx === activeIndividualIndex ? { ...s, token: res.token } : s))
          );
        }
      }
    } catch (err: any) {
      alert('Failed to regenerate token');
    }
  };

  const activeShareUrl = currentShare ? getShareUrl(currentShare.token) : '';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToUpload}
          className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Upload more files</span>
        </button>

        <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Hardware Protected
        </span>
      </div>

      {/* Sharing Mode Toggle (if multi-file) */}
      {files.length > 1 && (
        <div className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-1 max-w-md mx-auto">
          <button
            onClick={() => setSharingMode('bundle')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              sharingMode === 'bundle'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bundle QR (All {files.length} files)
          </button>
          <button
            onClick={() => setSharingMode('individual')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              sharingMode === 'individual'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Individual QRs ({files.length})
          </button>
        </div>
      )}

      {/* Individual File Selector Tabs */}
      {sharingMode === 'individual' && createdIndividualShares.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {createdIndividualShares.map((share, idx) => (
            <button
              key={share.id}
              onClick={() => setActiveIndividualIndex(idx)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${
                activeIndividualIndex === idx
                  ? 'bg-slate-800 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[140px]">{share.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Grid: QR View + Configuration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: QR Code Display Card */}
        <div className="md:col-span-6 flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="w-full text-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Scan QR to Download
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Open mobile camera or scanner to access files instantly
            </p>
          </div>

          {/* High Contrast QR Code Canvas with AirLoom Branding Quiet Zone */}
          <div
            id="qr-code-display-frame"
            className="relative p-5 rounded-2xl bg-white shadow-2xl transition-all duration-300 group hover:scale-[1.01]"
          >
            {qrDataUrl ? (
              <div className="relative">
                <img
                  src={qrDataUrl}
                  alt="AirLoom QR Code"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
                />
                {/* Center AirLoom Emblem */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border-2 border-white flex items-center justify-center shadow-lg p-1.5 overflow-hidden">
                    <img src="/favicon.svg" alt="AirLoom" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center bg-slate-100 rounded-lg text-slate-400 text-xs font-mono">
                Generating QR...
              </div>
            )}
          </div>

          {/* Share Link Preview & Copy */}
          <div className="w-full mt-6 space-y-3">
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <input
                type="text"
                readOnly
                value={activeShareUrl}
                className="bg-transparent text-xs font-mono text-slate-300 px-2 flex-1 outline-none truncate"
              />
              <button
                id="copy-share-link-btn"
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-4 gap-2">
              <button
                id="download-png-qr-btn"
                onClick={handleDownloadPNG}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
                title="Download PNG image"
              >
                <Download className="w-4 h-4 mb-1 text-cyan-400" />
                <span className="text-[10px] font-medium">PNG</span>
              </button>

              <button
                id="download-svg-qr-btn"
                onClick={handleDownloadSVG}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
                title="Download vector SVG"
              >
                <Download className="w-4 h-4 mb-1 text-indigo-400" />
                <span className="text-[10px] font-medium">SVG</span>
              </button>

              <button
                id="print-qr-btn"
                onClick={handlePrintQR}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
                title="Print physical QR poster"
              >
                <Printer className="w-4 h-4 mb-1 text-purple-400" />
                <span className="text-[10px] font-medium">Print</span>
              </button>

              <button
                id="native-share-btn"
                onClick={handleNativeShare}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
                title="Share via device options"
              >
                <Share2 className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="text-[10px] font-medium">Share</span>
              </button>
            </div>

            {/* Recipient Experience Preview Action */}
            <div className="pt-2 flex items-center gap-2">
              <button
                id="open-share-page-btn"
                onClick={() => currentShare && onOpenRecipientPage(currentShare.token)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Recipient Download Page</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Privacy, Expiration, and Limits Settings */}
        <div className="md:col-span-6 space-y-5 flex flex-col justify-between">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3">
              Privacy & Access Controls
            </h4>

            {/* Privacy Selector: Public vs Password Protected */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Access Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsProtected(false)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    !isProtected
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Public</div>
                    <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      Anyone with QR code or link can access
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProtected(true)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    isProtected
                      ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Password Protected</div>
                    <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      Recipient must enter password to unlock
                    </div>
                  </div>
                </button>
              </div>

              {/* Password Input (if protected) */}
              {isProtected && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Protection Password</span>
                    <span className="text-[10px] text-slate-500 font-mono">Scrypt Encrypted</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter strong password..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Expiration Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Link Expiration</span>
              </label>
              <select
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="1h">1 Hour</option>
                <option value="6h">6 Hours</option>
                <option value="24h">24 Hours (Default)</option>
                <option value="3d">3 Days</option>
                <option value="7d">7 Days</option>
                <option value="never">Never (Persistent)</option>
              </select>
            </div>

            {/* Download Limit Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Download Limit</span>
              </label>
              <select
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="unlimited">Unlimited Downloads</option>
                <option value="1">1 Download (Self-Destruct)</option>
                <option value="5">5 Downloads</option>
                <option value="10">10 Downloads</option>
                <option value="25">25 Downloads</option>
                <option value="50">50 Downloads</option>
              </select>
            </div>

            {/* Update / Apply Button */}
            <button
              onClick={handleGenerateShare}
              disabled={isCreating}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCreating ? 'animate-spin' : ''}`} />
              <span>Apply Privacy & Expiration Settings</span>
            </button>
          </div>

          {/* Invalidate / Regenerate Token Safety Card */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <p className="font-medium text-slate-300">Regenerate Security Token</p>
              <p className="text-[11px] text-slate-500">
                Invalidates existing link and generates a new QR code immediately.
              </p>
            </div>
            <button
              onClick={handleRegenerate}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors shrink-0 ml-3"
            >
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
