import React, { useState, useRef, useEffect } from 'react';
import { useAkra } from '../context/AkraContext';
import {
  Film,
  Play,
  Pause,
  Clock,
  Sparkles,
  Send,
  Plus,
  Maximize2,
  Volume2,
  VolumeX,
  Upload,
  Link as LinkIcon,
  Video,
  FileVideo,
  RotateCcw,
} from 'lucide-react';

export const MovieNightView: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    movies,
    watchRoom,
    syncMovieState,
    movieChat,
    sendMovieChatMessage,
    addCustomMovie,
    loadMovieByUrl,
    loadMovieByFile,
    showToast,
  } = useAkra();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInputUrl, setLinkInputUrl] = useState('');
  const [linkInputTitle, setLinkInputTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const cinemaContainerRef = useRef<HTMLDivElement>(null);

  const currentMovie = movies.find((m) => m.id === watchRoom.currentMovieId) || movies[0];
  const isPlaying = watchRoom.isPlaying;

  // Check if current movie is a YouTube link
  const getYouTubeId = (url?: string) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i
    );
    return match ? match[1] : null;
  };

  const youtubeId = getYouTubeId(currentMovie?.videoUrl);

  // Sync video element with watchRoom state
  useEffect(() => {
    if (!videoPlayerRef.current) return;
    if (isPlaying) {
      videoPlayerRef.current.play().catch(() => {});
    } else {
      videoPlayerRef.current.pause();
    }
  }, [isPlaying, currentMovie?.id]);

  // Handle local video file from user device storage
  const handleDeviceVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    loadMovieByFile(file);
    syncMovieState('play', 0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle web video link (MP4, WebM, Stream, or YouTube)
  const handleLoadLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInputUrl.trim()) return;

    loadMovieByUrl(linkInputUrl.trim(), linkInputTitle.trim() || undefined);
    syncMovieState('play', 0);
    setLinkInputUrl('');
    setLinkInputTitle('');
    setShowLinkModal(false);
  };

  // Countdown for "Start Together"
  const handleTogglePlay = () => {
    if (isPlaying) {
      syncMovieState('pause');
      return;
    }

    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          syncMovieState('play');
          showToast('Film Rolling 🎬', 'Streaming in sync across Puducherry and Bangalore.', 'movie');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendWhisper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMovieChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handleSelectMovie = (id: string) => {
    syncMovieState('changeMovie', 0, id);
  };

  const toggleFullscreen = () => {
    if (!cinemaContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      cinemaContainerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const isLocalDeviceFile = currentMovie?.genre?.includes('Local') || currentMovie?.videoUrl?.startsWith('blob:');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10 select-none animate-fade-up">
      {/* Hidden File Input for Device Video Storage */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDeviceVideoUpload}
        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,video/*"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#7a5240]/15">
        <div>
          <span className="micro-label">Private Cinema</span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#5b3a2e] font-normal tracking-tight">
            Movie <span className="font-serif italic">Night</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#7a5240] font-serif italic mt-1">
            "Watch a video from this device or stream from any link across Puducherry and Bangalore."
          </p>
        </div>

        {/* First-class buttons to use a Link or Device Video */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            id="movie-upload-device-btn"
            className="px-4 py-2 rounded-full bg-[#5b3a2e] text-[#f9efe8] text-xs font-semibold hover:bg-[#4a2e24] transition flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            title="Select a video file stored on your phone or computer"
          >
            <Upload className="w-3.5 h-3.5 text-[#ecd0c8]" />
            <span>Video from Device</span>
          </button>

          <button
            onClick={() => setShowLinkModal(true)}
            id="movie-use-link-btn"
            className="px-4 py-2 rounded-full glass-cream border border-[#7a5240]/25 text-xs text-[#5b3a2e] hover:bg-[#ffffff] transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Paste any video link or YouTube URL"
          >
            <LinkIcon className="w-3.5 h-3.5 text-[#5b3a2e]" />
            <span>Use Video Link</span>
          </button>
        </div>
      </div>

      {/* Main Cinema Theater Stage */}
      <div className="relative">
        {/* Ambient Room-Light Glow Backing */}
        <div
          className={`absolute -inset-4 rounded-[48px] filter blur-3xl pointer-events-none transition-all duration-1000 ${
            isPlaying ? 'bg-[#e7c4bd]/75 opacity-90 scale-102' : 'bg-[#d9a89e]/30 opacity-50'
          }`}
        />

        <div
          ref={cinemaContainerRef}
          className="relative glass-cream-elevated rounded-[40px] border border-[#7a5240]/25 overflow-hidden shadow-2xl p-5 sm:p-8"
        >
          {/* Top Cinema Bar with Source Badge & Quick Switchers */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#7a5240]/15">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-[#b06a5e]'
                }`}
              />
              <span className="text-xs font-serif text-[#5b3a2e] font-semibold">
                {currentMovie?.title}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-[#ecd0c8]/70 border border-[#7a5240]/20 text-[#5b3a2e]">
                {isLocalDeviceFile ? '📼 Device Storage' : youtubeId ? '▶️ YouTube Cinema' : '🌐 Web Video Link'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-[#7a5240] hover:text-[#5b3a2e] px-2.5 py-1 rounded-full hover:bg-[#ecd0c8]/40 transition flex items-center gap-1 cursor-pointer"
              >
                <FileVideo className="w-3 h-3" />
                <span>Change video</span>
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-full text-[#7a5240] hover:bg-[#ecd0c8]/40 transition cursor-pointer"
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Video Player Display Screen */}
          <div className="aspect-16/9 w-full rounded-3xl overflow-hidden bg-[#120a07] border-2 border-[#7a5240]/30 shadow-2xl relative flex items-center justify-center">
            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs text-[#f9efe8]">
                <span className="text-7xl sm:text-8xl font-serif text-[#f9efe8] animate-ping">
                  {countdown}
                </span>
                <span className="text-xs uppercase tracking-widest font-mono text-[#d9a89e] mt-4">
                  Starting in sync across distance...
                </span>
              </div>
            )}

            {/* YouTube Embed Player */}
            {youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&rel=0`}
                title={currentMovie.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : currentMovie?.videoUrl ? (
              <video
                ref={videoPlayerRef}
                src={currentMovie.videoUrl}
                controls
                playsInline
                muted={isMuted}
                className="w-full h-full object-contain"
                onPlay={() => syncMovieState('play')}
                onPause={() => syncMovieState('pause')}
              />
            ) : (
              /* Empty / Placeholder Screen */
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                <Video className="w-12 h-12 text-[#d9a89e]/60" />
                <p className="font-serif text-lg text-[#f9efe8]">No video currently loaded</p>
                <p className="text-xs text-[#d9a89e]/80 max-w-sm">
                  Choose a video file from your device storage or paste a streaming video link to watch together.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-full bg-[#d9a89e] text-[#2e1d17] text-xs font-semibold hover:bg-[#ffffff] transition cursor-pointer"
                  >
                    Select Device File
                  </button>
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="px-4 py-2 rounded-full border border-[#d9a89e]/40 text-[#f9efe8] text-xs hover:bg-[#ffffff]/10 transition cursor-pointer"
                  >
                    Paste Link
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Synchronized Theater Playback Bar */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#7a5240]/15">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                id="movie-start-together-btn"
                className="px-6 py-3 rounded-full bg-[#5b3a2e] text-[#f9efe8] font-semibold text-xs sm:text-sm hover:bg-[#4a2e24] transition shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
              >
                {countdown !== null ? (
                  <span className="font-serif text-base font-bold animate-ping">{countdown}</span>
                ) : isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Together</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Together</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2.5 rounded-full glass-cream border border-[#7a5240]/20 text-[#5b3a2e] hover:bg-[#ffffff] transition cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#7a5240] font-mono block">
                Mama (Puducherry) & Akshu (Bangalore)
              </span>
              <span className="text-[10px] text-[#7a5240]/70 font-serif italic">
                Playback states synchronize seamlessly across both screens
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Film Selection Shelf */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-[#7a5240]/15">
          <div>
            <span className="micro-label">Curated Cinema Shelf</span>
            <h3 className="font-serif text-xl text-[#5b3a2e] font-normal">Recent & Saved Films</h3>
          </div>
          <span className="text-[10px] text-[#7a5240] font-mono">{movies.length} queued</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {movies.map((m) => {
            const isSelected = m.id === currentMovie?.id;
            return (
              <div
                key={m.id}
                onClick={() => handleSelectMovie(m.id)}
                className={`glass-cream p-3 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#5b3a2e] ring-2 ring-[#5b3a2e]/20 -translate-y-1 shadow-lg'
                    : 'border-[#7a5240]/20 hover:border-[#7a5240]/40 opacity-85 hover:opacity-100'
                }`}
              >
                <div className="aspect-2/3 w-full rounded-xl overflow-hidden mb-2 bg-[#ecd0c8] relative">
                  <img src={m.posterUrl} alt={m.title} className="w-full h-full object-cover" />
                  {isSelected && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] text-[8px] font-mono">
                      Now Loaded
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-serif text-sm text-[#5b3a2e] font-normal leading-snug line-clamp-1">
                    {m.title}
                  </h4>
                  <p className="text-[10px] text-[#7a5240] font-mono mt-0.5">{m.duration}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Whispers During Film */}
      <div className="glass-cream p-6 rounded-[32px] border border-[#7a5240]/20 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="micro-label">Whispers During the Film</span>
            <h3 className="font-serif text-base text-[#5b3a2e]">Silent Reactions & Thoughts</h3>
          </div>
          <span className="text-[10px] text-[#7a5240] font-mono">Shared in real time</span>
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {movieChat.length === 0 ? (
            <p className="text-xs text-[#7a5240]/70 italic font-serif py-2">
              "Whisper a thought while the projector rolls..."
            </p>
          ) : (
            movieChat.map((msg) => {
              const sender = (msg as any).senderName || (msg as any).sender || 'Partner';
              return (
                <div
                  key={msg.id}
                  className="p-2.5 rounded-xl bg-[#ffffff]/60 border border-[#7a5240]/10 text-xs flex items-center justify-between"
                >
                  <p>
                    <span className="font-semibold text-[#5b3a2e]">{sender}:</span>{' '}
                    <span className="text-[#7a5240]">{msg.text}</span>
                  </p>
                  <span className="text-[9px] text-[#7a5240]/60 font-mono">{msg.timestamp}</span>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSendWhisper} className="flex items-center gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Send a quiet whisper to your partner's seat..."
            className="flex-1 px-4 py-2 rounded-full glass-cream border border-[#7a5240]/20 text-xs text-[#5b3a2e] focus:outline-none focus:border-[#5b3a2e]"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="p-2.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] hover:bg-[#4a2e24] transition disabled:opacity-40 cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Modal: Use Video Link */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e1d17]/80 backdrop-blur-md animate-fade-up">
          <div className="relative max-w-md w-full glass-cream rounded-[32px] border border-[#7a5240]/25 p-6 sm:p-8 shadow-2xl">
            <span className="micro-label">Cinema Stream</span>
            <h2 className="font-serif text-2xl text-[#5b3a2e] font-normal mb-1">
              Play from Video Link
            </h2>
            <p className="text-xs text-[#7a5240] font-serif italic mb-4">
              "Paste any direct video URL (MP4, WebM, m3u8) or a YouTube link."
            </p>

            <form onSubmit={handleLoadLinkSubmit} className="space-y-4">
              <div>
                <label className="block micro-label mb-1">Video or Stream URL</label>
                <input
                  type="url"
                  required
                  autoFocus
                  value={linkInputUrl}
                  onChange={(e) => setLinkInputUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4 or https://youtube.com/..."
                  className="w-full px-4 py-2.5 rounded-2xl glass-cream border border-[#7a5240]/20 text-xs text-[#5b3a2e] focus:outline-none focus:border-[#5b3a2e]"
                />
              </div>

              <div>
                <label className="block micro-label mb-1">Title (Optional)</label>
                <input
                  type="text"
                  value={linkInputTitle}
                  onChange={(e) => setLinkInputTitle(e.target.value)}
                  placeholder="e.g. Midnight Cinema Stream"
                  className="w-full px-4 py-2 rounded-2xl glass-cream border border-[#7a5240]/20 text-xs text-[#5b3a2e] focus:outline-none focus:border-[#5b3a2e]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1 py-2.5 rounded-full border border-[#7a5240]/30 text-xs text-[#5b3a2e] hover:bg-[#ffffff]/50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] text-xs font-semibold hover:bg-[#4a2e24] cursor-pointer shadow-md"
                >
                  Load & Watch Together
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
