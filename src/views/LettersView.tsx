import React, { useState } from 'react';
import { useAkra } from '../context/AkraContext';
import { Letter } from '../types';
import {
  Mail,
  Lock,
  Unlock,
  Plus,
  Heart,
  Calendar,
  Sparkles,
  X,
  Scroll,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const LettersView: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    letters,
    markLetterRead,
    addLetter,
    updateLetter,
    deleteLetter,
    showToast,
  } = useAkra();

  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null);
  const [deletingLetterId, setDeletingLetterId] = useState<string | null>(null);

  // Compose / Edit State
  const [title, setTitle] = useState('Open when you miss me');
  const [category, setCategory] = useState<Letter['category']>('miss_you');
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState('');

  // Presets
  const presets: { title: string; cat: Letter['category'] }[] = [
    { title: 'Open when you miss me', cat: 'miss_you' },
    { title: "Open when you can't sleep", cat: 'cant_sleep' },
    { title: 'Open when you feel stressed', cat: 'stressed' },
    { title: 'Open on our next anniversary', cat: 'anniversary' },
    { title: 'Open when you feel lonely', cat: 'lonely' },
    { title: 'Open when we just had an argument', cat: 'argument' },
    { title: 'Open on your birthday', cat: 'birthday' },
    { title: 'Open just because I love you', cat: 'just_because' },
  ];

  const handleOpenLetter = (letter: Letter) => {
    if (letter.unlockDate) {
      const targetDate = new Date(letter.unlockDate);
      if (targetDate > new Date()) {
        showToast('Enclosed Until Future', `This envelope is sealed until ${letter.unlockDate}.`, 'system');
        return;
      }
    }

    markLetterRead(letter.id);
    setSelectedLetter({ ...letter, isRead: true });
  };

  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    addLetter({
      title: title.trim(),
      category,
      content: content.trim(),
      unlockDate: unlockDate.trim() || undefined,
    });

    setTitle('Open when you miss me');
    setContent('');
    setUnlockDate('');
    setShowComposeModal(false);
    showToast('Envelope Sealed', 'Your letter has been pressed with wax and placed on the desk.', 'system');
  };

  const handleStartEdit = (letter: Letter, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingLetter(letter);
    setTitle(letter.title);
    setCategory(letter.category);
    setContent(letter.content);
    setUnlockDate(letter.unlockDate || '');
    if (selectedLetter?.id === letter.id) {
      setSelectedLetter(null);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLetter || !title.trim() || !content.trim()) return;

    updateLetter(editingLetter.id, {
      title: title.trim(),
      category,
      content: content.trim(),
      unlockDate: unlockDate.trim() || undefined,
    });

    setEditingLetter(null);
    setTitle('Open when you miss me');
    setContent('');
    setUnlockDate('');
    showToast('Envelope Updated', 'Your edits have been resealed into the fold.', 'system');
  };

  const handleDeleteConfirm = (id: string) => {
    deleteLetter(id);
    setDeletingLetterId(null);
    if (selectedLetter?.id === id) {
      setSelectedLetter(null);
    }
    showToast('Letter Removed', 'The envelope has been respectfully discarded.', 'system');
  };

  const getCategoryLabel = (cat: Letter['category']) => {
    switch (cat) {
      case 'miss_you':
        return 'When You Miss Me';
      case 'cant_sleep':
        return "Can't Sleep";
      case 'stressed':
        return 'Feeling Stressed';
      case 'anniversary':
        return 'Anniversary';
      case 'lonely':
        return 'Feeling Lonely';
      case 'argument':
        return 'After an Argument';
      case 'birthday':
        return 'Birthday';
      default:
        return 'Just Because';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10 select-none animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#7a5240]/15">
        <div>
          <span className="micro-label">Physical Envelopes in Digital Space</span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#5b3a2e] font-normal tracking-tight">
            Letters <span className="font-serif italic">& Envelopes</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#7a5240] font-serif italic mt-1">
            "Open only when the exact moment in life arrives."
          </p>
        </div>

        <button
          onClick={() => {
            setTitle('Open when you miss me');
            setContent('');
            setUnlockDate('');
            setShowComposeModal(true);
          }}
          id="pen-letter-btn"
          className="self-start sm:self-auto px-5 py-2.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] text-xs font-semibold hover:bg-[#4a2e24] transition flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#ecd0c8]" />
          <span>Pen a Sealed Envelope</span>
        </button>
      </div>

      {/* Grid of Sealed Letters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {letters.map((letter) => {
          return (
            <div
              key={letter.id}
              onClick={() => {
                if (letter.isRead) {
                  setSelectedLetter(letter);
                } else {
                  handleOpenLetter(letter);
                }
              }}
              className="group glass-cream p-6 rounded-[32px] border border-[#7a5240]/20 shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between relative"
            >
              <div>
                {/* Envelope Seal Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="micro-label text-[8px] bg-[#ecd0c8]/60 px-2.5 py-0.5 rounded-full border border-[#7a5240]/15">
                    {getCategoryLabel(letter.category)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Action buttons */}
                    <button
                      type="button"
                      onClick={(e) => handleStartEdit(letter, e)}
                      className="p-1 rounded-full text-[#7a5240]/70 hover:text-[#5b3a2e] hover:bg-[#ecd0c8]/60 transition opacity-70 group-hover:opacity-100"
                      title="Edit letter"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingLetterId(letter.id);
                      }}
                      className="p-1 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition opacity-70 group-hover:opacity-100"
                      title="Delete letter"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {letter.isRead ? (
                      <span className="text-[10px] text-[#7a5240] font-mono flex items-center gap-1 ml-1">
                        <Unlock className="w-3 h-3 text-[#b06a5e]" />
                        <span>Unsealed</span>
                      </span>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#5b3a2e] text-[#f9efe8] flex items-center justify-center shadow-xs ml-1">
                        <Lock className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="font-serif text-xl text-[#5b3a2e] font-normal leading-snug mb-2 group-hover:text-[#4a2e24] transition-colors">
                  {letter.title}
                </h3>

                <p className="text-xs text-[#7a5240] line-clamp-3 font-serif italic leading-relaxed">
                  {letter.isRead ? letter.content : 'Sealed with deep wax. Tap gently to open the fold.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#7a5240]/15 flex items-center justify-between text-[10px] text-[#7a5240]/75 font-mono">
                <span>From {letter.authorName}</span>
                <span>{letter.unlockDate ? `Until: ${letter.unlockDate}` : 'Open anytime'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Letter Reading Lightbox Modal (Parchment Aesthetic) */}
      {selectedLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e1d17]/80 backdrop-blur-md animate-fade-up">
          <div className="w-full max-w-xl glass-cream rounded-[36px] p-7 sm:p-10 shadow-2xl border border-[#7a5240]/25 relative max-h-[88vh] overflow-y-auto">
            <div className="absolute top-5 right-5 flex items-center gap-2">
              <button
                onClick={(e) => handleStartEdit(selectedLetter, e)}
                className="p-2 rounded-full text-[#7a5240] hover:bg-[#ecd0c8]/60 transition cursor-pointer"
                title="Edit envelope"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setDeletingLetterId(selectedLetter.id);
                }}
                className="p-2 rounded-full text-rose-400 hover:bg-rose-50 transition cursor-pointer"
                title="Delete envelope"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedLetter(null)}
                className="p-2 rounded-full text-[#7a5240] hover:bg-[#ecd0c8]/60 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Wax Seal Emblem */}
            <div className="w-12 h-12 mx-auto rounded-full bg-[#5b3a2e] text-[#f9efe8] flex items-center justify-center shadow-md mb-4 ring-4 ring-[#ecd0c8]">
              <Scroll className="w-5 h-5 text-[#f9efe8]" />
            </div>

            <div className="text-center mb-6">
              <span className="micro-label text-[8px] text-[#7a5240] block mb-1">
                {getCategoryLabel(selectedLetter.category)}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#5b3a2e] font-normal">
                {selectedLetter.title}
              </h2>
              <p className="text-[11px] text-[#7a5240]/80 font-mono mt-1">
                Penned by {selectedLetter.authorName}
              </p>
            </div>

            {/* Letter Content */}
            <div className="p-6 rounded-2xl bg-[#ffffff]/60 border border-[#7a5240]/15 shadow-inner">
              <p className="font-serif italic text-base sm:text-lg text-[#5b3a2e] leading-relaxed whitespace-pre-line">
                "{selectedLetter.content}"
              </p>
            </div>

            <div className="mt-6 text-center text-xs text-[#7a5240] font-serif italic">
              "Kept in the quiet sanctuary of AKRA."
            </div>
          </div>
        </div>
      )}

      {/* Compose Letter Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e1d17]/80 backdrop-blur-md animate-fade-up">
          <div className="relative max-w-lg w-full glass-cream rounded-[32px] border border-[#7a5240]/25 p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => setShowComposeModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-[#7a5240] hover:bg-[#ecd0c8]/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="micro-label">Pen a Letter</span>
            <h2 className="font-serif text-2xl text-[#5b3a2e] font-normal mb-1">
              Seal an Envelope for Your Partner
            </h2>
            <p className="text-xs text-[#7a5240] font-serif italic mb-4">
              "Only to be opened when the right moment arrives."
            </p>

            <form onSubmit={handleComposeSubmit} className="space-y-4">
              {/* Presets */}
              <div>
                <label className="block micro-label mb-1.5">Letter Presets</label>
                <div className="flex flex-wrap gap-2">
                  {presets.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setTitle(p.title);
                        setCategory(p.cat);
                      }}
                      className={`text-[11px] px-3 py-1 rounded-full border transition cursor-pointer ${
                        title === p.title
                          ? 'bg-[#5b3a2e] text-[#f9efe8] border-[#5b3a2e]'
                          : 'bg-[#ffffff]/60 text-[#7a5240] border-[#7a5240]/20 hover:bg-[#ffffff]'
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block micro-label mb-1">Custom Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-2xl glass-cream border border-[#7a5240]/20 text-xs text-[#5b3a2e] focus:outline-none focus:border-[#5b3a2e]"
                />
              </div>

              <div>
                <label className="block micro-label mb-1">Handwritten Words</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Pour your thoughts onto this page..."
                  className="w-full px-4 py-3 rounded-2xl glass-cream border border-[#7a5240]/20 text-xs text-[#5b3a2e] font-serif italic leading-relaxed focus:outline-none focus:border-[#5b3a2e]"
                />
              </div>

              <div>
                <label className="block micro-label mb-1">Sealed Until Date (Optional)</label>
                <input
                  type="text"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  placeholder="e.g. October 14, 2026"
                  className="w-full px-4 py-2 rounded-2xl glass-cream border border-[#7a5240]/20 text-xs text-[#5b3a2e] focus:outline-none focus:border-[#5b3a2e]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#5b3a2e] text-[#f9efe8] text-xs font-semibold hover:bg-[#4a2e24] transition shadow-md cursor-pointer mt-2"
              >
                Press Wax Seal & Deliver
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Letter Modal */}
      {editingLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e1d17]/80 backdrop-blur-md animate-fade-up">
          <div className="relative max-w-lg w-full glass-cream rounded-[32px] border border-[#7a5240]/25 p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => setEditingLetter(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-[#7a5240] hover:bg-[#ecd0c8]/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="micro-label">Update Letter</span>
            <h2 className="font-serif text-2xl text-[#5b3a2e] font-normal mb-1">
              Edit Sealed Words
            </h2>
            <p className="text-xs text-[#7a5240] font-serif italic mb-4">
              "Refine your letter before or after it is opened."
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block micro-label mb-1">Letter Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-2xl glass-cream border border-[#7a5240]/20 text-xs text-[#5b3a2e] focus:outline-none focus:border-[#5b3a2e]"
                />
              </div>

              <div>
                <label className="block micro-label mb-1">Handwritten Words</label>
                <textarea
                  rows={5}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl glass-cream border border-[#7a5240]/20 text-xs text-[#5b3a2e] font-serif italic leading-relaxed focus:outline-none focus:border-[#5b3a2e]"
                />
              </div>

              <div>
                <label className="block micro-label mb-1">Sealed Until Date (Optional)</label>
                <input
                  type="text"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  placeholder="e.g. October 14, 2026"
                  className="w-full px-4 py-2 rounded-2xl glass-cream border border-[#7a5240]/20 text-xs text-[#5b3a2e] focus:outline-none focus:border-[#5b3a2e]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLetter(null)}
                  className="flex-1 py-2.5 rounded-full border border-[#7a5240]/30 text-xs text-[#5b3a2e] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] text-xs font-semibold hover:bg-[#4a2e24] transition shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLetterId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e1d17]/80 backdrop-blur-md animate-fade-up">
          <div className="relative max-w-sm w-full glass-cream rounded-[32px] border border-rose-300 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-[#5b3a2e] font-semibold">Discard this Envelope?</h3>
              <p className="text-xs text-[#7a5240] mt-1 font-serif italic">
                This letter will be permanently erased from your desk.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLetterId(null)}
                className="flex-1 py-2 rounded-full border border-[#7a5240]/30 text-xs text-[#5b3a2e] cursor-pointer"
              >
                Keep Envelope
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(deletingLetterId)}
                className="flex-1 py-2 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer shadow-md"
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
