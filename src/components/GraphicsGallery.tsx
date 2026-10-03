import React, { useState, useEffect, useRef } from 'react';
import { GraphicItem } from '../types/portfolio';
import { Upload, Plus, X, Image as ImageIcon, Download, Trash2, Eye, Check } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

interface GraphicsGalleryProps {
  theme: 'dark' | 'light';
}

export const GraphicsGallery: React.FC<GraphicsGalleryProps> = ({ theme }) => {
  const { isAdmin } = useAdmin();
  const [items, setItems] = useState<GraphicItem[]>(() => {
    try {
      const saved = localStorage.getItem('kw_graphic_gallery_uploads');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading gallery from localStorage:', e);
    }
    return [];
  });

  const [lightboxItem, setLightboxItem] = useState<GraphicItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Sync with Neon DB on mount
  useEffect(() => {
    fetch('/api/graphics')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('No graphics in DB');
      })
      .then((data: GraphicItem[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
          localStorage.setItem('kw_graphic_gallery_uploads', JSON.stringify(data));
        }
      })
      .catch((err) => {
        console.warn('Graphics fetch notice:', err);
      });
  }, []);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadClient, setUploadClient] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState('');
  const [uploadedFileType, setUploadedFileType] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadedFileType(file.type.split('/')[1]?.toUpperCase() || 'FILE');
    setUploadedFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');

    if (!uploadTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewDataUrl || !uploadTitle) return;

    const newItem: GraphicItem = {
      id: 'upload-' + Date.now(),
      title: uploadTitle,
      category: 'branding',
      image: previewDataUrl,
      fileType: uploadedFileType || 'IMG',
      fileSize: uploadedFileSize || '1 MB',
      description: uploadDescription || 'Graphic design creative asset.',
      client: uploadClient || 'Independent Client / Project',
      isUserUploaded: true,
      dateAdded: new Date().toISOString().split('T')[0]
    };

    // Save to Neon DB
    try {
      await fetch('/api/graphics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
    } catch (err) {
      console.warn('Neon DB sync notice:', err);
    }

    const updated = [newItem, ...items];
    setItems(updated);

    try {
      localStorage.setItem('kw_graphic_gallery_uploads', JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not persist to localStorage:', err);
    }

    setUploadSuccess(true);
    setTimeout(() => {
      setUploadSuccess(false);
      setIsUploadModalOpen(false);
      setUploadTitle('');
      setUploadClient('');
      setUploadDescription('');
      setPreviewDataUrl(null);
      setUploadedFileName('');
    }, 700);
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/graphics/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }

    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    try {
      localStorage.setItem('kw_graphic_gallery_uploads', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    if (lightboxItem?.id === id) setLightboxItem(null);
  };

  return (
    <section id="graphics" className="py-20 border-t transition-colors duration-200" style={{
      borderColor: theme === 'dark' ? '#1E2232' : '#E5E7EB'
    }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E2B714] mb-2">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Part 1 · Visual Arts & Design</span>
              <span aria-hidden="true">·</span>
              <span>{items.length} {items.length === 1 ? 'Artwork' : 'Artworks'}</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${
              theme === 'dark' ? 'text-white' : 'text-neutral-950'
            }`}>
              Graphic Design Gallery
            </h2>
            <p className={`mt-2 text-sm sm:text-base max-w-xl ${
              theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              Upload and showcase your branding, logos, posters, packaging, and vector artworks. Upload any PNG, JPG, or image files below.
            </p>
          </div>

          {/* Action: Upload Graphic Button (Owner Admin Only) */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Graphic / Image</span>
              </button>
            </div>
          )}
        </div>

        {/* Gallery Content */}
        {items.length === 0 ? (
          isAdmin ? (
            /* Admin Empty State */
            <div
              onClick={() => setIsUploadModalOpen(true)}
              className={`p-12 sm:p-16 text-center rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#12141F] border-[#252839] hover:border-[#E2B714]/60'
                  : 'bg-neutral-50 border-neutral-300 hover:border-amber-500'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-[#E2B714]/10 text-[#E2B714] mx-auto flex items-center justify-center mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className={`text-lg sm:text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-neutral-900'
              }`}>
                Your Graphic Design Gallery is Ready
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
                No artworks uploaded yet. Click here to upload your PNG, JPG, or design files to build your custom showcase.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUploadModalOpen(true);
                }}
                className="mt-6 px-6 py-2.5 text-xs font-semibold rounded-xl bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-colors inline-flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Your First Artwork</span>
              </button>
            </div>
          ) : (
            /* Public Visitor Empty State */
            <div className={`p-12 text-center rounded-2xl border ${
              theme === 'dark' ? 'bg-[#12141F] border-[#232635]' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className="w-14 h-14 rounded-full bg-[#E2B714]/10 text-[#E2B714] mx-auto flex items-center justify-center mb-3">
                <ImageIcon className="w-7 h-7" />
              </div>
              <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>
                Portfolio Gallery Curations in Progress
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                Brand identity packages, vector logomarks, and promotional graphics are currently being organized. Contact Kelvin directly for current design work and commissions.
              </p>
            </div>
          )
        ) : (
          /* Grid of Uploaded Items */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => setLightboxItem(item)}
                className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover:translate-y-[-2px] ${
                  theme === 'dark'
                    ? 'bg-[#12141F] border-[#232635] hover:border-[#383D55] shadow-lg'
                    : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Image frame */}
                <div className="relative aspect-4/3 overflow-hidden bg-neutral-900">
                  <img
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Delete button (Owner Admin only) */}
                  {isAdmin && (
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        title="Delete artwork"
                        className="p-1.5 rounded-lg bg-black/60 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Hover Inspect Icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="p-3 rounded-full bg-black/70 text-white backdrop-blur-md">
                      <Eye className="w-5 h-5 text-[#E2B714]" />
                    </span>
                  </div>

                  {/* Bottom Image Info */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90">
                    <span className="font-semibold truncate pr-2">{item.client || 'Creative Asset'}</span>
                    <span className="text-[11px] text-white/70">{item.fileType || 'IMAGE'}</span>
                  </div>
                </div>

                {/* Card Caption */}
                <div className="p-4">
                  <h3 className={`font-bold text-sm leading-snug truncate ${
                    theme === 'dark' ? 'text-white' : 'text-neutral-900'
                  }`}>
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="fixed inset-0" onClick={() => setIsUploadModalOpen(false)} />

            <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl p-6 z-10 ${
              theme === 'dark' ? 'bg-[#0E1018] border-[#252839] text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800/40 mb-5">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#E2B714]" />
                  <h3 className="font-bold text-base">Upload Graphic Design Artwork</h3>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-neutral-800/40 text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {uploadSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-base">Artwork Added to Gallery!</h4>
                  <p className="text-xs text-neutral-400">Your design is now live in your gallery.</p>
                </div>
              ) : (
                <form onSubmit={handleSaveUpload} className="space-y-4">
                  {/* Dropzone / File Picker */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      previewDataUrl
                        ? 'border-[#E2B714]/60 bg-[#E2B714]/5'
                        : theme === 'dark'
                          ? 'border-[#252839] hover:border-[#E2B714] bg-[#12141F]'
                          : 'border-neutral-300 hover:border-amber-500 bg-neutral-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*, .png, .jpg, .jpeg, .webp, .svg, .gif, .pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {previewDataUrl ? (
                      <div className="space-y-2">
                        <img
                          src={previewDataUrl}
                          alt="Preview"
                          className="max-h-40 mx-auto rounded-lg object-contain shadow-sm"
                        />
                        <div className="text-xs font-semibold text-[#E2B714] truncate">
                          {uploadedFileName} ({uploadedFileSize})
                        </div>
                        <div className="text-[11px] text-neutral-400">Click to choose a different file</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-neutral-400" />
                        <div className="text-xs font-semibold">
                          Click to select PNG, JPG, SVG, WEBP or any design image
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          Supports all standard image formats and design files
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-400">Artwork / Project Title</label>
                    <input
                      type="text"
                      required
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Brand Identity & Logo Suite"
                      className={`w-full py-2 px-3 rounded-lg border text-xs focus:outline-none focus:border-[#E2B714] ${
                        theme === 'dark' ? 'bg-[#12141F] border-[#252839] text-white' : 'bg-neutral-50 border-neutral-300'
                      }`}
                    />
                  </div>

                  {/* Client */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-400">Client / Brand (Optional)</label>
                    <input
                      type="text"
                      value={uploadClient}
                      onChange={(e) => setUploadClient(e.target.value)}
                      placeholder="e.g. Kipawa Organics / Freelance"
                      className={`w-full py-2 px-3 rounded-lg border text-xs focus:outline-none focus:border-[#E2B714] ${
                        theme === 'dark' ? 'bg-[#12141F] border-[#252839] text-white' : 'bg-neutral-50 border-neutral-300'
                      }`}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-400">Description (Optional)</label>
                    <textarea
                      rows={2}
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="Brief notes about the design, tools used, or client context..."
                      className={`w-full py-2 px-3 rounded-lg border text-xs focus:outline-none focus:border-[#E2B714] ${
                        theme === 'dark' ? 'bg-[#12141F] border-[#252839] text-white' : 'bg-neutral-50 border-neutral-300'
                      }`}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!previewDataUrl}
                    className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                  >
                    Add Artwork to Gallery
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Lightbox High-Resolution Modal */}
        {lightboxItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setLightboxItem(null)} />

            <div className={`relative max-w-4xl w-full max-h-[90vh] rounded-2xl overflow-hidden border z-10 flex flex-col ${
              theme === 'dark' ? 'bg-[#0E1018] border-[#252839] text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}>
              {/* Header */}
              <div className="p-4 border-b border-neutral-800/40 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">{lightboxItem.title}</h3>
                  <div className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                    <span>{lightboxItem.client || 'Creative Asset'}</span>
                    <span>·</span>
                    <span>{lightboxItem.fileType || 'Image'} ({lightboxItem.fileSize || ''})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={lightboxItem.image}
                    download={lightboxItem.title.replace(/\s+/g, '_') + '.' + (lightboxItem.fileType?.toLowerCase() || 'jpg')}
                    className="p-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-200"
                    title="Download original file"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setLightboxItem(null)}
                    className="p-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Image Preview Container */}
              <div className="p-4 flex-1 flex items-center justify-center bg-black/40 overflow-hidden">
                <img
                  src={lightboxItem.image}
                  alt={lightboxItem.title}
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
                />
              </div>

              {/* Description Footer */}
              {lightboxItem.description && (
                <div className="p-4 border-t border-neutral-800/40 text-xs text-neutral-300">
                  {lightboxItem.description}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
