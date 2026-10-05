import React, { useState, useEffect, useRef } from 'react';
import { PhotoItem } from '../types/portfolio';
import { Camera, Upload, Plus, X, Download, Trash2, Eye, MapPin, Database, Check, Pencil } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

interface PhotographySectionProps {
  theme: 'dark' | 'light';
}

// Must match what the server accepts.
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];
// Originals can be large because they are shrunk in the browser before upload.
const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_SIDE_PX = 1600;
const JPEG_QUALITY = 0.82;

/** Shrinks an image to at most MAX_SIDE_PX on its longest side and re-encodes it as JPEG. */
async function resizeImage(file: File): Promise<{ dataUrl: string; bytes: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read this image'));
      el.src = objectUrl;
    });

    const scale = Math.min(1, MAX_SIDE_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is not supported in this browser');

    ctx.fillStyle = '#ffffff'; // PNGs with transparency would otherwise turn black as JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const bytes = Math.round(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);
    return { dataUrl, bytes };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const PhotographySection: React.FC<PhotographySectionProps> = ({ theme }) => {
  const { isAdmin, adminFetch } = useAdmin();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');

  // Upload form state
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoLocation, setPhotoLocation] = useState('Nairobi, Kenya');
  const [photoCamera, setPhotoCamera] = useState('');
  const [photoDescription, setPhotoDescription] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState('');
  const [uploadedFileType, setUploadedFileType] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit form state
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCamera, setEditCamera] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const inputClass = `w-full py-2 px-3 rounded-lg border text-xs focus:outline-none focus:border-[#E2B714] ${
    theme === 'dark' ? 'bg-[#12141F] border-[#252839] text-white' : 'bg-neutral-50 border-neutral-300'
  }`;

  const errorText = (status: number): string => {
    if (status === 401) return 'Your admin session expired. Unlock admin mode again.';
    if (status === 413) return 'The image is too large for the server.';
    if (status === 429) return 'Too many requests. Please wait a few minutes.';
    return 'The server could not complete the request. Please try again.';
  };

  // Load photos from the database. The database is the source of truth, so photos are no longer
  // cached in localStorage (large images filled the browser quota and caused errors).
  useEffect(() => {
    try {
      localStorage.removeItem('kw_photography_uploads');
    } catch {
      /* ignore */
    }

    fetch('/api/photos')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch photos');
      })
      .then((data: PhotoItem[]) => {
        if (Array.isArray(data)) setPhotos(data);
      })
      .catch((err) => {
        console.warn('Could not load photos:', err);
      });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Please choose a PNG, JPEG, WEBP, GIF or AVIF image.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('That image is larger than 40 MB. Please choose a smaller file.');
      return;
    }
    setUploadError('');
    setProcessing(true);

    try {
      // Shrink before uploading: a 5 MB camera photo becomes a few hundred KB.
      const { dataUrl, bytes } = await resizeImage(file);

      setPreviewDataUrl(dataUrl);
      setUploadedFileName(file.name);
      setUploadedFileType('JPEG');
      setUploadedFileSize(
        bytes >= 1024 * 1024
          ? (bytes / (1024 * 1024)).toFixed(2) + ' MB'
          : Math.max(1, Math.round(bytes / 1024)) + ' KB'
      );

      if (!photoTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setPhotoTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } catch (err) {
      console.error(err);
      setPreviewDataUrl(null);
      setUploadError('Could not process that image. Try a different file.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewDataUrl || !photoTitle.trim()) return;

    setLoading(true);
    setUploadError('');

    try {
      const res = await adminFetch('/api/photos', {
        method: 'POST',
        body: JSON.stringify({
          id: 'photo-' + Date.now(),
          title: photoTitle.trim(),
          location: photoLocation.trim(),
          cameraInfo: photoCamera.trim(),
          description: photoDescription.trim(),
          image: previewDataUrl,
          fileType: uploadedFileType || 'JPG',
          fileSize: uploadedFileSize || ''
        })
      });

      // Only show the photo if the server really saved it.
      if (!res.ok) {
        setUploadError(errorText(res.status));
        return;
      }

      const data = await res.json();
      const newPhoto: PhotoItem = {
        id: data.id,
        title: photoTitle.trim(),
        location: photoLocation.trim(),
        cameraInfo: photoCamera.trim(),
        description: photoDescription.trim(),
        image: previewDataUrl,
        fileType: uploadedFileType || 'JPG',
        fileSize: uploadedFileSize || '',
        dateAdded: new Date().toISOString().split('T')[0]
      };
      setPhotos((prev) => [newPhoto, ...prev]);

      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setIsUploadModalOpen(false);
        setPhotoTitle('');
        setPhotoCamera('');
        setPhotoDescription('');
        setPreviewDataUrl(null);
        setUploadedFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 700);
    } catch (err) {
      console.error(err);
      setUploadError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this photograph? This cannot be undone.')) return;
    setPageError('');

    try {
      const res = await adminFetch(`/api/photos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setPageError(errorText(res.status));
        return;
      }
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      if (lightboxPhoto?.id === id) setLightboxPhoto(null);
    } catch (err) {
      console.error(err);
      setPageError('Network error. The photograph was not deleted.');
    }
  };

  const openEdit = (item: PhotoItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditTitle(item.title || '');
    setEditLocation(item.location || '');
    setEditCamera(item.cameraInfo || '');
    setEditDescription(item.description || '');
    setEditError('');
    setEditingPhoto(item);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto || !editTitle.trim()) return;

    setEditSaving(true);
    setEditError('');

    const changes = {
      title: editTitle.trim(),
      location: editLocation.trim(),
      cameraInfo: editCamera.trim(),
      description: editDescription.trim()
    };

    try {
      const res = await adminFetch(`/api/photos/${editingPhoto.id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes)
      });
      if (!res.ok) {
        setEditError(errorText(res.status));
        return;
      }

      const id = editingPhoto.id;
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
      setLightboxPhoto((prev) => (prev && prev.id === id ? { ...prev, ...changes } : prev));
      setEditingPhoto(null);
    } catch (err) {
      console.error(err);
      setEditError('Network error. Your changes were not saved.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <section
      id="photography"
      className="py-20 border-t transition-colors duration-200"
      style={{ borderColor: theme === 'dark' ? '#1E2232' : '#E5E7EB' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E2B714] mb-2">
              <Camera className="w-3.5 h-3.5" />
              <span>Photography & Creative Vision</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Database className="w-3 h-3" />
              </span>
            </div>
            <h2
              className={`text-3xl sm:text-4xl font-bold tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-neutral-950'
              }`}
            >
              Photography Showcase
            </h2>
            <p
              className={`mt-2 text-sm sm:text-base max-w-xl ${
                theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            ></p>
          </div>

          {/* Action: Upload Photo Button (Owner Admin Only) */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setUploadError('');
                  setIsUploadModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Photo</span>
              </button>
            </div>
          )}
        </div>

        {isAdmin && pageError && (
          <div className="mb-6 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-400">
            {pageError}
          </div>
        )}

        {/* Content */}
        {photos.length === 0 ? (
          isAdmin ? (
            <div
              onClick={() => setIsUploadModalOpen(true)}
              className={`p-12 sm:p-16 text-center rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#12141F] border-[#252839] hover:border-[#E2B714]/60'
                  : 'bg-neutral-50 border-neutral-300 hover:border-amber-500'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-[#E2B714]/10 text-[#E2B714] mx-auto flex items-center justify-center mb-4">
                <Camera className="w-8 h-8" />
              </div>
              <h3
                className={`text-lg sm:text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-neutral-900'
                }`}
              >
                Your Photography Gallery is Ready
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
                Upload photos you have taken over the years. All photos are stored in your Neon PostgreSQL database.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUploadModalOpen(true);
                }}
                className="mt-6 px-6 py-2.5 text-xs font-semibold rounded-xl bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-colors inline-flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Your First Photograph</span>
              </button>
            </div>
          ) : (
            <div
              className={`p-12 text-center rounded-2xl border ${
                theme === 'dark' ? 'bg-[#12141F] border-[#232635]' : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-[#E2B714]/10 text-[#E2B714] mx-auto flex items-center justify-center mb-3">
                <Camera className="w-7 h-7" />
              </div>
              <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>
                Commercial & Documentary Photography
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                Photography portfolio spanning events, branding sessions, and field media at JHUB Africa is being
                published. Contact Kelvin for shoots and creative coverage.
              </p>
            </div>
          )
        ) : (
          /* Photography Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((item) => (
              <div
                key={item.id}
                onClick={() => setLightboxPhoto(item)}
                className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover:translate-y-[-2px] ${
                  theme === 'dark'
                    ? 'bg-[#12141F] border-[#232635] hover:border-[#383D55] shadow-lg'
                    : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="relative aspect-4/3 overflow-hidden bg-neutral-900">
                  <img
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Edit + Delete buttons (Owner Admin only) */}
                  {isAdmin && (
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        onClick={(e) => openEdit(item, e)}
                        title="Edit details"
                        className="p-1.5 rounded-lg bg-black/60 text-[#E2B714] hover:bg-[#E2B714] hover:text-neutral-950 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeletePhoto(item.id, e)}
                        title="Delete photograph"
                        className="p-1.5 rounded-lg bg-black/60 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="p-3 rounded-full bg-black/70 text-white backdrop-blur-md">
                      <Eye className="w-5 h-5 text-[#E2B714]" />
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90">
                    <span className="font-semibold truncate pr-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#E2B714]" />
                      <span>{item.location || 'Kenya'}</span>
                    </span>
                    <span className="text-[11px] text-white/70">{item.fileType || 'JPG'}</span>
                  </div>
                </div>

                <div className="p-4">
                  <h3
                    className={`font-bold text-sm leading-snug truncate ${
                      theme === 'dark' ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    {item.title}
                  </h3>
                  {item.cameraInfo && (
                    <p className="text-[11px] text-[#E2B714] mt-0.5 font-medium">{item.cameraInfo}</p>
                  )}
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

        {/* Upload Photo Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="fixed inset-0" onClick={() => setIsUploadModalOpen(false)} />

            <div
              className={`relative w-full max-w-lg rounded-2xl border shadow-2xl p-6 z-10 ${
                theme === 'dark'
                  ? 'bg-[#0E1018] border-[#252839] text-white'
                  : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800/40 mb-5">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#E2B714]" />
                  <h3 className="font-bold text-base">Upload Photograph</h3>
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
                  <h4 className="font-bold text-base">Photograph Saved!</h4>
                  <p className="text-xs text-neutral-400">Your photo is live in the gallery.</p>
                </div>
              ) : (
                <form onSubmit={handleSavePhoto} className="space-y-4">
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
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
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
                        <div className="text-[11px] text-neutral-400">Click to choose a different photo</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Camera className="w-8 h-8 mx-auto text-neutral-400" />
                        <div className="text-xs font-semibold">
                          {processing
                            ? 'Optimizing image...'
                            : 'Click to select a photograph (JPG, PNG, WEBP, GIF or AVIF). It is resized automatically.'}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-400">Photo Title</label>
                    <input
                      type="text"
                      required
                      maxLength={200}
                      value={photoTitle}
                      onChange={(e) => setPhotoTitle(e.target.value)}
                      placeholder="e.g. Sunset over Nairobi Skyline"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-400">Location</label>
                      <input
                        type="text"
                        maxLength={200}
                        value={photoLocation}
                        onChange={(e) => setPhotoLocation(e.target.value)}
                        placeholder="e.g. Nairobi, Kenya"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-400">
                        Camera / Lens (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        value={photoCamera}
                        onChange={(e) => setPhotoCamera(e.target.value)}
                        placeholder="e.g. Canon EOS / 50mm f/1.8"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-400">
                      Story / Context (Optional)
                    </label>
                    <textarea
                      rows={2}
                      maxLength={2000}
                      value={photoDescription}
                      onChange={(e) => setPhotoDescription(e.target.value)}
                      placeholder="Context about the shoot, event, or visual mood..."
                      className={inputClass}
                    />
                  </div>

                  {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}

                  <button
                    type="submit"
                    disabled={!previewDataUrl || loading || processing}
                    className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                  >
                    {processing ? 'Optimizing image...' : loading ? 'Saving...' : 'Save Photograph to Gallery'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Edit Details Modal */}
        {editingPhoto && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="fixed inset-0" onClick={() => setEditingPhoto(null)} />

            <div
              className={`relative w-full max-w-lg rounded-2xl border shadow-2xl p-6 z-10 ${
                theme === 'dark'
                  ? 'bg-[#0E1018] border-[#252839] text-white'
                  : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800/40 mb-5">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#E2B714]" />
                  <h3 className="font-bold text-base">Edit Photograph Details</h3>
                </div>
                <button
                  onClick={() => setEditingPhoto(null)}
                  className="p-1 rounded-lg hover:bg-neutral-800/40 text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <img
                  src={editingPhoto.image}
                  alt={editingPhoto.title}
                  className="max-h-32 mx-auto rounded-lg object-contain shadow-sm"
                />

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-400">Photo Title</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-400">Location</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-400">Camera / Lens</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={editCamera}
                      onChange={(e) => setEditCamera(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-400">Story / Context</label>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {editError && <p className="text-xs text-rose-400">{editError}</p>}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingPhoto(null)}
                    className="py-3 rounded-xl text-xs font-bold uppercase tracking-wider border border-neutral-700 text-neutral-300 hover:bg-neutral-800/40 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving || !editTitle.trim()}
                    className="py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                  >
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lightbox High-Resolution Modal */}
        {lightboxPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setLightboxPhoto(null)} />

            <div
              className={`relative max-w-4xl w-full max-h-[90vh] rounded-2xl overflow-hidden border z-10 flex flex-col ${
                theme === 'dark'
                  ? 'bg-[#0E1018] border-[#252839] text-white'
                  : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="p-4 border-b border-neutral-800/40 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">{lightboxPhoto.title}</h3>
                  <div className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                    <span>{lightboxPhoto.location}</span>
                    {lightboxPhoto.cameraInfo && (
                      <>
                        <span>·</span>
                        <span className="text-[#E2B714]">{lightboxPhoto.cameraInfo}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{lightboxPhoto.fileSize}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => openEdit(lightboxPhoto)}
                      className="p-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-[#E2B714]"
                      title="Edit details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <a
                    href={lightboxPhoto.image}
                    download={lightboxPhoto.title.replace(/\s+/g, '_') + '.jpg'}
                    className="p-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-200"
                    title="Download high-res photograph"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setLightboxPhoto(null)}
                    className="p-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex items-center justify-center bg-black/40 overflow-hidden">
                <img
                  src={lightboxPhoto.image}
                  alt={lightboxPhoto.title}
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
                />
              </div>

              {lightboxPhoto.description && (
                <div className="p-4 border-t border-neutral-800/40 text-xs text-neutral-300">
                  {lightboxPhoto.description}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};