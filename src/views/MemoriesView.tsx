import React, { useState, useRef, useEffect } from 'react';
import { useAkra } from '../context/AkraContext';
import { Memory, FontChoice, FontSizeChoice } from '../types';
import { uploadToSupabaseStorage } from '../lib/storage';
import { downloadImage } from '../utils/download';
import {
  Plus,
  MapPin,
  Calendar,
  X,
  Send,
  Upload,
  Sparkles,
  Maximize2,
  Pencil,
  Trash2,
  Check,
  Type,
  Eye,
  Sliders,
  AlertCircle,
  Tag,
  Loader2,
  Download,
} from 'lucide-react';

export const MemoriesView: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    memories,
    addMemory,
    updateMemory,
    deleteMemory,
    addCommentToMemory,
    showToast,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
  } = useAkra();

  // Modal & View States
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Inline Title Editing inside Lightbox
  const [isInlineEditingTitle, setIsInlineEditingTitle] = useState(false);
  const [inlineTitleValue, setInlineTitleValue] = useState('');

  // Add Form State
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('September 2026');
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('Rock Beach, Puducherry');

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  // Sample scenic presets
  const samplePhotoOptions = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
  ];

  // Romantic title suggestions for naming memories
  const romanticTitleSuggestions = [
    'Our Sunset Walk',
    'Mama & Akshu Forever',
    'Puducherry Beach Dusk',
    'Quiet Morning in Bangalore',
    'Holding Hands Across Miles',
    'Sweet Laughter & Filter Coffee',
    'Starlight Conversation',
    'A Little World for Two',
  ];

  // Detect camera filename patterns like IGNS_4368[1], IMG_1234, DSC_001
  const isCameraFilename = (str: string) => {
    if (!str) return false;
    return (
      /^([A-Z0-9_-]{2,10}\[\d+\]|[A-Z]{2,5}[_-]?\d{3,})/i.test(str.trim()) ||
      str.toLowerCase().startsWith('igns_') ||
      str.toLowerCase().startsWith('img_') ||
      str.toLowerCase().startsWith('dsc_') ||
      str.toLowerCase().startsWith('screenshot_')
    );
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      showToast('Uploading to Akra Media...', 'Sending photo to akra-media bucket.', 'info');
      const uploadRes = await uploadToSupabaseStorage(file, {
        bucket: 'akra-media',
        folder: 'memories',
        filename: `memories-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
        caption: title || file.name,
        category: 'memories',
        saveToMedia: true,
      });

      if (uploadRes.url) {
        setImageUrl(uploadRes.url);
        if (!title) {
          const rawName = file.name.replace(/\.[^/.]+$/, '');
          setTitle(rawName);
        }
        showToast('Photo Uploaded 📸', 'Saved to akra-media bucket with public URL.', 'love');
      }
    } catch (err) {
      console.error('Memories upload failed:', err);
      showToast('Upload Failed', 'Could not upload to akra-media.', 'info');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      showToast('Uploading photo...', 'Sending replacement to akra-media bucket.', 'info');
      const uploadRes = await uploadToSupabaseStorage(file, {
        bucket: 'akra-media',
        folder: 'memories',
        category: 'memories',
        saveToMedia: true,
      });

      if (uploadRes.url) {
        setEditImageUrl(uploadRes.url);
        showToast('Photo Replaced', 'New photo ready.', 'love');
      }
    } catch (err) {
      console.error('Edit upload failed:', err);
      showToast('Upload Failed', 'Could not replace photo.', 'info');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenEdit = (mem: Memory, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingMemory(mem);
    setEditTitle(mem.title);
    setEditCaption(mem.caption || '');
    setEditDate(mem.date || 'September 2026');
    setEditLocation(mem.location || '');
    setEditImageUrl(mem.imageUrl);
  };

  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory || !editTitle.trim()) return;

    const updatedData: Partial<Memory> = {
      title: editTitle.trim(),
      caption: editCaption.trim(),
      date: editDate.trim(),
      location: editLocation.trim() || undefined,
      imageUrl: editImageUrl.trim() || editingMemory.imageUrl,
    };

    updateMemory(editingMemory.id, updatedData);

    // If currently open in lightbox, synchronize live state
    if (selectedMemory && selectedMemory.id === editingMemory.id) {
      setSelectedMemory((prev) => (prev ? { ...prev, ...updatedData } : null));
    }

    setEditingMemory(null);
    showToast('Changes Saved ✨', `"${editTitle.trim()}" was updated on our shelf.`, 'photo');
  };

  const handleDeleteMemory = (id: string, memoryTitle: string) => {
    if (window.confirm(`Remove "${memoryTitle}" from your memories shelf?`)) {
      deleteMemory(id);
      if (selectedMemory?.id === id) setSelectedMemory(null);
      if (editingMemory?.id === id) setEditingMemory(null);
    }
  };

  const handleSaveInlineTitle = () => {
    if (!selectedMemory || !inlineTitleValue.trim()) return;
    const newTitle = inlineTitleValue.trim();
    updateMemory(selectedMemory.id, { title: newTitle });
    setSelectedMemory((prev) => (prev ? { ...prev, title: newTitle } : null));
    setIsInlineEditingTitle(false);
    showToast('Name Saved ✏️', `Title updated to "${newTitle}"`, 'photo');
  };

  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) return;

    const parsedDate = new Date(dateStr);
    const year = isNaN(parsedDate.getFullYear()) ? 2026 : parsedDate.getFullYear();

    addMemory({
      title: title.trim(),
      year,
      date: dateStr.trim(),
      imageUrl: imageUrl.trim(),
      caption: caption.trim() || 'A cherished moment kept on our shelf.',
      location: location.trim() || undefined,
      author: currentUser.nickname || currentUser.name,
    });

    showToast('Frame Preserved 📸', `"${title}" is resting on our glass shelf.`, 'photo');

    setTitle('');
    setImageUrl('');
    setCaption('');
    setShowAddModal(false);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemory || !commentInput.trim()) return;
    addCommentToMemory(selectedMemory.id, commentInput);
    setCommentInput('');

    setSelectedMemory((prev) =>
      prev
        ? {
            ...prev,
            comments: [
              ...(prev.comments || []),
              {
                id: 'c_' + Date.now(),
                authorId: currentUser.id,
                authorName: currentUser.nickname || currentUser.name,
                text: commentInput.trim(),
                timestamp: 'Just now',
              },
            ],
          }
        : null
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 select-none animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#7a5240]/20">
        <div>
          <span className="micro-label">Photobook</span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#3e2723] font-bold tracking-tight">
            Memories on <span className="font-serif italic font-normal">Glass</span>
          </h1>
          <p className="text-sm sm:text-base text-[#5b3a2e] font-serif italic mt-1 font-medium">
            "Moments stolen from the distance between Puducherry and Bangalore."
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            id="add-memory-button"
            className="px-5 py-2.5 rounded-full bg-[#3e2723] text-[#f9efe8] text-xs font-semibold hover:bg-[#2c1810] transition shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add a memory frame</span>
          </button>
        </div>
      </div>

      {/* Clean Aesthetic Header Bar: Active Font Style */}
      <div className="p-3 sm:p-4 rounded-3xl glass-cream border border-[#7a5240]/20 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#3e2723] uppercase tracking-wider">
            <Type className="w-3.5 h-3.5 text-[#b06a5e]" />
            <span>Font:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'playfair' as FontChoice, label: 'Playfair Display', fontClass: 'font-serif' },
              { id: 'jakarta' as FontChoice, label: 'Plus Jakarta', fontClass: 'font-sans' },
              { id: 'lora' as FontChoice, label: 'Lora', fontClass: 'font-serif' },
              { id: 'cormorant' as FontChoice, label: 'Cormorant', fontClass: 'font-serif' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFontFamily(f.id);
                  showToast('Font Changed', `Active font set to ${f.label}`, 'info');
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  fontFamily === f.id
                    ? 'bg-[#3e2723] text-[#f9efe8] shadow-xs'
                    : 'bg-[#ffffff]/70 text-[#5b3a2e] hover:bg-[#ffffff] border border-[#7a5240]/15'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-[#7a5240] font-mono">
          <span>Standard View • {memories.length} frames</span>
        </div>
      </div>

      {/* 3D Floating Glass Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {memories.map((mem, index) => {
          const rotationClass =
            index % 3 === 0
              ? 'rotate-[-1.2deg]'
              : index % 3 === 1
              ? 'rotate-[1.4deg]'
              : 'rotate-[-0.6deg]';

          const hasCameraCode = isCameraFilename(mem.title);

          return (
            <div
              key={mem.id}
              onClick={() => setSelectedMemory(mem)}
              className={`group glass-cream p-4 sm:p-5 rounded-[32px] border border-[#7a5240]/25 shadow-lg hover:shadow-2xl hover:-translate-y-2 hover:rotate-0 transition-all duration-500 cursor-pointer flex flex-col justify-between ${rotationClass}`}
            >
              {/* Image Frame */}
              <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden mb-4 bg-[#ecd0c8]">
                <img
                  src={mem.imageUrl}
                  alt={mem.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Top Overlay Badges & Quick Action Buttons */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                  {mem.location ? (
                    <span className="micro-label text-[9px] bg-[#f9efe8]/95 px-2.5 py-1 rounded-full border border-[#7a5240]/20 flex items-center gap-1 shadow-xs text-[#3e2723]">
                      <MapPin className="w-3 h-3 text-[#b06a5e]" />
                      <span>{mem.location}</span>
                    </span>
                  ) : (
                    <span />
                  )}

                  {/* Action Buttons (Download & Edit) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(mem.imageUrl, `${mem.title || 'memory-frame'}.jpg`);
                        showToast('Downloading Frame 💾', 'Saving memory picture to your device...', 'love');
                      }}
                      title="Download memory picture"
                      className="p-2 rounded-full bg-[#f9efe8]/95 text-[#3e2723] hover:bg-[#ffffff] hover:scale-110 active:scale-95 transition shadow-md border border-[#7a5240]/20 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#3e2723]" />
                    </button>
                    <button
                      onClick={(e) => handleOpenEdit(mem, e)}
                      title="Edit name, caption, date & photo"
                      className="p-2 rounded-full bg-[#f9efe8]/95 text-[#3e2723] hover:bg-[#ffffff] hover:scale-110 active:scale-95 transition shadow-md border border-[#7a5240]/20 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#3e2723]" />
                    </button>
                  </div>
                </div>

                {/* Bottom Overlay Prompt */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3.5">
                  <span className="text-xs text-[#f9efe8] font-mono flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>View Lightbox</span>
                  </span>

                  <span
                    onClick={(e) => handleOpenEdit(mem, e)}
                    className="text-xs text-[#f9efe8] bg-[#3e2723]/80 px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-[#3e2723] transition"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Name</span>
                  </span>
                </div>
              </div>

              {/* Text Meta - Standard balanced font sizing */}
              <div className="space-y-1.5">
                {/* Camera Filename Alert Helper */}
                {hasCameraCode && (
                  <div
                    onClick={(e) => handleOpenEdit(mem, e)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#b06a5e]/15 border border-[#b06a5e]/30 text-[10px] font-bold text-[#b06a5e] mb-1 hover:bg-[#b06a5e]/25 transition"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>Tap pencil to give this frame a name</span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-lg sm:text-xl text-[#3e2723] font-bold leading-snug group-hover:text-[#1f100a] transition-colors">
                    {mem.title}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(mem.imageUrl, `${mem.title || 'memory-frame'}.jpg`);
                        showToast('Downloading Frame 💾', 'Saving picture to device...', 'love');
                      }}
                      className="opacity-60 group-hover:opacity-100 p-1 text-[#5b3a2e] hover:text-[#3e2723] transition"
                      title="Download photo"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleOpenEdit(mem, e)}
                      className="opacity-60 group-hover:opacity-100 p-1 text-[#5b3a2e] hover:text-[#3e2723] transition"
                      title="Edit name"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#5b3a2e] font-serif italic line-clamp-2 leading-relaxed">
                  "{mem.caption}"
                </p>
              </div>

              {/* Footer Stamp */}
              <div className="mt-4 pt-3 border-t border-[#7a5240]/15 flex items-center justify-between text-xs text-[#5b3a2e] font-mono">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#b06a5e]" />
                  <span>{mem.date}</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#7a5240]">
                  Kept by {mem.author || 'Mama & Akshu'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cinematic Full Lightbox Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1f100a]/85 backdrop-blur-xl animate-fade-up">
          <div className="relative max-w-4xl w-full glass-cream rounded-[36px] border border-[#7a5240]/30 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            {/* Top Right Actions */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                onClick={() => {
                  downloadImage(selectedMemory.imageUrl, `${selectedMemory.title || 'memory-frame'}.jpg`);
                  showToast('Downloading Frame 💾', 'Saving memory picture...', 'love');
                }}
                className="p-2.5 rounded-full bg-[#f9efe8]/90 text-[#3e2723] hover:bg-[#ffffff] hover:scale-105 active:scale-95 transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-3"
                title="Download photo"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                onClick={() => {
                  setSelectedMemory(null);
                  setIsInlineEditingTitle(false);
                }}
                className="p-2.5 rounded-full bg-[#f9efe8]/90 text-[#3e2723] hover:bg-[#ffffff] transition shadow-md cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Left: Large Photo */}
            <div className="md:w-3/5 bg-[#170c07] flex items-center justify-center p-3 sm:p-5 overflow-hidden relative group">
              <img
                src={selectedMemory.imageUrl}
                alt={selectedMemory.title}
                className="max-h-[55vh] md:max-h-[78vh] w-auto max-w-full object-contain rounded-2xl shadow-xl"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button
                  onClick={() => {
                    downloadImage(selectedMemory.imageUrl, `${selectedMemory.title || 'memory-frame'}.jpg`);
                    showToast('Downloading Frame 💾', 'Saving memory picture...', 'love');
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-[#f9efe8]/90 hover:bg-[#ffffff] text-xs font-semibold text-[#3e2723] shadow-lg flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                  title="Download memory picture"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedMemory)}
                  className="px-3.5 py-1.5 rounded-full bg-[#f9efe8]/90 hover:bg-[#ffffff] text-xs font-semibold text-[#3e2723] shadow-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Change Photo / Edit</span>
                </button>
              </div>
            </div>

            {/* Right: Editorial Caption, Date, Reflections & Edit Controls */}
            <div className="md:w-2/5 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-[#f9efe8]/95">
              <div className="space-y-4">
                {/* Location Stamp, Download & Edit Frame Trigger */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {selectedMemory.location ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#5b3a2e] font-mono font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#b06a5e]" />
                      <span>{selectedMemory.location}</span>
                    </div>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        downloadImage(selectedMemory.imageUrl, `${selectedMemory.title || 'memory-frame'}.jpg`);
                        showToast('Downloading Frame 💾', 'Saving memory picture...', 'love');
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-[#3e2723] hover:text-[#170c07] transition bg-[#ecd0c8]/60 hover:bg-[#ecd0c8] px-3 py-1 rounded-full cursor-pointer"
                      title="Download memory picture"
                    >
                      <Download className="w-3 h-3 text-[#b06a5e]" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(selectedMemory)}
                      className="flex items-center gap-1 text-xs font-bold text-[#b06a5e] hover:text-[#3e2723] transition bg-[#ecd0c8]/60 hover:bg-[#ecd0c8] px-3 py-1 rounded-full cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Details</span>
                    </button>
                  </div>
                </div>

                {/* Title (With Inline Quick-Rename Feature) */}
                <div>
                  {isInlineEditingTitle ? (
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={inlineTitleValue}
                          onChange={(e) => setInlineTitleValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineTitle()}
                          autoFocus
                          placeholder="Type new name..."
                          className="flex-1 px-3 py-2 rounded-xl glass-cream border-2 border-[#3e2723] text-lg font-serif font-bold text-[#3e2723] focus:outline-none"
                        />
                        <button
                          onClick={handleSaveInlineTitle}
                          className="p-2 rounded-xl bg-[#3e2723] text-[#f9efe8] hover:bg-[#2c1810] transition cursor-pointer"
                          title="Save Name"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIsInlineEditingTitle(false)}
                          className="p-2 rounded-xl bg-[#ffffff]/70 text-[#5b3a2e] hover:bg-[#ffffff] transition cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-[#7a5240]">Press Enter or click check to save.</p>
                    </div>
                  ) : (
                    <div className="group/title flex items-start justify-between gap-2">
                      <h2 className="font-serif text-3xl sm:text-4xl text-[#3e2723] font-bold leading-tight">
                        {selectedMemory.title}
                      </h2>
                      <button
                        onClick={() => {
                          setInlineTitleValue(selectedMemory.title);
                          setIsInlineEditingTitle(true);
                        }}
                        className="p-1.5 rounded-full text-[#7a5240] hover:text-[#3e2723] hover:bg-[#ecd0c8]/50 transition cursor-pointer"
                        title="Rename this memory"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-[#7a5240] font-mono mt-1 font-medium">
                    {selectedMemory.date} • Preserved by {selectedMemory.author || 'Mama & Akshu'}
                  </p>
                </div>

                {/* Caption Parchment */}
                <div className="p-4 rounded-2xl bg-[#ffffff]/70 border border-[#7a5240]/15 shadow-xs">
                  <p className="font-serif italic text-base sm:text-lg text-[#3e2723] leading-relaxed font-normal">
                    "{selectedMemory.caption}"
                  </p>
                </div>

                {/* Quiet Reflections */}
                <div className="space-y-3 pt-2">
                  <span className="micro-label text-[9px]">Reflections</span>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {selectedMemory.comments && selectedMemory.comments.length > 0 ? (
                      selectedMemory.comments.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-xl bg-[#ffffff]/60 border border-[#7a5240]/10 text-xs"
                        >
                          <span className="font-bold text-[#3e2723]">{c.authorName}:</span>{' '}
                          <span className="text-[#5b3a2e]">{c.text}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#7a5240] italic font-serif">
                        No reflections written yet. Leave a whisper below.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Reflection Input */}
              <form onSubmit={handleSendComment} className="mt-6 pt-4 border-t border-[#7a5240]/15 flex items-center gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Leave a reflection..."
                  className="flex-1 px-4 py-2 rounded-full glass-cream border border-[#7a5240]/25 text-xs text-[#3e2723] focus:outline-none focus:border-[#3e2723]"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="p-2.5 rounded-full bg-[#3e2723] text-[#f9efe8] hover:bg-[#2c1810] transition disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Memory Modal (Rename, Caption, Date, Location, Photo) */}
      {editingMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f100a]/85 backdrop-blur-md animate-fade-up">
          <div className="relative max-w-lg w-full glass-cream-elevated rounded-[36px] border border-[#7a5240]/30 p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setEditingMemory(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-[#7a5240] hover:bg-[#ecd0c8]/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <span className="micro-label">Edit Frame</span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#3e2723] font-bold">
                Edit Memory & Rename
              </h2>
              <p className="text-xs text-[#5b3a2e] font-serif italic mt-0.5">
                "Give this moment the name and words it deserves."
              </p>
            </div>

            {/* Camera filename detected warning helper */}
            {isCameraFilename(editTitle) && (
              <div className="mb-4 p-3 rounded-2xl bg-[#b06a5e]/15 border border-[#b06a5e]/30 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#b06a5e] shrink-0 mt-0.5" />
                <div className="text-xs text-[#3e2723]">
                  <p className="font-bold">Camera code detected ({editTitle})</p>
                  <p className="text-[11px] text-[#5b3a2e] mt-0.5">
                    Tap any romantic suggestion below to rename it instantly:
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEditSubmit} className="space-y-4">
              {/* Memory Title / Name Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3e2723] mb-1.5">
                  Memory Name / Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Sunset at Rock Beach"
                  className="w-full px-4 py-2.5 rounded-2xl glass-cream border-2 border-[#7a5240]/30 text-sm font-semibold text-[#3e2723] focus:outline-none focus:border-[#3e2723]"
                />

                {/* Quick Romantic Name Suggestions */}
                <div className="mt-2">
                  <span className="text-[10px] uppercase font-bold text-[#7a5240] tracking-wider block mb-1">
                    Quick Title Suggestions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {romanticTitleSuggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEditTitle(suggestion)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition cursor-pointer ${
                          editTitle === suggestion
                            ? 'bg-[#3e2723] text-[#f9efe8] border-[#3e2723]'
                            : 'bg-[#ffffff]/70 text-[#5b3a2e] border-[#7a5240]/20 hover:bg-[#ffffff]'
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3e2723] mb-1">
                  Caption in Serif
                </label>
                <textarea
                  rows={3}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="Describe the feeling of that moment..."
                  className="w-full px-4 py-2.5 rounded-2xl glass-cream border border-[#7a5240]/25 text-xs sm:text-sm text-[#3e2723] font-serif italic focus:outline-none focus:border-[#3e2723]"
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3e2723] mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    placeholder="e.g. August 2026"
                    className="w-full px-4 py-2 rounded-2xl glass-cream border border-[#7a5240]/25 text-xs text-[#3e2723] focus:outline-none focus:border-[#3e2723]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3e2723] mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Rock Beach, Puducherry"
                    className="w-full px-4 py-2 rounded-2xl glass-cream border border-[#7a5240]/25 text-xs text-[#3e2723] focus:outline-none focus:border-[#3e2723]"
                  />
                </div>
              </div>

              {/* Replace Photo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3e2723] mb-1">
                  Photo
                </label>
                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={handleEditDeviceUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => editFileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#ffffff]/70 hover:bg-[#ffffff] border border-[#7a5240]/25 text-xs font-semibold text-[#3e2723] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{isUploading ? 'Uploading to akra-media...' : 'Replace photo from device'}</span>
                  </button>
                </div>

                {editImageUrl && (
                  <div className="aspect-16/9 rounded-xl overflow-hidden border border-[#7a5240]/20 mb-2">
                    <img src={editImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Action Buttons: Save & Delete */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="submit"
                  id="save-memory-changes-btn"
                  className="w-full sm:flex-1 py-3 rounded-full bg-[#3e2723] text-[#f9efe8] text-xs font-bold uppercase tracking-wider hover:bg-[#2c1810] transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteMemory(editingMemory.id, editingMemory.title)}
                  className="w-full sm:w-auto px-4 py-3 rounded-full bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Memory Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f100a]/85 backdrop-blur-md animate-fade-up">
          <div className="relative max-w-lg w-full glass-cream-elevated rounded-[36px] border border-[#7a5240]/30 p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-[#7a5240] hover:bg-[#ecd0c8]/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5">
              <span className="micro-label">New Frame</span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#3e2723] font-bold">
                Place a memory on our shelf
              </h2>
              <p className="text-xs text-[#5b3a2e] font-serif italic mt-0.5">
                "A moment captured forever for Mama & Akshu."
              </p>
            </div>

            <form onSubmit={handleAddMemorySubmit} className="space-y-4">
              {/* Photo Upload First */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3e2723] mb-1">
                  Photo
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleDeviceUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#ffffff]/80 hover:bg-[#ffffff] border border-[#7a5240]/25 text-xs font-semibold text-[#3e2723] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-[#b06a5e]" /> : <Upload className="w-4 h-4 text-[#b06a5e]" />}
                    <span>{isUploading ? 'Uploading to akra-media bucket...' : 'Upload photo from device'}</span>
                  </button>
                </div>

                {imageUrl && (
                  <div className="aspect-16/9 rounded-xl overflow-hidden border border-[#7a5240]/25 mb-2">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Sample Curated Presets */}
                <p className="text-[11px] text-[#5b3a2e] font-medium mb-1">Or choose a scenic preset:</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {samplePhotoOptions.map((opt, i) => (
                    <img
                      key={i}
                      src={opt}
                      alt="Preset"
                      onClick={() => setImageUrl(opt)}
                      className={`w-14 h-10 rounded-lg object-cover cursor-pointer border-2 transition ${
                        imageUrl === opt ? 'border-[#3e2723] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Title / Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3e2723]">
                    Memory Name / Title
                  </label>
                  <span className="text-[10px] text-[#7a5240] italic font-serif">
                    Give your memory a special name
                  </span>
                </div>

                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Evening at Serenity Pier"
                  className="w-full px-4 py-2.5 rounded-2xl glass-cream border-2 border-[#7a5240]/30 text-sm font-semibold text-[#3e2723] focus:outline-none focus:border-[#3e2723]"
                />

                {/* Suggestions chips */}
                <div className="mt-2">
                  <span className="text-[10px] uppercase font-bold text-[#7a5240] tracking-wider block mb-1">
                    Romantic Title Ideas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {romanticTitleSuggestions.map((sugg, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTitle(sugg)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition cursor-pointer ${
                          title === sugg
                            ? 'bg-[#3e2723] text-[#f9efe8] border-[#3e2723]'
                            : 'bg-[#ffffff]/70 text-[#5b3a2e] border-[#7a5240]/20 hover:bg-[#ffffff]'
                        }`}
                      >
                        {sugg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3e2723] mb-1">
                  Caption in Serif
                </label>
                <textarea
                  rows={2}
                  required
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe the feeling of that moment..."
                  className="w-full px-4 py-2 rounded-2xl glass-cream border border-[#7a5240]/25 text-xs sm:text-sm text-[#3e2723] font-serif italic focus:outline-none focus:border-[#3e2723]"
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3e2723] mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    placeholder="e.g. August 2026"
                    className="w-full px-4 py-2 rounded-2xl glass-cream border border-[#7a5240]/25 text-xs text-[#3e2723] focus:outline-none focus:border-[#3e2723]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3e2723] mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Puducherry"
                    className="w-full px-4 py-2 rounded-2xl glass-cream border border-[#7a5240]/25 text-xs text-[#3e2723] focus:outline-none focus:border-[#3e2723]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#3e2723] text-[#f9efe8] text-xs font-bold uppercase tracking-wider hover:bg-[#2c1810] transition shadow-md cursor-pointer mt-2 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Float Frame Into Place</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
