import { useState, useRef, useCallback } from 'react';
import { uploadFile } from '../lib/supabase';

interface FileUploaderProps {
  onUploadSuccess: () => void;
}

export function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<
    { name: string; status: 'uploading' | 'done' | 'error' }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setIsUploading(true);
      const progress = fileArray.map((f) => ({
        name: f.name,
        status: 'uploading' as const,
      }));
      setUploadProgress(progress);

      for (let i = 0; i < fileArray.length; i++) {
        try {
          const result = await uploadFile(fileArray[i]);
          setUploadProgress((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], status: result ? 'done' : 'error' };
            return next;
          });
        } catch {
          setUploadProgress((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], status: 'error' };
            return next;
          });
        }
      }

      setIsUploading(false);
      onUploadSuccess();

      setTimeout(() => setUploadProgress([]), 4000);
    },
    [onUploadSuccess]
  );

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
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-10 md:p-16 text-center cursor-pointer transition-all duration-500 ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50/80 scale-[1.01] shadow-xl shadow-indigo-100'
            : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-lg'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="space-y-5">
          <div
            className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 ${
              isDragging
                ? 'bg-indigo-500 text-white scale-110 shadow-xl shadow-indigo-200 rotate-6'
                : 'bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-500'
            }`}
          >
            {isUploading ? (
              <div className="w-10 h-10 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            ) : (
              <svg
                className="w-9 h-9"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
            )}
          </div>

          <div>
            <p className="text-lg font-semibold text-gray-700">
              {isUploading
                ? 'Mengupload...'
                : isDragging
                ? 'Lepaskan file di sini!'
                : 'Drag & drop file di sini'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              atau{' '}
              <span className="text-indigo-500 font-medium underline underline-offset-2 decoration-indigo-200">
                klik untuk memilih
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {['Gambar', 'Video', 'Audio', 'PDF', 'Dokumen'].map((type) => (
              <span
                key={type}
                className="text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100"
              >
                {type}
              </span>
            ))}
          </div>

          <p className="text-[11px] text-gray-300">
            Setiap file akan disimpan dalam folder unik di Supabase Storage
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 space-y-3 animate-slide-up">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Progress Upload
          </h4>
          <div className="space-y-2">
            {uploadProgress.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50 animate-fade-in-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-300 ${
                    item.status === 'uploading'
                      ? 'bg-amber-100 text-amber-600'
                      : item.status === 'done'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {item.status === 'uploading'
                    ? '⏳'
                    : item.status === 'done'
                    ? '✅'
                    : '❌'}
                </div>
                <span className="text-sm text-gray-700 flex-1 truncate font-medium">
                  {item.name}
                </span>
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                    item.status === 'uploading'
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : item.status === 'done'
                      ? 'bg-green-50 text-green-600 border border-green-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {item.status === 'uploading'
                    ? 'Uploading...'
                    : item.status === 'done'
                    ? 'Selesai ✓'
                    : 'Gagal'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
