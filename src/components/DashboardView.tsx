import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  FolderArchive,
  Search,
  Filter,
  LayoutGrid,
  List,
  Lock,
  Globe,
  Clock,
  HardDrive,
  Copy,
  Check,
  QrCode,
  Download,
  Trash2,
  Power,
  ExternalLink,
  Shield,
  FileText,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';
import { ShareData, DashboardStats } from '../types';
import {
  getDashboardShares,
  getDashboardStats,
  toggleShareStatus,
  deleteShare,
  formatBytes,
} from '../lib/api';

interface DashboardViewProps {
  onOpenSharePage: (token: string) => void;
  onNavigateToUpload: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenSharePage,
  onNavigateToUpload,
}) => {
  const [shares, setShares] = useState<ShareData[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'protected' | 'expired'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // QR Modal State
  const [activeQRShare, setActiveQRShare] = useState<ShareData | null>(null);
  const [qrModalDataUrl, setQrModalDataUrl] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sharesList, statsData] = await Promise.all([
        getDashboardShares(),
        getDashboardStats(),
      ]);
      setShares(sharesList);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and Sort
  const filteredShares = useMemo(() => {
    return shares.filter((share) => {
      // Search text filter
      const matchesSearch =
        share.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        share.files.some((f) => f.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Status filter
      if (filterStatus === 'active') return share.status === 'active';
      if (filterStatus === 'protected') return share.isPasswordProtected;
      if (filterStatus === 'expired') return share.status === 'expired';

      return true;
    });
  }, [shares, searchQuery, filterStatus]);

  const handleCopy = (share: ShareData) => {
    const url = `${window.location.origin}/share/${share.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(share.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = async (share: ShareData) => {
    try {
      const res = await toggleShareStatus(share.id);
      setShares((prev) =>
        prev.map((s) => (s.id === share.id ? { ...s, status: res.status as any } : s))
      );
    } catch (err) {
      alert('Failed to toggle share');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this share and its stored files?')) {
      return;
    }
    try {
      await deleteShare(id);
      setShares((prev) => prev.filter((s) => s.id !== id));
      loadData();
    } catch (err) {
      alert('Failed to delete share');
    }
  };

  const openQRModal = async (share: ShareData) => {
    setActiveQRShare(share);
    const url = `${window.location.origin}/share/${share.token}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        margin: 2,
        scale: 8,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrModalDataUrl(dataUrl);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Header & Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white leading-tight">
              {stats?.activeSharesCount ?? 0}
            </p>
            <p className="text-xs text-slate-400">Active Shares</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white leading-tight">
              {stats?.totalDownloads ?? 0}
            </p>
            <p className="text-xs text-slate-400">Total Downloads</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white leading-tight">
              {formatBytes(stats?.storageUsedBytes ?? 0)}
            </p>
            <p className="text-xs text-slate-400">Disk Used</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white leading-tight">
              {stats?.protectedSharesCount ?? 0}
            </p>
            <p className="text-xs text-slate-400">Password Locked</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or file..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Status Filters */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {(['all', 'active', 'protected', 'expired'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterStatus(filter)}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                  filterStatus === filter
                    ? 'bg-slate-800 text-cyan-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'}`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Shares List / Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 mx-auto border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 mt-2 font-mono">Loading shares...</p>
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-slate-900/30 border border-slate-800/80 space-y-3">
          <FolderArchive className="w-12 h-12 mx-auto text-slate-600" />
          <h4 className="text-sm font-bold text-white">No shares found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'No shares match your search criteria.'
              : 'You have not created any AirLoom shares yet.'}
          </p>
          <button
            onClick={onNavigateToUpload}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
          >
            Upload Files Now
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShares.map((share) => (
            <div
              key={share.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {share.isPasswordProtected ? (
                      <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30" title="Password protected">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" title="Public access">
                        <Globe className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-medium ${
                        share.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : share.status === 'expired'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {share.status}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {formatBytes(share.totalSize || 0)}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-white truncate" title={share.title}>
                  {share.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {share.files.length} file{share.files.length !== 1 ? 's' : ''} •{' '}
                  <span className="font-mono">{share.downloadCount} dl</span>
                  {share.maxDownloads ? ` / ${share.maxDownloads}` : ''}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openQRModal(share)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                    title="View QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleCopy(share)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Copy Share Link"
                  >
                    {copiedId === share.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => onOpenSharePage(share.token)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Open share page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(share)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      share.status === 'active'
                        ? 'bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                    }`}
                    title={share.status === 'active' ? 'Disable share' : 'Enable share'}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(share.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete share"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Files</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Privacy</th>
                <th className="py-3 px-4">Downloads</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredShares.map((share) => (
                <tr key={share.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-white max-w-[200px] truncate">
                    {share.title}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{share.files.length}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {formatBytes(share.totalSize || 0)}
                  </td>
                  <td className="py-3 px-4">
                    {share.isPasswordProtected ? (
                      <span className="inline-flex items-center gap-1 text-indigo-400">
                        <Lock className="w-3 h-3" /> Protected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Globe className="w-3 h-3" /> Public
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {share.downloadCount}
                    {share.maxDownloads ? ` / ${share.maxDownloads}` : ''}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-medium ${
                        share.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : share.status === 'expired'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {share.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openQRModal(share)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400"
                        title="QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopy(share)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-300"
                        title="Copy Link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenSharePage(share.token)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-300"
                        title="Open"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(share.id)}
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Code Modal */}
      {activeQRShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-4 relative">
            <button
              onClick={() => setActiveQRShare(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-white truncate px-6">
              {activeQRShare.title}
            </h3>

            <div className="p-4 bg-white rounded-xl mx-auto inline-block shadow-lg">
              {qrModalDataUrl && (
                <img src={qrModalDataUrl} alt="QR Code" className="w-52 h-52 object-contain" />
              )}
            </div>

            <div className="text-xs text-slate-400 font-mono break-all bg-slate-950 p-2 rounded-lg border border-slate-800">
              {window.location.origin}/share/{activeQRShare.token}
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => handleCopy(activeQRShare)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Copy Link
              </button>
              <button
                onClick={() => onOpenSharePage(activeQRShare.token)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors"
              >
                Open Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
