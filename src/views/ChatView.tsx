import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAkra } from '../context/AkraContext';
import { ChatMessage } from '../types';
import {
  Send,
  Image as ImageIcon,
  Mic,
  Check,
  CheckCheck,
  Trash2,
  Reply,
  X,
  Play,
  Pause,
  MapPin,
  Sparkles,
  Heart,
  Smile,
  ArrowLeftRight,
  Maximize2,
  Download,
  Pencil,
  Loader2,
} from 'lucide-react';
import { uploadToSupabaseStorage } from '../lib/storage';

const REACTION_EMOJIS = ['❤️', '🫂', '✨', '💋', '🥺'];

export const ChatView: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    activeUserId,
    switchPartner,
    chatMessages,
    sendChatMessage,
    updateChatMessage,
    deleteChatMessage,
    toggleMessageReaction,
    clearChatMessages,
    markMessagesAsRead,
    isPartnerTyping,
    setMyTyping,
    calculateDistanceKm,
    showToast,
  } = useAkra();

  const [inputVal, setInputVal] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [activeVoicePlayingId, setActiveVoicePlayingId] = useState<string | null>(null);
  const [voicePlaybackProgress, setVoicePlaybackProgress] = useState(0);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [reactionMenuMsgId, setReactionMenuMsgId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const voiceSynthIntervalRef = useRef<any>(null);

  const distanceKm = calculateDistanceKm();

  // Mark messages as read safely without re-render loop
  useEffect(() => {
    const hasUnread = chatMessages.some(
      (m) => m.senderId !== currentUser.id && m.status !== 'read'
    );
    if (hasUnread) {
      markMessagesAsRead();
    }
  }, [chatMessages.length, currentUser.id, markMessagesAsRead]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages.length, isPartnerTyping, scrollToBottom]);

  // Voice recording timer
  useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setVoiceSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setVoiceSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Play gentle melodic chimes when playing voice notes
  const playVoiceAudioChime = useCallback((step: number) => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const notes = [329.63, 392.0, 440.0, 523.25, 659.25];
      const freq = notes[step % notes.length];

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // ignore
    }
  }, []);

  // Simulated Voice Note Playback with audio feedback
  useEffect(() => {
    let interval: any;
    if (activeVoicePlayingId) {
      let step = 0;
      interval = setInterval(() => {
        step++;
        if (step % 2 === 0) {
          playVoiceAudioChime(step);
        }
        setVoicePlaybackProgress((prev) => {
          if (prev >= 100) {
            setActiveVoicePlayingId(null);
            return 0;
          }
          return prev + 10;
        });
      }, 400);
    } else {
      setVoicePlaybackProgress(0);
    }
    return () => clearInterval(interval);
  }, [activeVoicePlayingId, playVoiceAudioChime]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
    setMyTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setMyTyping(false);
    }, 1400);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    sendChatMessage(inputVal.trim(), 'text', undefined, undefined, replyingTo || undefined);
    setInputVal('');
    setReplyingTo(null);
    setMyTyping(false);
  };

  const handleFinishVoiceRecord = () => {
    setIsRecordingVoice(false);
    const duration = Math.max(3, voiceSeconds);
    sendChatMessage(
      `Voice memo (${duration}s)`,
      'voice',
      undefined,
      duration,
      replyingTo || undefined
    );
    setReplyingTo(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      showToast('Sending photo...', 'Uploading image to akra-media bucket.', 'info');
      const uploadRes = await uploadToSupabaseStorage(file, {
        bucket: 'akra-media',
        folder: 'chat',
        filename: `chat-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
        caption: `Chat attachment from ${currentUser.nickname || currentUser.name}`,
        category: 'chat',
      });

      if (uploadRes.url) {
        sendChatMessage('Shared a photo across the distance ❤️', 'image', uploadRes.url);
        showToast('Photo Delivered 📸', 'Stored in akra-media bucket.', 'love');
      }
    } catch (err) {
      console.error('Chat photo upload failed:', err);
      showToast('Upload Failed', 'Could not upload attachment.', 'info');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Quick partner auto-reply simulator to make distance testing delightful
  const handleSimulatePartnerReply = () => {
    const romanticReplies = [
      "I was just thinking about you, my love. Missing you so much today ❤️",
      "Counting down every single hour until I get to hold you again ✨",
      "Looking at our photos right now... you bring so much warmth to my heart 🫂",
      "Sending you a million kisses across the distance! You're my home 💖",
      "Hearing from you always makes my entire day brighter 🥰",
    ];
    const replyText = romanticReplies[Math.floor(Math.random() * romanticReplies.length)];

    setMyTyping(true);
    setTimeout(() => {
      setMyTyping(false);
      sendChatMessage(replyText, 'text');
    }, 1200);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] max-w-4xl mx-auto flex flex-col justify-between p-2 sm:p-6 select-none">
      {/* Lightbox for shared photos */}
      {selectedMediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedMediaUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedMediaUrl}
              alt="Expanded preview"
              className="max-h-[80vh] w-auto rounded-2xl shadow-2xl object-contain border border-white/20"
            />
            <div className="flex items-center gap-3 mt-4">
              <a
                href={selectedMediaUrl}
                download="akra_chat_photo.jpg"
                className="px-4 py-2 rounded-full bg-white/20 text-white hover:bg-white/30 text-xs font-semibold flex items-center gap-1.5 transition backdrop-blur-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save photo</span>
              </a>
              <button
                onClick={() => setSelectedMediaUrl(null)}
                className="px-4 py-2 rounded-full bg-white text-[#3e2723] text-xs font-bold hover:bg-white/90 transition shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-cream max-w-sm w-full p-6 rounded-3xl border border-[#7a5240]/25 shadow-2xl space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#3e2723]">Clear conversation?</h3>
            <p className="text-xs text-[#5b3a2e] leading-relaxed">
              This will remove message history from this screen. Your precious photo memories in the Memories gallery and Vault remain safe.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#5b3a2e] hover:bg-white/60 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearChatMessages();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-rose-700 text-white hover:bg-rose-800 transition shadow-xs"
              >
                Clear Messages
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Glass Frame */}
      <div className="glass-cream rounded-[28px] sm:rounded-[36px] border border-[#7a5240]/20 shadow-xl flex flex-col flex-1 overflow-hidden min-h-[580px] max-h-[82vh]">
        {/* Header: Partner presence on glass & Quick switcher */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#7a5240]/15 bg-[#f9efe8]/75 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={partnerUser.avatar}
                alt={partnerUser.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#7a5240]/25 shadow-xs"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#b06a5e] ring-2 ring-[#f9efe8]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base sm:text-lg text-[#3e2723] font-bold truncate">
                  {partnerUser.nickname || partnerUser.name}
                </h2>
                <span className="micro-label text-[8px] bg-[#ecd0c8]/60 px-2 py-0.5 rounded-full border border-[#7a5240]/15 text-[#5b3a2e]">
                  {partnerUser.city}
                </span>
              </div>
              <p className="text-[11px] text-[#7a5240] italic truncate">
                "{partnerUser.statusMessage || 'Always with you'}"
              </p>
            </div>
          </div>

          {/* Quick controls: Switch perspective & distance badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={switchPartner}
              title={`Switch chatting perspective to ${partnerUser.nickname || partnerUser.name}`}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/80 hover:bg-white text-[#5b3a2e] border border-[#7a5240]/20 flex items-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
            >
              <ArrowLeftRight className="w-3 h-3 text-[#b06a5e]" />
              <span className="hidden sm:inline">Talk as {partnerUser.nickname || partnerUser.name}</span>
              <span className="sm:hidden">Switch</span>
            </button>

            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#7a5240] px-3 py-1 rounded-full bg-[#ecd0c8]/40 border border-[#7a5240]/12">
              <MapPin className="w-3 h-3 text-[#b06a5e]" />
              <span>{distanceKm} km apart</span>
            </div>

            <button
              onClick={() => setShowClearConfirm(true)}
              title="Clear chat history"
              className="p-1.5 rounded-full text-[#7a5240] hover:text-rose-700 hover:bg-white/60 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Conversation Panel */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-transparent via-[#f9efe8]/20 to-[#ecd0c8]/20">
          <div className="text-center my-1">
            <span className="micro-label text-[9px] px-3 py-1 rounded-full bg-[#f9efe8]/90 border border-[#7a5240]/15 text-[#7a5240] shadow-xs">
              Our intimate space • Puducherry & Bangalore
            </span>
          </div>

          {chatMessages.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm font-serif italic text-[#7a5240]">
                No messages yet. Send a whisper across the distance...
              </p>
              <button
                onClick={handleSimulatePartnerReply}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-[#5b3a2e] text-[#f9efe8] hover:bg-[#4a2e24] shadow-md transition"
              >
                Start with a sweet note
              </button>
            </div>
          )}

          {chatMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col group transition-all duration-300 relative ${
                  isMe ? 'items-end' : 'items-start'
                }`}
              >
                {/* Reply Quote Header */}
                {msg.replyTo && (
                  <div
                    className={`text-[11px] text-[#7a5240] bg-[#f9efe8]/95 px-3 py-1 rounded-t-xl max-w-[80%] border-l-2 border-[#b06a5e] mb-0.5 truncate border border-b-0 border-[#7a5240]/15 shadow-xs ${
                      isMe ? 'mr-1' : 'ml-1'
                    }`}
                  >
                    <span className="font-semibold text-[#5b3a2e]">{msg.replyTo.senderName}:</span>{' '}
                    <span className="italic">{msg.replyTo.text}</span>
                  </div>
                )}

                <div className="flex items-end gap-1.5 max-w-[88%] sm:max-w-[75%] relative">
                  {/* Action buttons (Reply & React) */}
                  {!isMe && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 text-[#7a5240]/60 hover:text-[#5b3a2e] transition rounded-full hover:bg-[#ecd0c8]/50 cursor-pointer"
                        title="Reply to message"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setReactionMenuMsgId(reactionMenuMsgId === msg.id ? null : msg.id)
                        }
                        className="p-1 text-[#7a5240]/60 hover:text-[#5b3a2e] transition rounded-full hover:bg-[#ecd0c8]/50 cursor-pointer"
                        title="React"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Reaction selector popover */}
                  {reactionMenuMsgId === msg.id && (
                    <div className="absolute -top-9 left-0 z-30 flex items-center gap-1 p-1 bg-white rounded-full shadow-lg border border-[#7a5240]/20 animate-fade-up">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            toggleMessageReaction(msg.id, emoji);
                            setReactionMenuMsgId(null);
                          }}
                          className="w-6 h-6 flex items-center justify-center hover:scale-125 transition text-sm cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-[22px] px-4 py-3 shadow-xs relative border transition-all duration-200 ${
                      isMe
                        ? 'bg-[#5b3a2e] text-[#f9efe8] border-[#7a5240]/40 rounded-br-xs'
                        : 'glass-cream text-[#5b3a2e] border-[#7a5240]/20 rounded-bl-xs'
                    }`}
                  >
                    {/* Sender Name label */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isMe ? 'text-[#d9a89e]' : 'text-[#b06a5e]'
                        }`}
                      >
                        {msg.senderName}
                      </span>
                    </div>

                    {/* Text Message */}
                    {msg.type === 'text' && (
                      editingMsgId === msg.id ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={editingMsgText}
                            onChange={(e) => setEditingMsgText(e.target.value)}
                            className="w-full text-xs sm:text-[13px] p-2 rounded-xl bg-[#2e1d17]/40 text-[#f9efe8] border border-[#d9a89e]/40 focus:outline-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setEditingMsgId(null)}
                              className="px-2 py-0.5 rounded-full border border-white/20 text-white/70 hover:bg-white/10"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingMsgText.trim()) {
                                  updateChatMessage(msg.id, editingMsgText.trim());
                                  setEditingMsgId(null);
                                }
                              }}
                              className="px-2.5 py-0.5 rounded-full bg-[#d9a89e] text-[#2e1d17] font-semibold hover:bg-white"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap select-text font-sans">
                          {msg.text}
                        </p>
                      )
                    )}

                    {/* Image Message with In-app preview */}
                    {msg.type === 'image' && (
                      <div className="space-y-1.5">
                        <div
                          className="relative rounded-xl overflow-hidden cursor-pointer group/img"
                          onClick={() => setSelectedMediaUrl(msg.mediaUrl || null)}
                        >
                          <img
                            src={msg.mediaUrl}
                            alt="Shared memory"
                            className="rounded-xl max-h-60 w-full object-cover hover:scale-102 transition duration-300 border border-[#7a5240]/15"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center">
                            <span className="bg-black/60 text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-xs">
                              <Maximize2 className="w-3 h-3" />
                              <span>Enlarge</span>
                            </span>
                          </div>
                        </div>
                        {msg.text && (
                          <p className={`text-xs mt-1 ${isMe ? 'text-[#f9efe8]/80' : 'text-[#7a5240]'}`}>
                            {msg.text}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Voice Note Message with Audio Feedback */}
                    {msg.type === 'voice' && (
                      <div className="flex items-center gap-3 py-1">
                        <button
                          onClick={() => {
                            if (activeVoicePlayingId === msg.id) {
                              setActiveVoicePlayingId(null);
                            } else {
                              setActiveVoicePlayingId(msg.id);
                            }
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer active:scale-95 shadow-xs ${
                            isMe
                              ? 'bg-[#f9efe8] text-[#5b3a2e]'
                              : 'bg-[#5b3a2e] text-[#f9efe8]'
                          }`}
                        >
                          {activeVoicePlayingId === msg.id ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1 min-w-[120px]">
                          <div className="flex items-center gap-1 h-3.5">
                            {[35, 70, 45, 90, 60, 85, 40, 75, 50, 95, 65, 30].map((height, i) => (
                              <span
                                key={i}
                                className={`w-1 rounded-full transition-all ${
                                  isMe
                                    ? activeVoicePlayingId === msg.id && i * 8 <= voicePlaybackProgress
                                      ? 'bg-[#f9efe8]'
                                      : 'bg-[#f9efe8]/40'
                                    : activeVoicePlayingId === msg.id && i * 8 <= voicePlaybackProgress
                                    ? 'bg-[#b06a5e]'
                                    : 'bg-[#7a5240]/30'
                                }`}
                                style={{ height: `${height}%` }}
                              />
                            ))}
                          </div>
                          <span
                            className={`text-[9px] mt-0.5 block font-mono ${
                              isMe ? 'text-[#f9efe8]/70' : 'text-[#7a5240]/80'
                            }`}
                          >
                            {activeVoicePlayingId === msg.id
                              ? 'Playing warm whisper...'
                              : `${msg.voiceDuration || 5}s audio note`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Reaction Badge */}
                    {msg.reaction && (
                      <div
                        onClick={() => toggleMessageReaction(msg.id, msg.reaction!)}
                        className="absolute -bottom-2.5 right-3 bg-white px-1.5 py-0.5 rounded-full shadow-md border border-[#7a5240]/15 text-xs cursor-pointer hover:scale-110 transition"
                      >
                        {msg.reaction}
                      </div>
                    )}

                    {/* Timestamp & Status */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[9px] font-mono ${
                        isMe ? 'text-[#f9efe8]/60' : 'text-[#7a5240]/70'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {isMe && (
                        <span>
                          {msg.status === 'read' ? (
                            <CheckCheck className="w-3 h-3 text-[#d9a89e]" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3 h-3 text-[#f9efe8]/50" />
                          ) : (
                            <Check className="w-3 h-3 text-[#f9efe8]/50" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action options for my messages */}
                  {isMe && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      {msg.type === 'text' && (
                        <button
                          onClick={() => {
                            setEditingMsgId(msg.id);
                            setEditingMsgText(msg.text);
                          }}
                          className="p-1 text-[#7a5240]/50 hover:text-[#5b3a2e] transition rounded-full hover:bg-[#ecd0c8]/50 cursor-pointer"
                          title="Edit message"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteChatMessage(msg.id)}
                        className="p-1 text-[#7a5240]/50 hover:text-rose-600 transition rounded-full hover:bg-rose-50 cursor-pointer"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Partner Typing Dot Indicator */}
          {isPartnerTyping && (
            <div className="flex items-center gap-2 text-xs text-[#7a5240] italic font-serif px-2 py-1 animate-fade-up">
              <span className="w-2 h-2 rounded-full bg-[#b06a5e] animate-ping" />
              <span>{partnerUser.nickname || partnerUser.name} is writing a note...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Replying banner */}
        {replyingTo && (
          <div className="px-4 py-2 bg-[#f9efe8] border-t border-[#7a5240]/15 flex items-center justify-between">
            <div className="text-xs text-[#5b3a2e] truncate">
              <span className="font-semibold">Replying to {replyingTo.senderName}:</span>{' '}
              <span className="italic">{replyingTo.text}</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-[#7a5240] hover:bg-[#ecd0c8]/50 rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Voice Recording Drawer */}
        {isRecordingVoice && (
          <div className="px-4 sm:px-6 py-3 bg-[#ecd0c8]/70 border-t border-[#7a5240]/20 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#5b3a2e]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b06a5e] animate-ping" />
              <span>Recording whisper... {voiceSeconds}s</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsRecordingVoice(false)}
                className="text-xs text-[#7a5240] hover:underline cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinishVoiceRecord}
                className="px-4 py-1.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] text-xs font-semibold shadow-xs hover:bg-[#4a2e24] cursor-pointer"
              >
                Send Voice Note
              </button>
            </div>
          </div>
        )}

        {/* Composer: Input bar with image upload, voice notes, enter-to-send */}
        <form
          onSubmit={handleSendMessage}
          className="p-2.5 sm:p-4 bg-[#f9efe8]/90 border-t border-[#7a5240]/15 flex items-center gap-1.5 sm:gap-2"
        >
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <button
            type="button"
            disabled={isUploadingPhoto}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-full text-[#7a5240] hover:bg-[#ecd0c8]/50 hover:text-[#5b3a2e] transition cursor-pointer disabled:opacity-50"
            title="Attach a photo"
          >
            {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin text-[#b06a5e]" /> : <ImageIcon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsRecordingVoice(true)}
            className="p-2 sm:p-2.5 rounded-full text-[#7a5240] hover:bg-[#ecd0c8]/50 hover:text-[#5b3a2e] transition cursor-pointer"
            title="Record a voice note"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              id="chat-input"
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Write a note to ${partnerUser.nickname || partnerUser.name}...`}
              className="w-full px-4 py-2.5 rounded-full glass-cream border border-[#7a5240]/20 text-xs sm:text-sm text-[#5b3a2e] placeholder-[#7a5240]/50 focus:outline-none focus:border-[#5b3a2e] focus:ring-1 focus:ring-[#5b3a2e] transition"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            id="chat-send-btn"
            disabled={!inputVal.trim()}
            className={`p-2 sm:p-2.5 rounded-full transition shadow-xs cursor-pointer ${
              inputVal.trim()
                ? 'bg-[#5b3a2e] text-[#f9efe8] hover:bg-[#4a2e24] active:scale-95'
                : 'bg-[#ecd0c8]/50 text-[#7a5240]/40 cursor-not-allowed'
            }`}
            title="Send note (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
