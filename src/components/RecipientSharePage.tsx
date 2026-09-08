import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Download,
  Lock,
  Unlock,
  AlertCircle,
  FileText,
  FileArchive,
  Image as ImageIcon,
  Video,
  Music,
  Code2,
  File,
  CheckCircle2,
  Clock,
  HardDrive,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  ArrowDownToLine,
  Layers,
} from 'lucide-react';
import { ShareData, ShareFileSummary } from '../types';
import { getShare, unlockShare, formatBytes } from '../lib/api';

interface RecipientSharePageProps {
  token: string;
}

export const RecipientSharePage: React.FC<RecipientSharePageProps> = ({ token }) => {
  const [share, setShare] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Password unlock state
  const [password, setPassword] = useState<string>('');
  const [unlockToken, setUnlockToken] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  // Download feedback states
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);

  const getFileIcon = (mimeType: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-cyan-400" />;
    }
    if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
      return <Video className="w-5 h-5 text-purple-400" />;
    }
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'flac', 'm4a'].includes(ext)) {
      return <Music className="w-5 h-5 text-pink-400" />;
    }
    if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2'].includes(ext)) {
      return <FileArchive className="w-5 h-5 text-amber-400" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css'].includes(ext)) {
      return <Code2 className="w-5 h-5 text-emerald-400" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  const loadShareData = async (currentUnlock?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShare(token, currentUnlock || unlockToken);
      setShare(data);
    } catch (err: any) {
      setError(err.message || 'Share not found or expired');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShareData();
  }, [token]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setIsUnlocking(true);
    setUnlockError(null);
    try {
      const res = await unlockShare(token, password.trim());
      setUnlockToken(res.unlockToken);
      await loadShareData(res.unlockToken);
    } catch (err: any) {
      setUnlockError(err.message || 'Incorrect password');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDownloadFile = (file: ShareFileSummary) => {
    setDownloadingFileId(file.fileId);
    let downloadUrl = `/api/shares/${token}/download/${file.fileId}`;
    if (unlockToken) {
      downloadUrl += `?unlock=${encodeURIComponent(unlockToken)}`;
    }

    // Trigger browser streaming download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', file.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingFileId(null);
      // Refresh download counter
      loadShareData();
    }, 1800);
  };

  const handleDownloadAll = () => {
    setIsDownloadingAll(true);
    let downloadUrl = `/api/shares/${token}/download-all`;
    if (unlockToken) {
      downloadUrl += `?unlock=${encodeURIComponent(unlockToken)}`;
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `AirLoom_${share?.title || 'bundle'}.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloadingAll(false);
      loadShareData();
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Mobile-First Header */}
      <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur-md px-4 py-4 sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-700 via-fuchsia-600 to-pink-500 p-[1px] shadow-md shadow-fuchsia-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center p-1 overflow-hidden">
                <img src="/favicon.svg" alt="AirLoom" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white">AirLoom</span>
              <p className="text-[10px] text-slate-400 -mt-0.5">Secure File Transfer</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Secure Download</span>
            <span className="sm:hidden">Secure</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Fetching secure file manifest...</p>
          </div>
        ) : error ? (
          /* Expired, Missing, or Limit Reached Error State */
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Download Unavailable</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400">
              Please contact the sender to generate a new active QR code or download link.
            </div>
          </div>
        ) : share?.isPasswordProtected && !share.isUnlocked ? (
          /* Password Protected Lock Screen */
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-6 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">Protected File Share</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                The sender has protected this transfer. Enter the password to unlock the files.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-slate-500 outline-none transition-colors"
              />

              {unlockError && (
                <p className="text-xs text-rose-400 flex items-center justify-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {unlockError}
                </p>
              )}

              <button
                type="submit"
                disabled={isUnlocking}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {isUnlocking ? 'Verifying Password...' : 'Unlock Files'}
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked / Public Download View */
          <div className="space-y-6">
            {/* Share Metadata Card */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight leading-snug">
                    {share?.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {share?.files?.length || share?.fileCount || 1} file
                    {(share?.files?.length || share?.fileCount || 1) !== 1 ? 's' : ''} available (
                    {formatBytes(share?.totalSize || 0)})
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>
              </div>

              {/* Download All CTA if multiple files */}
              {share?.files && share.files.length > 1 && (
                <button
                  id="recipient-download-all-btn"
                  onClick={handleDownloadAll}
                  disabled={isDownloadingAll}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/20"
                >
                  <ArrowDownToLine className={`w-4 h-4 ${isDownloadingAll ? 'animate-bounce' : ''}`} />
                  <span>
                    {isDownloadingAll ? 'Preparing Streaming Zip...' : 'Download All as ZIP'}
                  </span>
                </button>
              )}
            </div>

            {/* Files List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Files in Transfer
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {share?.files?.length || 0} items
                </span>
              </div>

              <div className="space-y-2.5">
                {share?.files?.map((file) => (
                  <div
                    key={file.fileId}
                    id={`recipient-file-${file.fileId}`}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-slate-800/90 border border-slate-700/60 shrink-0">
                        {getFileIcon(file.mimeType, file.fileName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-white truncate" title={file.fileName}>
                          {file.fileName}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <span>{formatBytes(file.fileSize)}</span>
                          <span>•</span>
                          <span className="truncate">{file.mimeType}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadFile(file)}
                      disabled={downloadingFileId === file.fileId}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Download className={`w-3.5 h-3.5 ${downloadingFileId === file.fileId ? 'animate-bounce' : ''}`} />
                      <span>{downloadingFileId === file.fileId ? 'Streaming...' : 'Download'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Expiration & Limits telemetry */}
            <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {share?.expiresAt
                  ? `Expires in ${Math.max(0, Math.round((share.expiresAt - Date.now()) / (1000 * 3600)))}h`
                  : 'Does not expire'}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <HardDrive className="w-3 h-3 text-slate-400" />
                {share?.downloadCount || 0} downloads
                {share?.maxDownloads ? ` / ${share.maxDownloads}` : ''}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-900/60 p-4 text-center text-[11px] text-slate-500 font-mono">
        AirLoom • Streaming chunked transfer conduit • No app installation required
      </footer>
    </div>
  );
};
