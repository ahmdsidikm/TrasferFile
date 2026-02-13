import { useState, useEffect, useCallback } from 'react';
import { FileUploader } from './components/FileUploader';
import { FileCard } from './components/FileCard';
import { getUploadedFiles, deleteFile } from './lib/supabase';

interface UploadedFile {
  id: string;
  name: string;
  folder: string;
  publicUrl: string;
  created_at: string;
  metadata?: {
    mimetype?: string;
    size?: number;
  };
}

function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac'];

  if (imageExts.includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  if (videoExts.includes(ext)) return `video/${ext}`;
  if (audioExts.includes(ext)) return `audio/${ext}`;
  if (ext === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
}

type ViewType = 'upload' | 'files';

export function App() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewType>('upload');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUploadedFiles();
      setFiles(data.filter((f) => f.name !== '.emptyFolderPlaceholder'));
    } catch (err) {
      setError('Gagal memuat file. Pastikan bucket "media-files" sudah dibuat di Supabase.');
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUploadSuccess = () => {
    fetchFiles();
    setView('files');
  };

  const handleDelete = async (folder: string, fileName: string) => {
    if (!confirm(`Hapus file "${fileName}"?`)) return;
    const success = await deleteFile(folder, fileName);
    if (success) {
      setFiles((prev) => prev.filter((f) => !(f.folder === folder && f.name === fileName)));
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50">
      {/* Decorative bg elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-violet-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-pink-100/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="glass border-b border-gray-200/60 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16 sm:h-20">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200/60 animate-gradient">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight">CloudVault</h1>
                  <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">Upload • QR Code • Gesture</p>
                </div>
              </div>

              {/* Nav pills + Terima button */}
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100/80 rounded-2xl p-1 border border-gray-200/60">
                  <button
                    onClick={() => setView('upload')}
                    className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                      view === 'upload'
                        ? 'bg-white text-gray-800 shadow-md'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="sm:hidden">📤</span>
                    <span className="hidden sm:inline">📤 Upload</span>
                  </button>
                  <button
                    onClick={() => { setView('files'); fetchFiles(); }}
                    className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                      view === 'files'
                        ? 'bg-white text-gray-800 shadow-md'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="sm:hidden">📁</span>
                    <span className="hidden sm:inline">📁 File Saya</span>
                    {files.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        view === 'files' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {files.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Tombol Terima */}
                <a
                  href="https://asmdatabase.vercel.app/Terima.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-emerald-200/50 hover:shadow-lg hover:shadow-emerald-200/60 active:scale-95 transition-all duration-300 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Terima</span>
                  <span className="sm:hidden">✓</span>
                </a>

                <div className="hidden md:flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-[11px] px-3 py-2 rounded-xl border border-emerald-200/60 font-medium">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Connected
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4 animate-fade-in-down">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">⚠️</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">{error}</p>
                <p className="text-xs text-red-500 mt-1 leading-relaxed">
                  Buat bucket "media-files" dengan akses public di Supabase Dashboard, dan jalankan SQL script yang disediakan.
                </p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-auto">✕</button>
            </div>
          )}

          {/* Upload View */}
          {view === 'upload' && (
            <div className="space-y-8 animate-fade-in-up">
              <div className="text-center max-w-xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 tracking-tight">
                  Upload File Anda
                </h2>
                <p className="text-gray-400 text-sm sm:text-base mt-3 leading-relaxed">
                  Upload foto, video, atau file apapun. Setiap file mendapat folder unik & QR code otomatis.
                </p>
              </div>

              <FileUploader onUploadSuccess={handleUploadSuccess} />

              {/* Feature cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">📁</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 text-sm">Folder Unik</h4>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Setiap file tersimpan di folder terpisah untuk organisasi yang rapi
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">⬡</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 text-sm">QR Code</h4>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Scan QR code untuk langsung membuka file di perangkat manapun
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">✋</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 text-sm">Gesture Control</h4>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Kepalkan tangan di kamera untuk menyimpan URL ke database Supabase
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Files View */}
          {view === 'files' && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Header + Search */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight">
                    File Saya
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {files.length} file dalam {files.length} folder
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 sm:flex-none">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Cari file..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-56 pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                    />
                  </div>

                  <button
                    onClick={fetchFiles}
                    className="px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 shadow-sm active:scale-95"
                    title="Refresh"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {/* File Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center animate-fade-in">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
                      <div className="absolute inset-0 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium">Memuat file...</p>
                  </div>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-24 animate-fade-in">
                  <div className="animate-float">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-6">
                      <span className="text-4xl">{searchQuery ? '🔍' : '📂'}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {searchQuery ? 'File tidak ditemukan' : 'Belum ada file'}
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    {searchQuery
                      ? `Tidak ada file dengan nama "${searchQuery}"`
                      : 'Upload file pertama Anda untuk memulai'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setView('upload')}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-200 active:scale-95 transition-all"
                    >
                      📤 Upload Sekarang
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
                  {filteredFiles.map((file) => (
                    <FileCard
                      key={file.id || `${file.folder}-${file.name}`}
                      fileName={file.name}
                      fileUrl={file.publicUrl}
                      fileType={file.metadata?.mimetype || getFileType(file.name)}
                      folder={file.folder}
                      createdAt={file.created_at}
                      onDelete={() => handleDelete(file.folder, file.name)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-10 mt-8 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <p className="font-medium">CloudVault — Media Storage dengan QR & Gesture</p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Supabase
              </span>
              <span className="text-gray-200">·</span>
              <span>MediaPipe</span>
              <span className="text-gray-200">·</span>
              <span>React</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}