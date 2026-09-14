import React, { useState } from 'react';
import { useAkra } from '../context/AkraContext';
import { FutureItem } from '../types';
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

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FutureItem['category']>('places');
  const [notes, setNotes] = useState('');

  const categories = [
    { id: 'all', label: 'All Dreams', icon: Sparkles },
    { id: 'places', label: '✈️ Places to Visit', icon: Plane },
    { id: 'experiences', label: '🌟 Experiences', icon: Heart },
    { id: 'restaurants', label: '🍽️ Food & Dates', icon: Utensils },
    { id: 'movies', label: '🎬 Watchlist', icon: Target },
    { id: 'dreams', label: '🏠 Life Dreams', icon: Home },
  ];

  const resetForm = () => {
    setTitle('');
    setCategory('places');
    setNotes('');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addFutureItem({
      title: title.trim(),
      category,
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
    setNotes(item.notes || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !title.trim()) return;

    updateFutureItem(editingItem.id, {
      title: title.trim(),
      category,
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
            "Everything we are working towards, one dream at a time."
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
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-[28px] p-5 border border-[#E8D5C4] shadow-2xs hover:border-[#6D4C41] transition flex items-start justify-between gap-4 group"
          >
            <div className="flex items-start gap-3.5">
              <button
                onClick={() => toggleFutureItem(item.id)}
                className="mt-0.5 text-[#8D6E63] hover:text-[#6D4C41] transition cursor-pointer"
                title={item.completed ? 'Mark as dream' : 'Mark as done'}
              >
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-[#53a876] fill-[#53a876]/20" />
                ) : (
                  <Circle className="w-5 h-5 text-[#A1887F] group-hover:text-[#6D4C41]" />
                )}
              </button>

              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3
                    className={`font-serif font-bold text-base text-[#3E2723] ${
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

                <div className="flex items-center gap-3 text-[11px] text-[#8D6E63] flex-wrap">
                  <span className="capitalize font-semibold text-[#6D4C41]">
                    {item.category}
                  </span>
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
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleStartEdit(item)}
                className="p-1.5 rounded-full text-[#8D6E63] hover:text-[#3E2723] hover:bg-[#FAF7F2] transition cursor-pointer opacity-70 group-hover:opacity-100"
                title="Edit dream"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeletingItemId(item.id)}
                className="p-1.5 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer opacity-70 group-hover:opacity-100"
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

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-up">
          <div className="w-full max-w-md bg-[#FAF7F2] rounded-[32px] p-6 sm:p-8 shadow-2xl border border-[#E8D5C4]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D5C4] mb-4">
              <h3 className="font-serif font-bold text-base text-[#3E2723]">Add to Bucket List</h3>
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
                  Dream Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Move into our cozy apartment together"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

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
                  className="px-5 py-2.5 rounded-full bg-[#6D4C41] text-white text-xs font-semibold hover:bg-[#5D4037] transition shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-up">
          <div className="w-full max-w-md bg-[#FAF7F2] rounded-[32px] p-6 sm:p-8 shadow-2xl border border-[#E8D5C4]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D5C4] mb-4">
              <h3 className="font-serif font-bold text-base text-[#3E2723]">Edit Bucket List Dream</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-full text-[#8D6E63] hover:bg-[#E8D5C4]/40 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#8D6E63] mb-1">
                  Dream Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D5C4] bg-white text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

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
                  className="px-5 py-2.5 rounded-full bg-[#6D4C41] text-white text-xs font-semibold hover:bg-[#5D4037] transition shadow-xs cursor-pointer"
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
    </div>
  );
};
