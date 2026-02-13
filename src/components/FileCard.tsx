import { useState } from 'react';
import { QRCodeGenerator } from './QRCodeGenerator';
import { HandGestureCamera } from './HandGestureCamera';
import { saveSharedUrl } from '../lib/supabase';

interface FileCardProps {
  fileName: string;
  fileUrl: string;
  fileType: string;
  folder: string;
  createdAt?: string;
  onDelete?: () => void;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📄';
  if (type.includes('zip') || type.includes('rar')) return '📦';
  return '📎';
}

function getFileTypeLabel(type: string) {
  if (type.startsWith('image/')) return 'Gambar';
  if (type.startsWith('video/')) return 'Video';
  if (type.startsWith('audio/')) return 'Audio';
  if (type.includes('pdf')) return 'PDF';
  return 'File';
}

function isImage(type: string) {
  return type.startsWith('image/');
}

function isVideo(type: string) {
  return type.startsWith('video/');
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function FileCard({ fileName, fileUrl, fileType, folder, createdAt, onDelete }: FileCardProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleFistDetected = async () => {
    try {
      const success = await saveSharedUrl(fileUrl, fileName, fileType);
      if (success) {
        setSendStatus('success');
        await navigator.clipboard.writeText(fileUrl).catch(() => {});
      } else {
        setSendStatus('error');
      }
    } catch {
      setSendStatus('error');
    }

    // Reset status after a while
    setTimeout(() => setSendStatus('idle'), 4000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-indigo-200 overflow-hidden transition-all duration-500 hover:-translate-y-1">
        {/* Preview */}
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          {isImage(fileType) ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
              )}
              <img
                src={fileUrl}
                alt={fileName}
                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
              />
            </>
          ) : isVideo(fileType) ? (
            <div className="relative w-full h-full">
              <video
                src={fileUrl}
                className="w-full h-full object-cover"
                preload="metadata"
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
              <div className="text-center animate-float">
                <span className="text-6xl block mb-2">{getFileIcon(fileType)}</span>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{getFileTypeLabel(fileType)}</span>
              </div>
            </div>
          )}

          {/* Type Badge */}
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
            {getFileIcon(fileType)} {getFileTypeLabel(fileType)}
          </div>

          {/* Folder Badge */}
          <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-md text-gray-600 text-[10px] px-2 py-1 rounded-full font-mono opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
            📁 {folder.slice(0, 12)}...
          </div>

          {/* QR Toggle */}
          <button
            onClick={() => setShowQR(!showQR)}
            className={`absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-lg active:scale-90 transition-all duration-300 ${
              showQR
                ? 'bg-indigo-600 text-white rotate-45'
                : 'bg-white/90 hover:bg-white text-gray-700 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'
            }`}
            title="QR Code"
          >
            {showQR ? '✕' : '⬡'}
          </button>

          {/* QR Overlay */}
          {showQR && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex items-center justify-center p-4">
              <QRCodeGenerator url={fileUrl} size={140} />
            </div>
          )}

          {/* Success overlay after gesture */}
          {sendStatus === 'success' && (
            <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center animate-fade-in">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-lg animate-success-bounce flex items-center gap-2">
                <span className="text-green-500 text-xl">✅</span>
                <span className="text-sm font-semibold text-green-700">Terkirim!</span>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm truncate" title={fileName}>
              {fileName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {createdAt && (
                <p className="text-[11px] text-gray-400">
                  {new Date(createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
              {formatFileSize() && <span className="text-[11px] text-gray-300">•</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 active:scale-[0.96] transition-all ${
                copied
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {copied ? '✓ Disalin' : '📋 Copy'}
            </button>

            <button
              onClick={() => setShowCamera(true)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 active:scale-[0.96] border transition-all ${
                sendStatus === 'success'
                  ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-200'
                  : sendStatus === 'error'
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-200'
              }`}
            >
              {sendStatus === 'success'
                ? '✅ Terkirim'
                : sendStatus === 'error'
                ? '❌ Gagal'
                : '✋ Kirim'}
            </button>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-gray-50 hover:bg-blue-50 rounded-xl text-xs font-medium text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 flex items-center justify-center active:scale-[0.96]"
              title="Buka file"
            >
              ↗
            </a>
          </div>

          {onDelete && (
            <button
              onClick={onDelete}
              className="w-full py-2 text-[11px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              🗑️ Hapus file
            </button>
          )}
        </div>
      </div>

      {/* Hand Gesture Camera Modal */}
      <HandGestureCamera
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onFistDetected={handleFistDetected}
        fileUrl={fileUrl}
        fileName={fileName}
      />
    </>
  );
}
