import React from 'react';
import {
  X,
  HardDrive,
  Cpu,
  Layers,
  ShieldAlert,
  CheckCircle2,
  Server,
  Zap,
  Lock,
} from 'lucide-react';
import { DashboardStats } from '../types';
import { formatBytes } from '../lib/api';

interface SystemInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DashboardStats | null;
}

export const SystemInfoModal: React.FC<SystemInfoModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                AirLoom Architecture Specification
              </h3>
              <p className="text-xs text-slate-400">Production-grade 10 GB streaming storage engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-300 scrollbar-thin">
          {/* 10 GB Architecture Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Zap className="w-4 h-4" />
              <span>10 GB Streaming & RAM Safety Guarantee</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Standard file transfer tools crash memory by loading entire files into RAM using <code className="text-rose-400 bg-slate-900 px-1 py-0.5 rounded">readFile()</code>. AirLoom splits uploads into <span className="text-white font-semibold">5 MB chunks</span> directly via browser <code className="text-cyan-400 bg-slate-900 px-1 py-0.5 rounded">file.slice()</code> and streams them to backend disk via Node.js write streams, calculating SHA-256 integrity incrementally.
            </p>
          </div>

          {/* Technical Specs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px]">CONFIGURED MAX UPLOAD</span>
              <p className="text-sm font-bold text-white mt-0.5">
                {stats ? formatBytes(stats.maxFileSizeBytes) : '10 GB'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px]">STREAMING CHUNK SIZE</span>
              <p className="text-sm font-bold text-white mt-0.5">
                {stats ? formatBytes(stats.chunkSizeBytes) : '5 MB'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px]">HTTP RANGE REQUESTS</span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Supported (206)
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px]">ZIP STREAMING ON-THE-FLY</span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Archiver Piped
              </p>
            </div>
          </div>

          {/* Architecture & Security */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Direct Security & Architecture
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>High-Resolution QR Generator:</strong> Runs natively on client/server using SVG and canvas rasterization.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Optimized Direct Storage:</strong> Atomic chunk writes directly onto high-speed disk storage.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Hardware-Accelerated Security:</strong> Scrypt password hashing with constant-time verification.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Close Spec
          </button>
        </div>
      </div>
    </div>
  );
};
