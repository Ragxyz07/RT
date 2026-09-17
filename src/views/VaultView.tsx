import React, { useState, useRef } from 'react';
import { useAkra } from '../context/AkraContext';
import { VaultItem } from '../types';
import { uploadToSupabaseStorage } from '../lib/storage';
import { downloadImage } from '../utils/download';
import {
  Lock,
  Unlock,
  Plus,
  Shield,
  Eye,
  Trash2,
  X,
  Upload,
  Info,
  Maximize2,
  Sparkles,
  Pencil,
  AlertTriangle,
  Loader2,
  KeyRound,
  Check,
  Download,
} from 'lucide-react';

export const VaultView: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    vaultItems,
    isVaultUnlocked,
    unlockVault,
    lockVault,
    changeVaultPin,
    addVaultItem,
    updateVaultItem,
    deleteVaultItem,
    relationship,
    showToast,
  } = useAkra();

  // PIN Keypad State
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [pinError, setPinError] = useState(false);
  const [showPinHint, setShowPinHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Add Secret Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Edit / View / Delete States
  const [viewingItem, setViewingItem] = useState<VaultItem | null>(null);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Change Passcode Modal State
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [changePinError, setChangePinError] = useState('');
  const [changePinSuccess, setChangePinSuccess] = useState(false);

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError('');
    setChangePinSuccess(false);

    if (!currentPinInput) {
      setChangePinError('Please enter your current 4-digit passcode.');
      return;
    }
    if (newPinInput.length !== 4 || isNaN(Number(newPinInput))) {
      setChangePinError('New passcode must be exactly 4 numeric digits.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setChangePinError('New passcodes do not match. Please re-enter.');
      return;
    }

    const result = changeVaultPin(currentPinInput, newPinInput);
    if (!result.success) {
      setChangePinError(result.error || 'Current passcode is incorrect.');
      return;
    }

    setChangePinSuccess(true);
    setTimeout(() => {
      setShowChangePinModal(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setChangePinSuccess(false);
      setChangePinError('');
    }, 1200);
  };

  const presetPhotos = [
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
  ];

  const handleKeyPress = (num: string) => {
    if (pinDigits.length < 4) {
      const next = [...pinDigits, num];
      setPinDigits(next);

      if (next.length === 4) {
        const fullPin = next.join('');
        const success = unlockVault(fullPin);
        if (!success) {
          setPinError(true);
          setTimeout(() => {
            setPinDigits([]);
            setPinError(false);
          }, 750);
        } else {
          setPinDigits([]);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPinDigits((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      showToast('Securing in Vault...', 'Uploading file to private akra-vault bucket.', 'info');
      const result = await uploadToSupabaseStorage(file, {
        bucket: 'akra-vault',
        folder: 'vault',
        caption: newTitle || file.name,
      });

      if (result.url) {
        setNewUrl(result.url);
        if (!isEditing && !newTitle) {
          setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
        showToast('Photo Secured 🔐', 'Uploaded directly to akra-vault with signed URL generated.', 'system');
      }
    } catch (err) {
      console.error('Vault upload error:', err);
      showToast('Upload Failed', 'Could not upload to vault bucket.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSecretSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    addVaultItem({
      title: newTitle.trim(),
      description: newDescription.trim() || 'A secret moment kept just between the two of us.',
      mediaUrl: newUrl.trim(),
      type: 'photo',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      isLocked: true,
    });

    showToast('Vault Item Encrypted', 'Safely hidden inside our sanctuary.', 'system');

    setNewTitle('');
    setNewDescription('');
    setNewUrl('');
    setShowAddModal(false);
  };

  const handleStartEdit = (item: VaultItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingItem(item);
    setNewTitle(item.title);
    setNewDescription(item.description);
    setNewUrl(item.mediaUrl);
    if (viewingItem?.id === item.id) {
      setViewingItem(null);
    }
  };

  const handleEditSecretSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !newTitle.trim() || !newUrl.trim()) return;

    updateVaultItem(editingItem.id, {
      title: newTitle.trim(),
      description: newDescription.trim(),
      mediaUrl: newUrl.trim(),
    });

    showToast('Vault Secret Updated', 'Changes re-encrypted securely.', 'system');
    setEditingItem(null);
    setNewTitle('');
    setNewDescription('');
    setNewUrl('');
  };

  const handleDeleteConfirm = (id: string) => {
    deleteVaultItem(id);
    setDeletingItemId(null);
    if (viewingItem?.id === id) {
      setViewingItem(null);
    }
    showToast('Removed', 'Deleted from vault.', 'system');
  };

  const renderChangePinModal = () => {
    if (!showChangePinModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140c09]/90 backdrop-blur-md animate-fade-up">
        <div className="relative max-w-sm w-full rounded-[32px] bg-[#2d1b15] border border-[#7a5240]/50 p-6 sm:p-7 shadow-2xl text-left space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#7a5240]/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#3e241c] border border-[#7a5240]/40 flex items-center justify-center text-[#d9a89e]">
                <KeyRound className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-lg text-[#f9efe8] font-normal">Change Vault Passcode</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowChangePinModal(false);
                setChangePinError('');
                setChangePinSuccess(false);
              }}
              className="p-1 rounded-full text-[#d9a89e]/70 hover:text-[#f9efe8] hover:bg-[#3e241c] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#d9a89e]/80 leading-relaxed font-serif italic">
            Enter your current 4-digit code, then create and confirm your new secret passcode.
          </p>

          <form onSubmit={handleChangePinSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-sans font-medium uppercase tracking-wider mb-1 text-[#d9a89e]">
                Current Passcode
              </label>
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Current 4 digits"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#1e130f] border border-[#7a5240]/50 text-center font-mono text-base text-[#f9efe8] tracking-widest focus:outline-none focus:border-[#d9a89e]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-sans font-medium uppercase tracking-wider mb-1 text-[#d9a89e]">
                New 4-Digit Passcode
              </label>
              <input
                type="password"
                maxLength={4}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="New 4 digits"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#1e130f] border border-[#7a5240]/50 text-center font-mono text-base text-[#f9efe8] tracking-widest focus:outline-none focus:border-[#d9a89e]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-sans font-medium uppercase tracking-wider mb-1 text-[#d9a89e]">
                Confirm New Passcode
              </label>
              <input
                type="password"
                maxLength={4}
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Re-enter 4 digits"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#1e130f] border border-[#7a5240]/50 text-center font-mono text-base text-[#f9efe8] tracking-widest focus:outline-none focus:border-[#d9a89e]"
              />
            </div>

            {changePinError && (
              <p className="text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-xl border border-rose-800 font-sans">
                {changePinError}
              </p>
            )}

            {changePinSuccess && (
              <p className="text-xs text-emerald-300 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800 font-sans flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Passcode updated successfully!</span>
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowChangePinModal(false);
                  setChangePinError('');
                  setChangePinSuccess(false);
                }}
                className="flex-1 py-2.5 rounded-full border border-[#7a5240]/40 text-xs text-[#d9a89e] hover:bg-[#3e241c] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={changePinSuccess}
                className="flex-1 py-2.5 rounded-full bg-[#d9a89e] text-[#241612] text-xs font-semibold hover:bg-[#e7c4bd] cursor-pointer shadow-md transition active:scale-95 disabled:opacity-60"
              >
                Save Passcode
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // --- LOCKED STATE ---
  if (!isVaultUnlocked) {
    return (
      <div className="min-h-[calc(100vh-100px)] w-full bg-pink-dusk-vault flex items-center justify-center p-4 select-none animate-fade-up">
        <div className="max-w-sm w-full rounded-[36px] bg-[#2d1b15]/90 border border-[#7a5240]/40 p-7 sm:p-9 shadow-2xl backdrop-blur-xl text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#3e241c] border border-[#7a5240]/40 flex items-center justify-center mb-4 text-[#d9a89e] shadow-inner">
            <Lock className="w-5 h-5" />
          </div>

          <h2 className="font-serif text-3xl text-[#f9efe8] font-normal tracking-tight">
            Private <span className="font-serif italic text-[#d9a89e]">Vault</span>
          </h2>
          <p className="text-xs text-[#d9a89e]/80 font-serif italic mt-1 mb-6">
            "Only for Mama & Akshu. Enter the 4-digit key."
          </p>

          {/* 4 Digit Slots */}
          <div className="flex items-center justify-center gap-4 mb-7">
            {[0, 1, 2, 3].map((idx) => {
              const filled = pinDigits.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                    pinError
                      ? 'border-rose-400 bg-rose-500 animate-pulse'
                      : filled
                      ? 'border-[#d9a89e] bg-[#d9a89e] scale-110 shadow-sm'
                      : 'border-[#7a5240]/60 bg-[#1e130f]'
                  }`}
                />
              );
            })}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button
                key={n}
                onClick={() => handleKeyPress(n)}
                className="w-14 h-14 rounded-full bg-[#3e241c]/60 hover:bg-[#4a2e24] text-[#f9efe8] font-serif text-xl flex items-center justify-center border border-[#7a5240]/30 transition-all duration-150 active:scale-90 cursor-pointer shadow-xs mx-auto"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setShowPinHint(!showPinHint)}
              className="w-14 h-14 rounded-full bg-transparent text-[11px] text-[#d9a89e]/70 flex items-center justify-center font-mono cursor-pointer hover:text-[#d9a89e] mx-auto"
            >
              Hint
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="w-14 h-14 rounded-full bg-[#3e241c]/60 hover:bg-[#4a2e24] text-[#f9efe8] font-serif text-xl flex items-center justify-center border border-[#7a5240]/30 transition-all duration-150 active:scale-90 cursor-pointer shadow-xs mx-auto"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="w-14 h-14 rounded-full bg-transparent text-xs text-[#d9a89e]/70 flex items-center justify-center font-mono cursor-pointer hover:text-[#d9a89e] mx-auto"
            >
              ⌫
            </button>
          </div>

          {/* Pin Hint Drawer */}
          {showPinHint && (
            <div className="mt-5 p-3 rounded-2xl bg-[#1e130f]/80 border border-[#7a5240]/30 text-[11px] text-[#d9a89e] font-serif italic animate-fade-up">
              "Default Passcode: 1122 (or 1403)"
            </div>
          )}

          {/* Change Passcode Action */}
          <div className="mt-6 pt-4 border-t border-[#7a5240]/30 w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setChangePinError('');
                setChangePinSuccess(false);
                setShowChangePinModal(true);
              }}
              className="text-xs text-[#d9a89e] hover:text-[#f9efe8] flex items-center gap-1.5 font-sans transition cursor-pointer py-1.5 px-3.5 rounded-full bg-[#3e241c]/50 hover:bg-[#3e241c] border border-[#7a5240]/30 shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#d9a89e]" />
              <span>Change Vault Passcode</span>
            </button>
          </div>
        </div>

        {renderChangePinModal()}
      </div>
    );
  }

  // --- UNLOCKED STATE ---
  return (
    <div className="min-h-[calc(100vh-100px)] w-full bg-pink-dusk-vault p-4 sm:p-8 select-none animate-fade-up">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Unlocked Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#7a5240]/35">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono mb-1">
              <Unlock className="w-3.5 h-3.5" />
              <span>Sanctuary Unlocked</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl text-[#f9efe8] font-normal tracking-tight">
              Secret <span className="font-serif italic text-[#d9a89e]">Vault</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#d9a89e]/80 font-serif italic mt-1">
              "Private photos, handwritten notes, and confidential memories."
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setChangePinError('');
                setChangePinSuccess(false);
                setShowChangePinModal(true);
              }}
              className="px-4 py-2 rounded-full bg-[#3e241c] hover:bg-[#4a2e24] border border-[#7a5240]/40 text-xs text-[#d9a89e] transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
              title="Change 4-digit vault passcode"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change PIN</span>
            </button>
            <button
              onClick={() => {
                setNewTitle('');
                setNewDescription('');
                setNewUrl('');
                setShowAddModal(true);
              }}
              className="px-4 py-2 rounded-full bg-[#d9a89e] text-[#241612] text-xs font-semibold hover:bg-[#e7c4bd] transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Secret</span>
            </button>
            <button
              onClick={lockVault}
              className="px-4 py-2 rounded-full bg-[#3e241c] hover:bg-[#4a2e24] border border-[#7a5240]/40 text-xs text-[#d9a89e] transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Vault</span>
            </button>
          </div>
        </div>

        {/* Grid of Glass Vault Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {vaultItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setViewingItem(item)}
              className="group rounded-[28px] bg-[#2d1b15]/80 border border-[#7a5240]/35 p-4 shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden relative"
            >
              {/* Soft warm glow backing on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-b from-[#d9a89e]/15 to-transparent rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div>
                <div className="aspect-4/3 w-full rounded-2xl overflow-hidden mb-3 bg-[#1e130f] border border-[#7a5240]/25 relative">
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-2 left-2 micro-label text-[8px] bg-[#1e130f]/80 text-[#d9a89e] px-2 py-0.5 rounded-full border border-[#7a5240]/40">
                    Confidential
                  </span>

                  {/* Card Actions (Download, Edit & Delete) */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.mediaUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(item.mediaUrl, `${item.title || 'vault-photo'}.jpg`);
                          showToast('Downloading Photo 💾', 'Saving to your device...', 'love');
                        }}
                        className="p-1.5 rounded-full bg-[#1e130f]/80 text-[#d9a89e] hover:bg-[#3e241c] hover:text-[#f9efe8] transition cursor-pointer"
                        title="Download secret photo"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleStartEdit(item, e)}
                      className="p-1.5 rounded-full bg-[#1e130f]/80 text-[#d9a89e] hover:bg-[#3e241c] transition"
                      title="Edit secret"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingItemId(item.id);
                      }}
                      className="p-1.5 rounded-full bg-[#1e130f]/80 text-rose-400 hover:bg-rose-950 transition"
                      title="Delete secret"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <h3 className="font-serif text-lg text-[#f9efe8] font-normal leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-[#d9a89e]/80 font-serif italic mt-1 line-clamp-2">
                  "{item.description}"
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#7a5240]/25 flex items-center justify-between text-[10px] text-[#d9a89e]/60 font-mono">
                <span>{item.date}</span>
                <Maximize2 className="w-3.5 h-3.5 text-[#d9a89e]/60 group-hover:text-[#d9a89e] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Screen Lightbox Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140c09]/90 backdrop-blur-xl animate-fade-up">
          <div className="relative max-w-3xl w-full rounded-[36px] bg-[#2d1b15] border border-[#7a5240]/40 p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="absolute top-5 right-5 flex items-center gap-2">
              {viewingItem.mediaUrl && (
                <button
                  onClick={() => {
                    downloadImage(viewingItem.mediaUrl, `${viewingItem.title || 'vault-photo'}.jpg`);
                    showToast('Downloading Photo 💾', 'Saving to your device...', 'love');
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#3e241c] text-[#d9a89e] hover:text-[#f9efe8] hover:bg-[#4a2e24] border border-[#7a5240]/40 transition cursor-pointer flex items-center gap-1.5 text-xs font-sans shadow-sm"
                  title="Download photo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}
              <button
                onClick={(e) => handleStartEdit(viewingItem, e)}
                className="p-2 rounded-full text-[#d9a89e] hover:bg-[#3e241c] transition cursor-pointer"
                title="Edit secret"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeletingItemId(viewingItem.id)}
                className="p-2 rounded-full text-rose-400 hover:bg-rose-950 transition cursor-pointer"
                title="Delete secret"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewingItem(null)}
                className="p-2 rounded-full text-[#d9a89e] hover:bg-[#3e241c] transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-16/10 rounded-2xl overflow-hidden mb-5 bg-[#140c09] border border-[#7a5240]/40">
              <img
                src={viewingItem.mediaUrl}
                alt={viewingItem.title}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="micro-label text-[9px] text-[#d9a89e]">Secret Frame</span>
                <h2 className="font-serif text-2xl text-[#f9efe8] font-normal mt-0.5">
                  {viewingItem.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#d9a89e] font-serif italic mt-1 leading-relaxed whitespace-pre-line">
                  "{viewingItem.description}"
                </p>
                <p className="text-[10px] text-[#d9a89e]/60 font-mono mt-2">{viewingItem.date}</p>
              </div>

              {viewingItem.mediaUrl && (
                <button
                  onClick={() => {
                    downloadImage(viewingItem.mediaUrl, `${viewingItem.title || 'vault-photo'}.jpg`);
                    showToast('Downloading Photo 💾', 'Saving to your device...', 'love');
                  }}
                  className="self-start sm:self-center px-4 py-2.5 rounded-full bg-[#d9a89e] text-[#241612] text-xs font-semibold hover:bg-[#e7c4bd] transition shadow-md flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Secret Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140c09]/85 backdrop-blur-md animate-fade-up">
          <div className="relative max-w-md w-full rounded-[32px] bg-[#2d1b15] border border-[#7a5240]/40 p-6 sm:p-8 shadow-2xl text-[#f9efe8]">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-[#d9a89e] hover:bg-[#3e241c] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="font-serif text-2xl text-[#f9efe8] font-normal mb-1">
              Add Secret Frame
            </h2>
            <p className="text-xs text-[#d9a89e]/80 font-serif italic mb-4">
              "Kept behind the 4-digit code."
            </p>

            <form onSubmit={handleAddSecretSubmit} className="space-y-4">
              <div>
                <label className="block micro-label mb-1 text-[#d9a89e]">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 2 AM Whispers"
                  className="w-full px-4 py-2 rounded-2xl bg-[#1e130f] border border-[#7a5240]/40 text-xs text-[#f9efe8] focus:outline-none focus:border-[#d9a89e]"
                />
              </div>

              <div>
                <label className="block micro-label mb-1 text-[#d9a89e]">Photo</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleDeviceUpload(e, false)}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#3e241c] hover:bg-[#4a2e24] border border-[#7a5240]/40 text-xs text-[#d9a89e] flex items-center justify-center gap-2 cursor-pointer mb-2 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isUploading ? 'Securing in akra-vault bucket...' : 'Upload from device'}</span>
                </button>

                {newUrl && (
                  <div className="aspect-16/9 rounded-xl overflow-hidden border border-[#7a5240]/40 mb-2">
                    <img src={newUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <p className="text-[10px] text-[#d9a89e]/70 mb-1">Or select a preset:</p>
                <div className="flex gap-2 pb-1">
                  {presetPhotos.map((preset, i) => (
                    <img
                      key={i}
                      src={preset}
                      alt="Preset"
                      onClick={() => setNewUrl(preset)}
                      className={`w-14 h-10 rounded-lg object-cover cursor-pointer border-2 transition ${
                        newUrl === preset ? 'border-[#d9a89e] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block micro-label mb-1 text-[#d9a89e]">Private Caption</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Notes only for you and your partner..."
                  className="w-full px-4 py-2 rounded-2xl bg-[#1e130f] border border-[#7a5240]/40 text-xs text-[#f9efe8] font-serif italic focus:outline-none focus:border-[#d9a89e]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#d9a89e] text-[#241612] text-xs font-semibold hover:bg-[#e7c4bd] transition shadow-md cursor-pointer mt-2"
              >
                Seal in Vault
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Secret Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140c09]/85 backdrop-blur-md animate-fade-up">
          <div className="relative max-w-md w-full rounded-[32px] bg-[#2d1b15] border border-[#7a5240]/40 p-6 sm:p-8 shadow-2xl text-[#f9efe8]">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-[#d9a89e] hover:bg-[#3e241c] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="font-serif text-2xl text-[#f9efe8] font-normal mb-1">
              Edit Secret Frame
            </h2>
            <p className="text-xs text-[#d9a89e]/80 font-serif italic mb-4">
              "Update details or swap image."
            </p>

            <form onSubmit={handleEditSecretSubmit} className="space-y-4">
              <div>
                <label className="block micro-label mb-1 text-[#d9a89e]">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-2xl bg-[#1e130f] border border-[#7a5240]/40 text-xs text-[#f9efe8] focus:outline-none focus:border-[#d9a89e]"
                />
              </div>

              <div>
                <label className="block micro-label mb-1 text-[#d9a89e]">Photo</label>
                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={(e) => handleDeviceUpload(e, true)}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#3e241c] hover:bg-[#4a2e24] border border-[#7a5240]/40 text-xs text-[#d9a89e] flex items-center justify-center gap-2 cursor-pointer mb-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose new photo from device</span>
                </button>

                {newUrl && (
                  <div className="aspect-16/9 rounded-xl overflow-hidden border border-[#7a5240]/40 mb-2">
                    <img src={newUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block micro-label mb-1 text-[#d9a89e]">Private Caption</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-2xl bg-[#1e130f] border border-[#7a5240]/40 text-xs text-[#f9efe8] font-serif italic focus:outline-none focus:border-[#d9a89e]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-full border border-[#7a5240]/40 text-xs text-[#d9a89e] hover:bg-[#3e241c] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#d9a89e] text-[#241612] text-xs font-semibold hover:bg-[#e7c4bd] cursor-pointer shadow-md"
                >
                  Update Secret
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140c09]/90 backdrop-blur-md animate-fade-up">
          <div className="relative max-w-sm w-full rounded-[32px] bg-[#2d1b15] border border-rose-500/50 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-[#f9efe8] font-normal">Destroy Secret?</h3>
              <p className="text-xs text-[#d9a89e]/80 mt-1 font-serif italic">
                This item will be permanently wiped from the encrypted sanctuary.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItemId(null)}
                className="flex-1 py-2 rounded-full border border-[#7a5240]/40 text-xs text-[#d9a89e] hover:bg-[#3e241c] cursor-pointer"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(deletingItemId)}
                className="flex-1 py-2 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {renderChangePinModal()}
    </div>
  );
};
