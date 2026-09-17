import React, { useState, useRef } from 'react';
import { useAkra } from '../context/AkraContext';
import { PWAInstallButton } from '../components/PWAInstallButton';
import {
  Settings,
  User,
  Heart,
  Bell,
  Lock,
  Palette,
  Download,
  Trash2,
  KeyRound,
  Shield,
  Smartphone,
  Check,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Type,
  Loader2,
  Database,
  Crop,
} from 'lucide-react';
import { uploadToSupabaseStorage } from '../lib/storage';
import { SupabaseSetupModal } from '../components/SupabaseSetupModal';
import { AvatarCropperModal } from '../components/AvatarCropperModal';
import { FontChoice, FontSizeChoice } from '../types';

export const SettingsView: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    relationship,
    updateRelationship,
    updateCurrentUserProfile,
    changeUserPassword,
    changeVaultPin,
    showToast,
    chatMessages,
    memories,
    letters,
    futureItems,
    milestones,
    updatePortalDesign,
    resetPortalDesigns,
    setActiveTab,
    logout,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
  } = useAkra();

  // Profile Edit State & DP
  const [nickname, setNickname] = useState(currentUser.nickname);
  const [anniversary, setAnniversary] = useState(relationship.anniversaryDate);
  const [nextMeeting, setNextMeeting] = useState(relationship.nextMeetingDate);
  const [nextMeetingTitle, setNextMeetingTitle] = useState(relationship.nextMeetingTitle);
  const [nextMeetingLocation, setNextMeetingLocation] = useState(relationship.nextMeetingLocation);

  // DP (Display Picture) Upload State
  const [dpPreview, setDpPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Private Password Update State (first asks for current password, then new & confirm)
  const [oldPassInput, setOldPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState(false);
  const [passChangeError, setPassChangeError] = useState('');

  // Vault PIN Reset State (first asks for current pin, then new & confirm, NO hints)
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [pinChangeError, setPinChangeError] = useState('');

  // Notification Toggles
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPhotos, setNotifPhotos] = useState(true);
  const [notifLetters, setNotifLetters] = useState(true);
  const [notifMovie, setNotifMovie] = useState(true);

  // Sound effects toggle
  const [soundEffects, setSoundEffects] = useState(true);
  const [isUploadingDp, setIsUploadingDp] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [isSavingCropped, setIsSavingCropped] = useState(false);

  // Handle DP selection from file or camera - opens crop/adjust modal
  const handleDpSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file for your DP.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCroppingImage(objectUrl);
    e.target.value = '';
  };

  // Crop & save avatar directly to Supabase storage + user profile
  const handleSaveCroppedAvatar = async (blob: Blob, dataUrl: string) => {
    try {
      setIsSavingCropped(true);
      showToast('Saving Avatar...', 'Uploading cropped display picture...', 'info');

      const filename = `avatar-${currentUser.id}-${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });

      let finalUrl = dataUrl;
      try {
        const uploadRes = await uploadToSupabaseStorage(file, {
          bucket: 'akra-media',
          folder: 'avatars',
          filename,
          caption: `${currentUser.name} profile photo`,
          category: 'avatars',
        });
        if (uploadRes.url) {
          finalUrl = uploadRes.url;
        }
      } catch (uploadErr) {
        console.warn('Supabase storage upload error, falling back to data URL:', uploadErr);
      }

      await updateCurrentUserProfile({ avatar: finalUrl });
      setDpPreview(finalUrl);
      setCroppingImage(null);
      showToast('DP Saved ❤️', 'Your cropped display picture has been updated!', 'love');
    } catch (err) {
      console.error('Avatar save failed:', err);
      showToast('Save Failed', 'Could not save display picture.', 'info');
    } finally {
      setIsSavingCropped(false);
    }
  };

  const handleSaveDp = async () => {
    if (!dpPreview) return;
    await updateCurrentUserProfile({ avatar: dpPreview });
    setDpPreview(null);
    showToast('DP Confirmed ❤️', 'Your new profile picture is active!', 'love');
  };

  const handleCancelDp = () => {
    setDpPreview(null);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({ nickname });
    updateRelationship({
      anniversaryDate: anniversary,
      nextMeetingDate: nextMeeting,
      nextMeetingTitle,
      nextMeetingLocation,
    });
    showToast('Profile Updated', 'Profile and relationship dates updated successfully ❤️', 'info');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError('');
    setPassChangeSuccess(false);

    if (!oldPassInput) {
      setPassChangeError('Please enter your current password.');
      return;
    }
    if (!newPassInput || newPassInput.length < 6) {
      setPassChangeError('New password must be at least 6 characters.');
      return;
    }
    if (newPassInput !== confirmPassInput) {
      setPassChangeError('New passwords do not match. Please re-enter.');
      return;
    }

    const success = await changeUserPassword(currentUser.id, oldPassInput, newPassInput);
    if (!success) {
      setPassChangeError('Failed to update password. Please check your credentials.');
      return;
    }

    setPassChangeSuccess(true);
    setOldPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
  };

  const handlePinReset = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError('');
    setPinChangeSuccess(false);

    if (!oldPin) {
      setPinChangeError('Please enter your current 4-digit PIN.');
      return;
    }
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setPinChangeError('New PIN must be exactly 4 numeric digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeError('New PIN and confirmation PIN do not match.');
      return;
    }

    const result = changeVaultPin(oldPin, newPin);
    if (!result.success) {
      setPinChangeError(result.error || 'Current vault PIN is incorrect. Access denied.');
      return;
    }

    setPinChangeSuccess(true);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const handleExportData = () => {
    const exportData = {
      spaceId: relationship.id,
      exportedAt: new Date().toISOString(),
      members: [currentUser.name, partnerUser.name],
      anniversary: relationship.anniversaryDate,
      messagesCount: chatMessages.length,
      memoriesCount: memories.length,
      lettersCount: letters.length,
      futureDreamsCount: futureItems.length,
      milestonesCount: milestones.length,
      chatMessages,
      memories,
      letters,
      futureItems,
      milestones,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AKRA-backup-${currentUser.name}-${partnerUser.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export Complete', 'Full AKRA relationship archive exported successfully.', 'info');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-[#F0C9D8]">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#5D4037]" />
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#3E2723]">SETTINGS</h1>
        </div>
        <p className="text-xs text-[#795548] font-serif italic">
          "Configure your private sanctuary, individual security, and memories."
        </p>
      </div>

      {/* Relationship Space Card */}
      <div className="bg-[#FFF0F5] rounded-[32px] p-6 sm:p-8 border border-[#F0C9D8] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#5D4037] text-white flex items-center justify-center font-serif font-bold text-lg shadow-2xs">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base text-[#3E2723]">AKRA Private Space</span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#FCEBF2] border border-[#F0C9D8] text-[#5D4037]">
                ID: {relationship.id}
              </span>
            </div>
            <p className="text-xs text-[#795548] mt-0.5">
              Exclusive 2-person cryptographic pairing • {currentUser.name} ({currentUser.nickname}) ♡ {partnerUser.name} ({partnerUser.nickname})
            </p>
          </div>
        </div>

        <PWAInstallButton />
      </div>

      {/* Individual Security & Private Password Card */}
      <div className="bg-[#FFF0F5] rounded-[32px] p-6 sm:p-8 border border-[#F0C9D8] shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0C9D8]">
          <ShieldCheck className="w-4 h-4 text-[#5D4037]" />
          <h2 className="font-serif font-bold text-base text-[#3E2723]">
            {currentUser.name}'s Private Login Password
          </h2>
        </div>

        <p className="text-xs text-[#795548] leading-relaxed">
          To change your personal password, verify your current password first, then set and confirm your new password:
        </p>

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548] mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={oldPassInput}
                onChange={(e) => setOldPassInput(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#F0C9D8] bg-[#FFF8FA] text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#5D4037]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548] mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                placeholder="Min 4 characters"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#F0C9D8] bg-[#FFF8FA] text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#5D4037]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassInput}
                onChange={(e) => setConfirmPassInput(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#F0C9D8] bg-[#FFF8FA] text-xs text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#5D4037]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-[#5D4037] text-white text-xs font-semibold hover:bg-[#4E342E] transition shadow-xs cursor-pointer"
            >
              Update Password
            </button>
          </div>
        </form>

        {passChangeError && <p className="text-xs text-rose-700 bg-rose-100/70 p-2.5 rounded-xl border border-rose-300 font-medium">{passChangeError}</p>}
        {passChangeSuccess && <p className="text-xs text-emerald-800 bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-300 font-medium">Your password was successfully updated!</p>}
      </div>

      {/* Profile & Relationship Dates (Including Custom DP) */}
      <div className="bg-[#FFF0F5] rounded-[32px] p-6 sm:p-8 border border-[#F0C9D8] shadow-2xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0C9D8]">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#5D4037]" />
            <h2 className="font-serif font-bold text-base text-[#3E2723]">Profile & Display Picture (DP)</h2>
          </div>
          <span className="text-[11px] text-[#795548] font-medium">Keep your own DP</span>
        </div>

        {/* Display Picture (DP) Management */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF8FA] border border-[#F0C9D8] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative group">
              <img
                src={dpPreview || currentUser.avatar}
                alt={currentUser.name}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-[#5D4037] shadow-md transition"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Change DP"
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#5D4037] text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 flex-1">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#3E2723]">
                Your Display Picture (DP)
              </h3>
              <p className="text-xs text-[#795548] leading-relaxed">
                Personalize your profile across AKRA. Take a fresh live selfie or pick any photo from your device storage.
              </p>

              {/* Action Buttons for DP */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleDpSelect}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="user"
                  onChange={handleDpSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isUploadingDp}
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-full bg-[#FCEBF2] border border-[#F0C9D8] text-[11px] font-semibold text-[#5D4037] hover:bg-[#EFE5E0] transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  {isUploadingDp ? <Loader2 className="w-3 h-3 animate-spin text-[#5D4037]" /> : <Camera className="w-3 h-3" />}
                  <span>{isUploadingDp ? 'Uploading to akra-media...' : 'Snap with Camera'}</span>
                </button>

                <button
                  type="button"
                  disabled={isUploadingDp}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-full bg-[#FCEBF2] border border-[#F0C9D8] text-[11px] font-semibold text-[#5D4037] hover:bg-[#EFE5E0] transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  {isUploadingDp ? <Loader2 className="w-3 h-3 animate-spin text-[#5D4037]" /> : <Upload className="w-3 h-3" />}
                  <span>{isUploadingDp ? 'Uploading...' : 'Choose Photo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCroppingImage(dpPreview || currentUser.avatar)}
                  className="px-3.5 py-1.5 rounded-full bg-[#FCEBF2] border border-[#F0C9D8] text-[11px] font-semibold text-[#5D4037] hover:bg-[#EFE5E0] transition flex items-center gap-1.5 shadow-2xs"
                  title="Crop or reposition current DP"
                >
                  <Crop className="w-3 h-3" />
                  <span>Crop / Adjust</span>
                </button>

                {dpPreview && (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveDp}
                      className="px-4 py-1.5 rounded-full bg-[#5D4037] text-white text-[11px] font-semibold hover:bg-[#4E342E] transition flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Save New DP</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelDp}
                      className="px-3 py-1.5 rounded-full bg-[#FCEBF2] text-[#795548] text-[11px] font-medium hover:bg-rose-100 transition"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548] mb-1">
                Your Sweet Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. mama or akshu"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#F0C9D8] text-xs text-[#3E2723] bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-[#5D4037]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548] mb-1">
                Official Anniversary Date
              </label>
              <input
                type="date"
                value={anniversary}
                onChange={(e) => setAnniversary(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#F0C9D8] text-xs text-[#3E2723] bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-[#5D4037]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#F0C9D8]">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#795548] block mb-2">Next Reunion Countdown</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#795548] mb-1">Target Date</label>
                <input
                  type="date"
                  value={nextMeeting}
                  onChange={(e) => setNextMeeting(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#F0C9D8] text-xs text-[#3E2723] bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-[#5D4037]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#795548] mb-1">Trip Name</label>
                <input
                  type="text"
                  value={nextMeetingTitle}
                  onChange={(e) => setNextMeetingTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#F0C9D8] text-xs text-[#3E2723] bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-[#5D4037]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#795548] mb-1">City / Airport</label>
                <input
                  type="text"
                  value={nextMeetingLocation}
                  onChange={(e) => setNextMeetingLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#F0C9D8] text-xs text-[#3E2723] bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-[#5D4037]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-[#5D4037] text-white text-xs font-semibold hover:bg-[#4E342E] transition shadow-xs cursor-pointer"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>

      {/* Secret Vault Security PIN (NO HINTS) */}
      <div className="bg-[#FFF0F5] rounded-[32px] p-6 sm:p-8 border border-[#F0C9D8] shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0C9D8]">
          <KeyRound className="w-4 h-4 text-[#5D4037]" />
          <h2 className="font-serif font-bold text-base text-[#3E2723]">Secret Vault PIN Code</h2>
        </div>

        <p className="text-xs text-[#795548] leading-relaxed">
          To update your master vault PIN, enter your current 4-digit PIN first for security verification, then set and confirm your new PIN:
        </p>

        <form onSubmit={handlePinReset} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548] mb-1">Current PIN</label>
              <input
                type="password"
                maxLength={4}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                placeholder="Current 4-digits"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#F0C9D8] bg-[#FFF8FA] text-center font-mono text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#5D4037]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548] mb-1">New 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="New 4-digits"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#F0C9D8] bg-[#FFF8FA] text-center font-mono text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#5D4037]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548] mb-1">Confirm New PIN</label>
              <input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Re-enter 4-digits"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#F0C9D8] bg-[#FFF8FA] text-center font-mono text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#5D4037]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-[#5D4037] text-white text-xs font-semibold hover:bg-[#4E342E] transition shadow-xs cursor-pointer"
            >
              Update Vault PIN
            </button>
          </div>
        </form>

        {pinChangeError && <p className="text-xs text-rose-700 bg-rose-100/70 p-2.5 rounded-xl border border-rose-300 font-medium">{pinChangeError}</p>}
        {pinChangeSuccess && <p className="text-xs text-emerald-800 bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-300 font-medium">Master vault PIN updated successfully!</p>}
      </div>

      {/* Notifications & Sounds */}
      <div className="bg-[#FFF0F5] rounded-[32px] p-6 sm:p-8 border border-[#F0C9D8] shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0C9D8]">
          <Bell className="w-4 h-4 text-[#5D4037]" />
          <h2 className="font-serif font-bold text-base text-[#3E2723]">Notifications & Audio</h2>
        </div>

        <div className="space-y-3 text-xs">
          {[
            { label: 'Instant message alerts', val: notifMessages, set: setNotifMessages },
            { label: 'Photobooth direct snapshot alerts', val: notifPhotos, set: setNotifPhotos },
            { label: 'New sealed love letter notifications', val: notifLetters, set: setNotifLetters },
            { label: 'Movie night sync room invitations', val: notifMovie, set: setNotifMovie },
            { label: 'Romantic soft chime sounds on tap', val: soundEffects, set: setSoundEffects },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-1.5">
              <span className="text-[#3E2723] font-medium">{item.label}</span>
              <button
                type="button"
                onClick={() => item.set(!item.val)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  item.val ? 'bg-[#5D4037]' : 'bg-[#F0C9D8]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white block transition-transform shadow-xs ${
                    item.val ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Typography & Font Visibility */}
      <div className="bg-[#FFF0F5] rounded-[32px] p-6 sm:p-8 border border-[#F0C9D8] shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0C9D8]">
          <Type className="w-4 h-4 text-[#5D4037]" />
          <h2 className="font-serif font-bold text-base text-[#3E2723]">Typography & Text Visibility</h2>
        </div>

        <p className="text-xs text-[#795548] leading-relaxed">
          Customize font family and text sizing across all views for crystal clear readability:
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548] mb-2">
              Global Font Style
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: 'playfair' as FontChoice, name: 'Playfair Display', desc: 'Bold, high-visibility romantic serif' },
                { id: 'jakarta' as FontChoice, name: 'Plus Jakarta Sans', desc: 'Crisp, modern, high-contrast sans-serif' },
                { id: 'lora' as FontChoice, name: 'Lora', desc: 'Warm literary serif with balanced ink-traps' },
                { id: 'cormorant' as FontChoice, name: 'Cormorant Garamond', desc: 'Classic editorial serif' },
              ].map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => {
                    setFontFamily(font.id);
                    showToast('Font Applied', `Theme font switched to ${font.name}`, 'info');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    fontFamily === font.id
                      ? 'bg-[#5D4037] text-white border-[#5D4037] shadow-sm'
                      : 'bg-[#FFF8FA] text-[#3E2723] border-[#F0C9D8] hover:bg-white'
                  }`}
                >
                  <div className="font-bold text-sm">{font.name}</div>
                  <div className={`text-xs mt-0.5 ${fontFamily === font.id ? 'text-[#F0C9D8]' : 'text-[#795548]'}`}>
                    {font.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#795548] mb-2">
              Font Scale & Visibility
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'normal' as FontSizeChoice, label: 'Standard (16px)' },
                { id: 'large' as FontSizeChoice, label: 'Visible (17.5px - Recommended)' },
                { id: 'extra-large' as FontSizeChoice, label: 'Maximum Clarity (19px)' },
              ].map((scale) => (
                <button
                  key={scale.id}
                  type="button"
                  onClick={() => {
                    setFontSize(scale.id);
                    showToast('Text Size Updated', `Font scale set to ${scale.label}`, 'info');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                    fontSize === scale.id
                      ? 'bg-[#5D4037] text-white shadow-xs'
                      : 'bg-[#FFF8FA] text-[#5D4037] border border-[#F0C9D8] hover:bg-white'
                  }`}
                >
                  {scale.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Portals Design & Space Aesthetics */}
      <div className="bg-[#FFF0F5] rounded-[32px] p-6 sm:p-8 border border-[#F0C9D8] shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0C9D8]">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#5D4037]" />
            <h2 className="font-serif font-bold text-base text-[#3E2723]">Space Portals Design & Themes</h2>
          </div>
          <button
            type="button"
            onClick={resetPortalDesigns}
            className="text-[11px] text-[#795548] hover:text-[#3E2723] hover:underline"
          >
            Reset All to Default
          </button>
        </div>

        <p className="text-xs text-[#795548] leading-relaxed">
          Customize each portal's title, romantic subtitle, color theme, and custom badge tag to create your own aesthetic world.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="px-5 py-2.5 rounded-full bg-[#5D4037] text-white text-xs font-semibold hover:bg-[#4E342E] transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customize Portals on Home ✨</span>
          </button>
        </div>
      </div>

      {/* Supabase Database & Storage Assistant */}
      <div className="bg-[#FFF0F5] rounded-[32px] p-6 sm:p-8 border border-[#F0C9D8] shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0C9D8]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#5D4037]" />
            <h2 className="font-serif font-bold text-base text-[#3E2723]">Supabase Database & Storage Setup</h2>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#EFE5E0] text-[#5D4037] font-semibold">
            Connected: pbenavjftzphpymvkktj
          </span>
        </div>

        <p className="text-xs text-[#795548] leading-relaxed">
          Need to initialize or verify missing database tables (<code>users</code>, <code>vault_items</code>, <code>letters</code>, <code>memories</code>, <code>messages</code>, <code>timeline_events</code>, <code>media</code>) or storage buckets (<code>akra-vault</code>, <code>akra-photobooth</code>, <code>akra-media</code>)? Open our step-by-step checklist and copy-paste ready SQL scripts.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowSupabaseModal(true)}
            className="px-5 py-2.5 rounded-full bg-[#5D4037] text-white text-xs font-semibold hover:bg-[#4E342E] transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Open Database Initialization & SQL Helper</span>
          </button>
        </div>
      </div>

      {/* Archive Export & Account Space */}
      <div className="bg-[#FFF0F5] rounded-[32px] p-6 sm:p-8 border border-[#F0C9D8] shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0C9D8]">
          <Download className="w-4 h-4 text-[#5D4037]" />
          <h2 className="font-serif font-bold text-base text-[#3E2723]">Export Archive & Space Data</h2>
        </div>

        <p className="text-xs text-[#795548] leading-relaxed">
          Download a complete, offline JSON archive of all your private chats, memories, photo references, love letters, and bucket lists.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportData}
            id="export-archive-btn"
            className="px-5 py-2.5 rounded-full bg-[#FCEBF2] border border-[#F0C9D8] text-xs font-semibold text-[#3E2723] hover:bg-[#EFE5E0] transition flex items-center gap-2 shadow-2xs"
          >
            <Download className="w-4 h-4 text-[#5D4037]" />
            <span>Export AKRA Archive</span>
          </button>

          <button
            onClick={logout}
            className="px-5 py-2.5 rounded-full bg-[#FCEBF2] border border-[#F0C9D8] text-xs font-semibold text-[#5D4037] hover:bg-[#EFE5E0] hover:text-[#3E2723] transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out of Session</span>
          </button>
        </div>
      </div>

      {/* Supabase Setup Modal */}
      <SupabaseSetupModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
      />

      {/* Avatar Crop & Adjust Modal */}
      {croppingImage && (
        <AvatarCropperModal
          imageSrc={croppingImage}
          isSaving={isSavingCropped}
          onCancel={() => setCroppingImage(null)}
          onSave={handleSaveCroppedAvatar}
        />
      )}
    </div>
  );
};
