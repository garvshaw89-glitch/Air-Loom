import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  File,
  FileText,
  FileArchive,
  Image as ImageIcon,
  Video,
  Music,
  Code2,
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { UploadItem, UploadedFile } from '../types';
import {
  uploadFileChunked,
  formatBytes,
  formatSpeed,
  formatETA,
} from '../lib/api';

interface UploadWorkspaceProps {
  onProceedToShare: (uploadedFiles: UploadedFile[], initialMode?: 'bundle' | 'individual') => void;
  onExploreDemo?: () => void;
}

export const UploadWorkspace: React.FC<UploadWorkspaceProps> = ({ onProceedToShare, onExploreDemo }) => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to get mime-specific icon
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
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css', 'rs', 'go'].includes(ext)) {
      return <Code2 className="w-5 h-5 text-emerald-400" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  // Start uploading a queued item
  const startUpload = useCallback(async (item: UploadItem) => {
    const controller = new AbortController();

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              status: 'uploading',
              abortController: controller,
              error: undefined,
              progress: 0,
            }
          : i
      )
    );

    try {
      const result = await uploadFileChunked(
        item.file,
        ({ progress, uploadedBytes, speed, eta, status }) => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    progress,
                    uploadedBytes,
                    speed,
                    eta,
                    status: status === 'assembling' ? 'assembling' : 'uploading',
                  }
                : i
            )
          );
        },
        controller.signal
      );

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'completed',
                progress: 100,
                speed: 0,
                eta: 0,
                result,
              }
            : i
        )
      );
    } catch (err: any) {
      if (controller.signal.aborted) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'cancelled' } : i))
        );
      } else {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'error',
                  error: err.message || 'Upload failed',
                }
              : i
          )
        );
      }
    }
  }, []);

  // Add files to queue and automatically trigger uploads
  const handleAddFiles = (files: FileList | File[]) => {
    const newItems: UploadItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
      uploadedBytes: 0,
      speed: 0,
      eta: 0,
    }));

    setItems((prev) => [...prev, ...newItems]);

    // Launch uploads in parallel (chunking handles network streams cleanly)
    newItems.forEach((item) => {
      startUpload(item);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleCancel = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.abortController) {
        item.abortController.abort();
      }
      return prev.map((i) => (i.id === id ? { ...i, status: 'cancelled' } : i));
    });
  };

  const handleRemove = (id: string) => {
    handleCancel(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleRetry = (item: UploadItem) => {
    startUpload(item);
  };

  // Demo file generator for quick evaluation without local test files
  const handleAddDemoFiles = () => {
    const blob1 = new Blob(['AirLoom Technical Specification Document: High-Throughput Transfer Conduit v2'], {
      type: 'application/pdf',
    });
    const file1 = new (window as any).File([blob1], 'AirLoom_Architecture_Spec.pdf', {
      type: 'application/pdf',
    });

    const blob2 = new Blob([JSON.stringify({ project: 'AirLoom Pro', version: '2.4.0', status: 'ready' }, null, 2)], {
      type: 'application/json',
    });
    const file2 = new (window as any).File([blob2], 'production_manifest.json', {
      type: 'application/json',
    });

    handleAddFiles([file1, file2]);
  };

  const completedFiles: UploadedFile[] = items
    .filter((i) => i.status === 'completed' && i.result)
    .map((i) => i.result!);

  const allCompleted = items.length > 0 && items.every((i) => i.status === 'completed');
  const isUploadingAny = items.some((i) => i.status === 'uploading' || i.status === 'assembling');

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Dropzone Container */}
      <div
        id="file-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer group ${
          isDragging
            ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01] shadow-2xl shadow-cyan-500/20'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleAddFiles(e.target.files);
            }
          }}
        />

        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-indigo-500/5 rounded-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner group-hover:scale-110 group-hover:border-cyan-400 transition-all duration-300">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Drop your files here, or <span className="text-cyan-400 underline underline-offset-4 decoration-cyan-400/50 group-hover:decoration-cyan-400">browse</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Upload single or multiple files up to <span className="text-slate-200 font-semibold">10 GB</span> with chunked streaming.
            </p>
          </div>

          {/* Quick stats tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Private & Direct
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              5MB Chunk Streaming
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              RAM-safe up to 10 GB
            </span>
          </div>

          {/* Demo helper */}
          <div className="pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddDemoFiles();
              }}
              className="text-xs text-slate-400 hover:text-cyan-400 underline transition-colors"
            >
              Need test files? Click here to load demo files
            </button>
          </div>
        </div>
      </div>

      {/* Upload Queue Section */}
      {items.length > 0 && (
        <div id="upload-queue-container" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Upload Queue
              </h4>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {items.length} file{items.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {completedFiles.length > 0 && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {completedFiles.length} ready
                </span>
              )}
              <button
                onClick={() => setItems([])}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear list
              </button>
            </div>
          </div>

          {/* File cards list */}
          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                id={`upload-item-${item.id}`}
                className="relative overflow-hidden rounded-xl bg-slate-900/60 border border-slate-800/90 p-4 transition-all"
              >
                {/* Visual Progress Background */}
                <div
                  className={`absolute inset-0 opacity-15 pointer-events-none transition-all duration-300 ${
                    item.status === 'completed'
                      ? 'bg-emerald-500'
                      : item.status === 'error'
                      ? 'bg-rose-500'
                      : 'bg-cyan-500'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />

                <div className="relative z-10 flex items-center justify-between gap-4">
                  {/* Icon & File Details */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                      {getFileIcon(item.type, item.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate" title={item.name}>
                          {item.name}
                        </p>
                        <span className="text-xs font-mono text-slate-400 shrink-0">
                          {formatBytes(item.size)}
                        </span>
                      </div>

                      {/* Status / Telemetry line */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                        {item.status === 'uploading' && (
                          <>
                            <span className="text-cyan-400 font-mono font-medium">
                              {item.progress}%
                            </span>
                            <span className="flex items-center gap-1 font-mono text-slate-300">
                              <Zap className="w-3 h-3 text-amber-400" />
                              {formatSpeed(item.speed)}
                            </span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3 h-3" />
                              {formatETA(item.eta)}
                            </span>
                          </>
                        )}

                        {item.status === 'assembling' && (
                          <span className="text-indigo-400 flex items-center gap-1.5 animate-pulse">
                            <Layers className="w-3.5 h-3.5" />
                            Assembling chunks & computing SHA-256...
                          </span>
                        )}

                        {item.status === 'completed' && (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Uploaded & verified
                          </span>
                        )}

                        {item.status === 'error' && (
                          <span className="text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {item.error || 'Upload error'}
                          </span>
                        )}

                        {item.status === 'cancelled' && (
                          <span className="text-slate-400 italic">Cancelled</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.status === 'error' && (
                      <button
                        onClick={() => handleRetry(item)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Retry upload"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}

                    {item.status === 'uploading' && (
                      <button
                        onClick={() => handleCancel(item.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Cancel upload"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full transition-all duration-300 ${
                      item.status === 'completed'
                        ? 'bg-emerald-400'
                        : item.status === 'error'
                        ? 'bg-rose-500'
                        : 'bg-gradient-to-r from-cyan-400 to-indigo-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Action to proceed to QR Generation */}
          {completedFiles.length > 0 && (
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 text-center sm:text-left">
                <span className="font-semibold text-slate-200">
                  {completedFiles.length} of {items.length}
                </span>{' '}
                file{items.length !== 1 ? 's' : ''} stored safely on backend disk.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {completedFiles.length > 1 && (
                  <button
                    id="generate-individual-qr-btn"
                    onClick={() => onProceedToShare(completedFiles, 'individual')}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-medium transition-all"
                  >
                    Individual QRs
                  </button>
                )}

                <button
                  id="generate-bundle-qr-btn"
                  onClick={() => onProceedToShare(completedFiles, 'bundle')}
                  disabled={isUploadingAny}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-lg ${
                    isUploadingAny
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02]'
                  }`}
                >
                  <span>Generate QR Code</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
