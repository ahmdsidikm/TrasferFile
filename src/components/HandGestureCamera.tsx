import { useEffect, useRef, useState, useCallback } from 'react';

interface HandGestureCameraProps {
  isOpen: boolean;
  onClose: () => void;
  onFistDetected: () => Promise<void>;
  fileUrl: string;
  fileName: string;
}

export function HandGestureCamera({
  isOpen,
  onClose,
  onFistDetected,
  fileUrl,
  fileName,
}: HandGestureCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const handsRef = useRef<unknown>(null);
  const [status, setStatus] = useState<string>('Memuat kamera...');
  const [gesture, setGesture] = useState<string>('');
  const [phase, setPhase] = useState<'loading' | 'ready' | 'detected' | 'success' | 'closing'>('loading');
  const fistCountRef = useRef(0);
  const processingRef = useRef(false);
  const closingRef = useRef(false);

  const isFist = useCallback((landmarks: Array<{ x: number; y: number; z: number }>) => {
    const fingerTips = [8, 12, 16, 20];
    const fingerPIPs = [6, 10, 14, 18];

    let curledFingers = 0;

    for (let i = 0; i < fingerTips.length; i++) {
      const tip = landmarks[fingerTips[i]];
      const pip = landmarks[fingerPIPs[i]];
      if (tip.y > pip.y) {
        curledFingers++;
      }
    }

    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const indexMCP = landmarks[5];

    const thumbCurled =
      Math.abs(thumbTip.x - indexMCP.x) < Math.abs(thumbIP.x - indexMCP.x);

    if (thumbCurled) curledFingers++;

    return curledFingers >= 4;
  }, []);

  const drawLandmarks = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: Array<{ x: number; y: number }>, width: number, height: number, isFistGesture: boolean) => {
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17],
      ];

      const lineColor = isFistGesture ? '#22c55e' : '#818cf8';
      const dotColor = isFistGesture ? '#16a34a' : '#6366f1';

      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      for (const [start, end] of connections) {
        const gradient = ctx.createLinearGradient(
          landmarks[start].x * width, landmarks[start].y * height,
          landmarks[end].x * width, landmarks[end].y * height,
        );
        gradient.addColorStop(0, lineColor);
        gradient.addColorStop(1, `${lineColor}88`);
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
        ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
        ctx.stroke();
      }

      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        const r = [0, 4, 8, 12, 16, 20].includes(i) ? 6 : 4;
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, r, 0, 2 * Math.PI);
        ctx.fillStyle = dotColor;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    },
    []
  );

  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const h = handsRef.current as { close?: () => void } | null;
    if (h && typeof h.close === 'function') {
      h.close();
    }
    handsRef.current = null;
    fistCountRef.current = 0;
    processingRef.current = false;
    closingRef.current = false;
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setPhase('loading');
    setGesture('');
    closingRef.current = false;

    const initCamera = async () => {
      try {
        setStatus('Mengakses kamera...');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus('Memuat MediaPipe Hands...');

        const { Hands } = await import('@mediapipe/hands');

        if (cancelled) return;

        const hands = new Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        interface HandResult {
          multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
        }

        hands.onResults((results: HandResult) => {
          if (cancelled || closingRef.current) return;

          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;

          // Draw mirrored video
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            const mirroredLandmarks = landmarks.map((lm) => ({
              ...lm,
              x: 1 - lm.x,
            }));

            const fistDetected = isFist(landmarks);
            drawLandmarks(ctx, mirroredLandmarks, canvas.width, canvas.height, fistDetected);

            if (fistDetected) {
              fistCountRef.current++;
              setGesture('✊ Mengepal terdeteksi!');
              setPhase('detected');

              // Green overlay with smooth fade
              ctx.fillStyle = `rgba(34, 197, 94, ${Math.min(fistCountRef.current / 15, 0.35)})`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Progress indicator
              const progress = Math.min(fistCountRef.current / 10, 1);
              const barWidth = canvas.width * 0.6;
              const barX = (canvas.width - barWidth) / 2;
              ctx.fillStyle = 'rgba(0,0,0,0.4)';
              ctx.roundRect(barX - 4, canvas.height - 52, barWidth + 8, 24, 12);
              ctx.fill();
              ctx.fillStyle = '#22c55e';
              ctx.roundRect(barX, canvas.height - 48, barWidth * progress, 16, 8);
              ctx.fill();

              if (fistCountRef.current >= 10 && !processingRef.current) {
                processingRef.current = true;
                closingRef.current = true;
                setPhase('success');

                // Execute callback, then auto-close
                onFistDetected().then(() => {
                  setTimeout(() => {
                    setPhase('closing');
                    setTimeout(() => {
                      onClose();
                    }, 600);
                  }, 1500);
                });
              }
            } else {
              fistCountRef.current = Math.max(0, fistCountRef.current - 2);
              if (!processingRef.current) {
                setGesture('🖐️ Kepalkan tangan untuk mengirim');
                setPhase('ready');
              }
            }
          } else {
            if (!processingRef.current) {
              fistCountRef.current = 0;
              setGesture('👋 Arahkan tangan ke kamera...');
              setPhase('ready');
            }
          }
        });

        handsRef.current = hands;
        setPhase('ready');
        setStatus('Siap! Kepalkan tangan untuk mengirim.');

        const processFrame = async () => {
          if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
            if (!cancelled) animFrameRef.current = requestAnimationFrame(processFrame);
            return;
          }

          try {
            await (hands as unknown as { send: (opts: { image: HTMLVideoElement }) => Promise<void> }).send({ image: videoRef.current });
          } catch (_) {
            // ignore frame errors
          }

          if (!cancelled) {
            animFrameRef.current = requestAnimationFrame(processFrame);
          }
        };

        animFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.error('Camera/MediaPipe error:', err);
        setStatus(
          `Error: ${err instanceof Error ? err.message : 'Gagal mengakses kamera'}`
        );
        setPhase('ready');
      }
    };

    initCamera();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [isOpen, isFist, drawLandmarks, onFistDetected, onClose, cleanup]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop-in ${phase === 'closing' ? 'opacity-0 transition-opacity duration-500' : ''}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden ${phase === 'closing' ? 'animate-scale-out' : 'animate-scale-in'}`}
        style={phase === 'closing' ? { animation: 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards' } : {}}
      >
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className={`p-5 flex items-center justify-between transition-colors duration-500 ${
            phase === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
            phase === 'detected' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
            'bg-gradient-to-r from-violet-600 to-indigo-600'
          }`}>
            <div className="text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {phase === 'success' ? '✅' : '✋'} Gesture Control
              </h3>
              <p className="text-sm opacity-80 truncate max-w-[220px]">{fileName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg active:scale-90"
            >
              ✕
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            {phase === 'detected' && (
              <div className="h-full bg-white animate-shimmer rounded-full" />
            )}
          </div>
        </div>

        {/* Camera View */}
        <div className="relative bg-gray-900 aspect-video">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-0"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover"
          />

          {/* Loading overlay */}
          {phase === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 animate-fade-in">
              <div className="text-center text-white">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-transparent border-t-white rounded-full animate-spin" />
                  <div className="absolute inset-2 border-4 border-transparent border-t-indigo-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                </div>
                <p className="text-sm font-medium">{status}</p>
                <p className="text-xs text-gray-400 mt-1">Mohon izinkan akses kamera</p>
              </div>
            </div>
          )}

          {/* Success overlay */}
          {phase === 'success' && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-600/60 animate-fade-in">
              <div className="text-center animate-success-bounce">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white text-xl font-bold">Berhasil!</p>
                <p className="text-white/80 text-sm mt-1">URL disalin ke Supabase</p>
              </div>
            </div>
          )}

          {/* Gesture guide overlay — only when ready */}
          {phase === 'ready' && (
            <div className="absolute bottom-3 left-3 right-3 animate-fade-in-up">
              <div className="bg-black/50 backdrop-blur-md rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center text-xl animate-hand-pulse">
                  ✊
                </div>
                <div>
                  <p className="text-white text-xs font-medium">Kepalkan tangan Anda</p>
                  <p className="text-white/50 text-[10px]">Tahan beberapa detik untuk mengirim</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="p-4 space-y-3">
          <div
            className={`text-center text-sm font-medium py-2.5 px-4 rounded-xl transition-all duration-500 ${
              phase === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : phase === 'detected'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-gray-50 text-gray-600 border border-gray-200'
            }`}
          >
            {phase === 'success'
              ? '✅ URL berhasil dikirim! Menutup...'
              : gesture || status}
          </div>

          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">URL File</p>
            <p className="text-xs text-indigo-600 break-all font-mono leading-relaxed">{fileUrl}</p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 active:scale-[0.98]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
