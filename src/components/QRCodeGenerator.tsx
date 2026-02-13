import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  url: string;
  size?: number;
}

export function QRCodeGenerator({ url, size = 150 }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
    }
  }, [url, size]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col items-center gap-3 animate-scale-in">
      <div className="p-3 bg-white rounded-2xl shadow-lg border border-indigo-100">
        <canvas ref={canvasRef} className="rounded-xl" />
      </div>
      <button
        onClick={handleCopyUrl}
        className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
          copied
            ? 'bg-green-100 text-green-700'
            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
        }`}
      >
        {copied ? '✓ URL Disalin!' : '📋 Salin URL'}
      </button>
      <p className="text-[10px] text-gray-400 max-w-[160px] truncate text-center" title={url}>
        Scan QR untuk akses file
      </p>
    </div>
  );
}
