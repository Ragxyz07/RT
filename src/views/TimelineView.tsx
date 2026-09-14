import React, { useState, useRef } from 'react';
import { useAkra } from '../context/AkraContext';
import { Milestone } from '../types';
import { uploadToSupabaseStorage } from '../lib/storage';
import {
  Milestone as MilestoneIcon,
  Heart,
  Plus,
  Calendar,
  Sparkles,
  Music,
  MapPin,
  X,
  PhoneCall,
  Plane,
  Gift,
  Pencil,
  Trash2,
  Upload,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export const TimelineView: React.FC = () => {
  const {
    milestones,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    currentUser,
    partnerUser,
    showToast,
  } = useAkra();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('2026-06-15');
  const [desc, setDesc] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [song, setSong] = useState('');
  const [iconType, setIconType] = useState<string>('heart');

  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setDateStr('2026-06-15');
    setDesc('');
    setPhotoUrl('');
    setSong('');
    setIconType('heart');
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      showToast('Uploading photo...', 'Sending milestone photo to akra-media bucket.', 'info');
      const uploadRes = await uploadToSupabaseStorage(file, {
        bucket: 'akra-media',
        folder: 'timeline',
        filename: `timeline-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
        caption: title || file.name,
        category: 'timeline',
      });

      if (uploadRes.url) {
        setPhotoUrl(uploadRes.url);
        showToast('Photo Uploaded 📸', 'Saved to akra-media bucket with public URL.', 'system');
      }
    } catch (err) {
      console.error('Timeline upload failed:', err);
      showToast('Upload Failed', 'Could not upload photo to akra-media.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addMilestone({
      title: title.trim(),
      date: dateStr.trim(),
      description: desc.trim(),
      photoUrl: photoUrl.trim() || undefined,
      song: song.trim() || undefined,
      iconType: (iconType as any) || 'heart',
    });

    resetForm();
    setShowAddModal(false);
    showToast('Milestone Added', 'A new chapter added to our story.', 'system');
  };

  const handleStartEdit = (m: Milestone) => {
    setEditingMilestone(m);
    setTitle(m.title);
    setDateStr(m.date);
    setDesc(m.description);
    setPhotoUrl(m.photoUrl || '');
    setSong(m.song || '');
    setIconType(m.iconType || 'heart');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone || !title.trim()) return;

    updateMilestone(editingMilestone.id, {
      title: title.trim(),
      date: dateStr.trim(),
      description: desc.trim(),
      photoUrl: photoUrl.trim() || undefined,
      song: song.trim() || undefined,
      iconType: (iconType as any) || 'heart',
    });

    setEditingMilestone(null);
    resetForm();
    showToast('Milestone Updated', 'Changes saved to our shared story.', 'system');
  };

  const handleDeleteConfirm = (id: string) => {
    deleteMilestone(id);
    setDeletingMilestoneId(null);
    showToast('Milestone Deleted', 'Removed from timeline.', 'system');
  };

  const getMilestoneIcon = (type?: string) => {
    switch (type) {
      case 'call':
        return <PhoneCall className="w-4 h-4 text-white" />;
      case 'flight':
        return <Plane className="w-4 h-4 text-white" />;
      case 'gift':
        return <Gift className="w-4 h-4 text-white" />;
      default:
        return <Heart className="w-4 h-4 fill-white text-white" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-8 select-none animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8D5C4]">
        <div>
          <div className="flex items-center gap-2">
            <MilestoneIcon className="w-5 h-5 text-[#6D4C41]" />
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#3E2723]">
              OUR STORY TIMELINE
            </h1>
          </div>
          <p className="text-xs text-[#8D6E63] font-serif italic">
            "Every step that turned strangers into our whole world."
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          id="add-milestone-btn"
          className="px-5 py-2.5 rounded-full bg-[#6D4C41] text-white text-xs font-semibold hover:bg-[#5D4037] transition flex items-center gap-2 shadow-xs self-start sm:self-auto active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Milestone</span>
        </button>
      </div>

      {/* Vertical Connected Timeline */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-[#E8D5C4] space-y-8 ml-3 sm:ml-4">
        {milestones.map((m) => (
          <div key={m.id} className="relative group">
            {/* Timeline Node Icon */}
            <div className="absolute -left-[35px] sm:-left-[43px] top-1 w-8 h-8 rounded-full bg-[#6D4C41] flex items-center justify-center shadow-xs ring-4 ring-[#FAF7F2]">
              {getMilestoneIcon(m.iconType)}
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-[32px] p-6 border border-[#E8D5C4] shadow-2xs hover:shadow-md transition-all relative">
              {/* Header row with date & edit/delete actions */}
              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#6D4C41] uppercase tracking-wider">
                    {m.date}
                  </span>
                  {m.song && (
                    <span className="text-[11px] text-[#8D6E63] flex items-center gap-1 bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#E8D5C4]">
                      <Music className="w-3 h-3 text-[#6D4C41]" />
                      <span>{m.song}</span>
                    </span>
                  )}
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(m)}
                    className="p-1.5 rounded-full text-[#8D6E63] hover:text-[#3E2723] hover:bg-[#FAF7F2] transition cursor-pointer"
                    title="Edit milestone"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingMilestoneId(m.id)}
                    className="p-1.5 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete milestone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-serif font-bold text-base sm:text-lg text-[#3E2723] mb-2">
                {m.title}
              </h3>

              <p className="text-xs sm:text-sm text-[#5D4037] leading-relaxed mb-4 whitespace-pre-line">
                {m.description}
              </p>

              {m.photoUrl && (
                <div className="rounded-2xl overflow-hidden aspect-16/9 bg-[#FAF7F2] max-w-md border border-[#E8D5C4]">
                  <img
                    src={m.photoUrl}
                    alt={m.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition duration-500"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-up">
          <div className="w-full max-w-md bg-[#FAF7F2] rounded-[32px] p-6 sm:p-8 shadow-2xl border border-[#E8D5C4] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D5C4] mb-4">
              <h3 className="font-serif font-bold text-base text-[#3E2723]">Add Milestone</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-[#8D6E63] hover:bg-[#E8D5C4]/40 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. First Time We Held Hands"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                    Special Song (Optional)
                  </label>
                  <input
                    type="text"
                    value={song}
                    onChange={(e) => setSong(e.target.value)}
                    placeholder="e.g. Yellow - Coldplay"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="How did you feel that day?"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                  Milestone Photo (Optional)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="file"
                    ref={addFileInputRef}
                    onChange={handleDeviceUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => addFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-[#E8D5C4] bg-white text-xs text-[#6D4C41] flex items-center gap-1.5 hover:bg-[#FAF7F2] cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{isUploading ? 'Uploading to akra-media...' : 'Choose from device'}</span>
                  </button>
                  {photoUrl && (
                    <span className="text-[11px] text-emerald-600 self-center">✓ Photo selected</span>
                  )}
                </div>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="Or paste image URL (https://...)"
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
                  className="px-5 py-2.5 rounded-full bg-[#6D4C41] text-white text-xs font-semibold hover:bg-[#5D4037] transition shadow-xs cursor-pointer"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Milestone Modal */}
      {editingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-up">
          <div className="w-full max-w-md bg-[#FAF7F2] rounded-[32px] p-6 sm:p-8 shadow-2xl border border-[#E8D5C4] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D5C4] mb-4">
              <h3 className="font-serif font-bold text-base text-[#3E2723]">Edit Milestone</h3>
              <button
                onClick={() => setEditingMilestone(null)}
                className="p-1 rounded-full text-[#8D6E63] hover:bg-[#E8D5C4]/40 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                    Song
                  </label>
                  <input
                    type="text"
                    value={song}
                    onChange={(e) => setSong(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                  Photo
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="file"
                    ref={editFileInputRef}
                    onChange={handleDeviceUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => editFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-[#E8D5C4] bg-white text-xs text-[#6D4C41] flex items-center gap-1.5 hover:bg-[#FAF7F2] cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{isUploading ? 'Uploading to akra-media...' : 'Upload new photo'}</span>
                  </button>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="Photo URL"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8D5C4]">
                <button
                  type="button"
                  onClick={() => setEditingMilestone(null)}
                  className="px-4 py-2.5 rounded-full border border-[#E8D5C4] text-xs text-[#3E2723] hover:bg-[#F5F1EB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#6D4C41] text-white text-xs font-semibold hover:bg-[#5D4037] transition shadow-xs cursor-pointer"
                >
                  Update Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMilestoneId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-up">
          <div className="w-full max-w-sm bg-[#FAF7F2] rounded-[32px] p-6 shadow-2xl border border-rose-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#3E2723]">Delete Milestone?</h3>
              <p className="text-xs text-[#8D6E63] mt-1 font-serif italic">
                Are you sure you want to remove this milestone from your story?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMilestoneId(null)}
                className="flex-1 py-2 rounded-full border border-[#E8D5C4] text-xs text-[#3E2723] hover:bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(deletingMilestoneId)}
                className="flex-1 py-2 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
