import React, { useState, useRef } from 'react';
import { useAkra } from '../context/AkraContext';
import { FutureItem } from '../types';
import { uploadToSupabaseStorage } from '../lib/storage';
import {
  Compass,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Tag,
  Plane,
  Home,
  Target,
  Utensils,
  Sparkles,
  X,
  Heart,
  Pencil,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
  Camera,
  Upload,
  Loader2,
  Maximize2,
  Film,
  ExternalLink,
} from 'lucide-react';

export const FutureView: React.FC = () => {
  const {
    futureItems,
    addFutureItem,
    updateFutureItem,
    deleteFutureItem,
    toggleFutureItem,
    showToast,
  } = useAkra();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FutureItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<FutureItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FutureItem['category']>('places');
  const [targetDate, setTargetDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [quickUploadItemId, setQuickUploadItemId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: 'all', label: 'All Dreams', icon: Sparkles },
    { id: 'places', label: '✈️ Places to Visit', icon: Plane },
    { id: 'experiences', label: '🌟 Experiences', icon: Heart },
    { id: 'restaurants', label: '🍽️ Food & Dates', icon: Utensils },
    { id: 'movies', label: '🎬 Watchlist', icon: Target },
    { id: 'dreams', label: '🏠 Life Dreams', icon: Home },
  ];

  // Curated aesthetic dream presets for instant 1-tap inspiration
  const inspirationPresets = [
    {
      label: '🏝️ Bali Beach & Villa',
      url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: '🗼 Paris Sunset',
      url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: '🏔️ Swiss Alps Trip',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: '🌌 Stargazing Camp',
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: '🕯️ Candlelit Dinner',
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: '🏡 Cozy Forever Home',
      url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: '🌊 Serenity Beach Sunrise',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    },
  ];

  const resetForm = () => {
    setTitle('');
    setCategory('places');
    setTargetDate('');
    setImageUrl('');
    setNotes('');
    setIsUploading(false);
  };

  const handleFileUpload = async (file: File, isEdit: boolean = false) => {
    try {
      setIsUploading(true);
      showToast('Uploading photo...', 'Sending image to akra-media bucket.', 'info');
      const uploadRes = await uploadToSupabaseStorage(file, {
        bucket: 'akra-media',
        folder: 'future',
        filename: `future-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
        caption: title || 'Future Bucket Dream',
        category: 'future',
      });

      if (uploadRes.url) {
        setImageUrl(uploadRes.url);
        showToast('Photo Uploaded 📸', 'Saved to akra-media bucket with public URL.', 'system');
      }
    } catch (err: any) {
      console.error('Future image upload failed:', err);
      showToast('Upload Failed', err?.message || 'Could not upload image.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Quick 1-click photo upload directly from card in list
  const handleQuickCardUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setQuickUploadItemId(itemId);
      showToast('Uploading photo...', 'Attaching photo to this dream.', 'info');
      const uploadRes = await uploadToSupabaseStorage(file, {
        bucket: 'akra-media',
        folder: 'future',
        filename: `future-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
        caption: 'Future Dream Photo',
        category: 'future',
      });

      if (uploadRes.url) {
        updateFutureItem(itemId, { imageUrl: uploadRes.url });
        showToast('Photo Added 📸', 'Photo attached to your future dream ✨', 'system');
      }
    } catch (err: any) {
      console.error('Quick upload failed:', err);
      showToast('Upload Failed', err?.message || 'Could not upload image.', 'error');
    } finally {
      setQuickUploadItemId(null);
      e.target.value = '';
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addFutureItem({
      title: title.trim(),
      category,
      targetDate: targetDate.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    resetForm();
    setShowAddModal(false);
    showToast('Dream Added', 'Added to our future bucket list ✨', 'system');
  };

  const handleStartEdit = (item: FutureItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setCategory(item.category);
    setTargetDate(item.targetDate || '');
    setImageUrl(item.imageUrl || '');
    setNotes(item.notes || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !title.trim()) return;

    updateFutureItem(editingItem.id, {
      title: title.trim(),
      category,
      targetDate: targetDate.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setEditingItem(null);
    resetForm();
    showToast('Dream Updated', 'Updated in our future list.', 'system');
  };

  const handleDeleteConfirm = (id: string) => {
    deleteFutureItem(id);
    setDeletingItemId(null);
    showToast('Dream Removed', 'Removed from bucket list.', 'system');
  };

  const filteredItems =
    selectedCategory === 'all'
      ? futureItems
      : futureItems.filter((item) => item.category === selectedCategory);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-8 select-none animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8D5C4]">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#6D4C41]" />
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#3E2723]">
              OUR FUTURE BUCKET LIST
            </h1>
          </div>
          <p className="text-xs text-[#8D6E63] font-serif italic">
            "Everything we are working towards, one dream and one picture at a time."
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          id="add-future-item-btn"
          className="px-5 py-2.5 rounded-full bg-[#6D4C41] text-white text-xs font-semibold hover:bg-[#5D4037] transition flex items-center gap-2 shadow-xs self-start sm:self-auto active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Future Dream</span>
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition border cursor-pointer ${
              selectedCategory === c.id
                ? 'bg-[#6D4C41] text-white border-[#6D4C41] shadow-2xs'
                : 'bg-white text-[#5D4037] border-[#E8D5C4] hover:bg-[#FAF7F2]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Bucket List Items */}
      {filteredItems.length === 0 ? (
        <div className="bg-white/80 rounded-[32px] p-10 text-center border border-[#E8D5C4] space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#FAF7F2] border border-[#E8D5C4] flex items-center justify-center mx-auto text-[#6D4C41]">
            <Compass className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-[#3E2723]">Our Canvas is Waiting</h3>
            <p className="text-xs text-[#8D6E63] font-serif italic max-w-md mx-auto">
              Add our next travel spot, cozy dream, or milestone date complete with photos.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-5 py-2.5 rounded-full bg-[#6D4C41] text-white text-xs font-semibold hover:bg-[#5D4037] transition inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Dream</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-[28px] p-5 border border-[#E8D5C4] shadow-2xs hover:border-[#6D4C41]/40 transition flex flex-col sm:flex-row items-start justify-between gap-4 group"
            >
              <div className="flex items-start gap-4 w-full">
                {/* Checkbox */}
                <button
                  onClick={() => toggleFutureItem(item.id)}
                  className="mt-1 text-[#8D6E63] hover:text-[#6D4C41] transition cursor-pointer shrink-0"
                  title={item.completed ? 'Mark as dream' : 'Mark as done'}
                >
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-[#53a876] fill-[#53a876]/20" />
                  ) : (
                    <Circle className="w-5 h-5 text-[#A1887F] group-hover:text-[#6D4C41]" />
                  )}
                </button>

                {/* Dream Photo Thumbnail or Quick Add Slot */}
                {item.imageUrl ? (
                  <div
                    onClick={() => setLightboxItem(item)}
                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-[#E8D5C4]/80 shadow-2xs cursor-pointer group/thumb bg-[#FAF7F2]"
                    title="Click to view full photo"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80';
                      }}
                      className="w-full h-full object-cover group-hover/thumb:scale-108 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-4 h-4 text-white drop-shadow-sm" />
                    </div>
                  </div>
                ) : (
                  <label
                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-[#E8D5C4] hover:border-[#6D4C41] hover:bg-[#FAF7F2] transition flex flex-col items-center justify-center gap-1 cursor-pointer shrink-0 text-[#8D6E63] hover:text-[#6D4C41] group/addphoto"
                    title="Add photo to this dream"
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleQuickCardUpload(item.id, e)}
                    />
                    {quickUploadItemId === item.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#6D4C41]" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 group-hover/addphoto:scale-110 transition-transform" />
                        <span className="text-[10px] font-semibold text-center px-1 leading-tight">
                          Add Photo
                        </span>
                      </>
                    )}
                  </label>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3
                      className={`font-serif font-bold text-base sm:text-lg text-[#3E2723] ${
                        item.completed ? 'line-through text-[#8D6E63]' : ''
                      }`}
                    >
                      {item.title}
                    </h3>
                    {item.completed ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#dff0e6] text-[#2e7d52]">
                        Done ✅
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8D5C4] text-[#6D4C41]">
                        Dream 💭
                      </span>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-xs text-[#5D4037] leading-relaxed mb-2 font-normal whitespace-pre-line">
                      {item.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-2.5 text-[11px] text-[#8D6E63] flex-wrap">
                    <span className="capitalize font-semibold text-[#6D4C41]">
                      {item.category}
                    </span>
                    {item.targetDate && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-medium text-[#6D4C41] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#E8D5C4]/60">
                          <Calendar className="w-3 h-3 text-[#A1887F]" />
                          <span>{item.targetDate}</span>
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>Suggested by {item.suggestedByName}</span>
                    {item.completedAt && (
                      <>
                        <span>•</span>
                        <span className="text-[#53a876] font-semibold">
                          Completed on {item.completedAt}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Toggle, Edit, Delete */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8D5C4]/40 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleStartEdit(item)}
                  className="p-1.5 rounded-full text-[#8D6E63] hover:text-[#3E2723] hover:bg-[#FAF7F2] transition cursor-pointer opacity-80 group-hover:opacity-100"
                  title="Edit dream details and photo"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingItemId(item.id)}
                  className="p-1.5 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer opacity-80 group-hover:opacity-100"
                  title="Delete dream"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleFutureItem(item.id)}
                  className={`text-xs px-3.5 py-1.5 rounded-full border font-semibold transition shadow-2xs cursor-pointer ${
                    item.completed
                      ? 'bg-[#f0f8f3] text-[#2e7d52] border-[#c2e4cf]'
                      : 'bg-[#FAF7F2] text-[#6D4C41] border-[#E8D5C4] hover:bg-[#F5F1EB]'
                  }`}
                >
                  {item.completed ? 'Undo' : 'Done'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-up overflow-y-auto">
          <div className="w-full max-w-lg bg-[#FAF7F2] rounded-[32px] p-6 sm:p-7 shadow-2xl border border-[#E8D5C4] my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D5C4] mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6D4C41]" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#3E2723]">
                  Add to Bucket List
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-[#8D6E63] hover:bg-[#E8D5C4]/40 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                  Dream Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bali Trip - Villa with infinity pool & sunrises"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                  >
                    <option value="places">✈️ Places to Visit</option>
                    <option value="experiences">🌟 Experiences</option>
                    <option value="restaurants">🍽️ Food & Dates</option>
                    <option value="movies">🎬 Watchlist</option>
                    <option value="dreams">🏠 Life Dreams</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                    Target Timeframe / Date
                  </label>
                  <input
                    type="text"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    placeholder="e.g. Summer 2027, Next Birthday"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                  />
                </div>
              </div>

              {/* Dream Photo Section */}
              <div className="space-y-2 p-3.5 bg-white/80 rounded-2xl border border-[#E8D5C4]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#6D4C41]" />
                    <span>Inspiration Photo / Image</span>
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                {/* Upload Button + URL Input */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, false);
                    }}
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D5C4] hover:bg-[#F3EDE3] text-xs font-semibold text-[#6D4C41] flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 shrink-0"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload from device</span>
                      </>
                    )}
                  </button>

                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Or paste image URL (Unsplash, direct link...)"
                    className="flex-1 px-3 py-2 rounded-xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#6D4C41]"
                  />
                </div>

                {/* Image Preview */}
                {imageUrl && (
                  <div className="relative aspect-16/9 w-full rounded-xl overflow-hidden border border-[#E8D5C4] bg-[#FAF7F2]">
                    <img
                      src={imageUrl}
                      alt="Dream preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs font-medium">
                      Preview
                    </span>
                  </div>
                )}

                {/* Quick Inspiration Presets */}
                <div>
                  <span className="text-[10px] font-semibold text-[#8D6E63] block mb-1.5">
                    Quick Inspiration Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspirationPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setImageUrl(preset.url)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          imageUrl === preset.url
                            ? 'bg-[#6D4C41] text-white border-[#6D4C41]'
                            : 'bg-white text-[#6D4C41] border-[#E8D5C4] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                  Sweet Notes & Details
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Where, why, and how excited we are..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8D5C4]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-full border border-[#E8D5C4] text-xs text-[#3E2723] hover:bg-[#F5F1EB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2.5 rounded-full bg-[#6D4C41] text-white text-xs font-semibold hover:bg-[#5D4037] transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Save Dream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-up overflow-y-auto">
          <div className="w-full max-w-lg bg-[#FAF7F2] rounded-[32px] p-6 sm:p-7 shadow-2xl border border-[#E8D5C4] my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D5C4] mb-4">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#6D4C41]" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#3E2723]">
                  Edit Bucket List Dream
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-full text-[#8D6E63] hover:bg-[#E8D5C4]/40 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                  Dream Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                  >
                    <option value="places">✈️ Places to Visit</option>
                    <option value="experiences">🌟 Experiences</option>
                    <option value="restaurants">🍽️ Food & Dates</option>
                    <option value="movies">🎬 Watchlist</option>
                    <option value="dreams">🏠 Life Dreams</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                    Target Timeframe / Date
                  </label>
                  <input
                    type="text"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    placeholder="e.g. Summer 2027, Next Birthday"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                  />
                </div>
              </div>

              {/* Dream Photo Section */}
              <div className="space-y-2 p-3.5 bg-white/80 rounded-2xl border border-[#E8D5C4]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#6D4C41]" />
                    <span>Inspiration Photo / Image</span>
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                {/* Upload Button + URL Input */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, true);
                    }}
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => editFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D5C4] hover:bg-[#F3EDE3] text-xs font-semibold text-[#6D4C41] flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 shrink-0"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload new photo</span>
                      </>
                    )}
                  </button>

                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Or paste image URL (Unsplash, direct link...)"
                    className="flex-1 px-3 py-2 rounded-xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#6D4C41]"
                  />
                </div>

                {/* Image Preview */}
                {imageUrl && (
                  <div className="relative aspect-16/9 w-full rounded-xl overflow-hidden border border-[#E8D5C4] bg-[#FAF7F2]">
                    <img
                      src={imageUrl}
                      alt="Dream preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs font-medium">
                      Current Photo
                    </span>
                  </div>
                )}

                {/* Quick Inspiration Presets */}
                <div>
                  <span className="text-[10px] font-semibold text-[#8D6E63] block mb-1.5">
                    Quick Inspiration Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspirationPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setImageUrl(preset.url)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          imageUrl === preset.url
                            ? 'bg-[#6D4C41] text-white border-[#6D4C41]'
                            : 'bg-white text-[#6D4C41] border-[#E8D5C4] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                  Sweet Notes & Details
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8D5C4]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-full border border-[#E8D5C4] text-xs text-[#3E2723] hover:bg-[#F5F1EB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2.5 rounded-full bg-[#6D4C41] text-white text-xs font-semibold hover:bg-[#5D4037] transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Update Dream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-up">
          <div className="w-full max-w-sm bg-[#FAF7F2] rounded-[32px] p-6 shadow-2xl border border-rose-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#3E2723]">Remove Dream?</h3>
              <p className="text-xs text-[#8D6E63] mt-1 font-serif italic">
                Are you sure you want to remove this item from your bucket list?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItemId(null)}
                className="flex-1 py-2 rounded-full border border-[#E8D5C4] text-xs text-[#3E2723] hover:bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(deletingItemId)}
                className="flex-1 py-2 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Enlarged Photo View Modal */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-up cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#FAF7F2] rounded-[32px] overflow-hidden shadow-2xl border border-[#E8D5C4] cursor-default"
          >
            <div className="relative aspect-16/9 w-full bg-black">
              <img
                src={lightboxItem.imageUrl}
                alt={lightboxItem.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80';
                }}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setLightboxItem(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center transition cursor-pointer backdrop-blur-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6E63] capitalize">
                    {lightboxItem.category}
                  </span>
                  <h3 className="font-serif font-bold text-xl text-[#3E2723] leading-snug">
                    {lightboxItem.title}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    const item = lightboxItem;
                    setLightboxItem(null);
                    handleStartEdit(item);
                  }}
                  className="px-3.5 py-1.5 rounded-full border border-[#E8D5C4] hover:bg-white text-xs font-semibold text-[#6D4C41] transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit Photo</span>
                </button>
              </div>

              {lightboxItem.targetDate && (
                <div className="flex items-center gap-1.5 text-xs text-[#6D4C41] font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#8D6E63]" />
                  <span>Planned for: {lightboxItem.targetDate}</span>
                </div>
              )}

              {lightboxItem.notes && (
                <p className="text-xs text-[#5D4037] font-serif italic leading-relaxed pt-2 border-t border-[#E8D5C4]/60">
                  "{lightboxItem.notes}"
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
