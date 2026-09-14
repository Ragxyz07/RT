import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music,
  Upload,
  Link2,
  Sparkles,
  Check,
  Radio,
  CloudRain,
  Waves,
  Flame,
  X,
  Disc,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { saveAudioFile, loadSavedAudioFile, clearSavedAudioFile } from '../utils/audioStorage';

export interface SoundtrackProfile {
  id: string;
  name: string;
  subtitle: string;
  icon: 'waves' | 'rain' | 'vinyl' | 'hearth' | 'custom';
  type: 'synth' | 'audio_url' | 'custom_file';
  synthStyle?: 'puducherry_ocean' | 'bangalore_rain' | 'lofi_vinyl' | 'acoustic_hearth';
  url?: string;
  fileName?: string;
}

const PRESET_SOUNDTRACKS: SoundtrackProfile[] = [
  {
    id: 'preset_golden_hour',
    name: 'golden hour (JVKE)',
    subtitle: 'Our favorite romantic acoustic melody',
    icon: 'custom',
    type: 'audio_url',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-moment-112193.mp3',
  },
  {
    id: 'preset_ocean',
    name: 'Puducherry Sea & Chords',
    subtitle: 'Warm ocean waves & gentle Rhodes keys',
    icon: 'waves',
    type: 'synth',
    synthStyle: 'puducherry_ocean',
  },
  {
    id: 'preset_rain',
    name: 'Bangalore Rain & Piano',
    subtitle: 'Gentle raindrops & contemplative soft piano',
    icon: 'rain',
    type: 'synth',
    synthStyle: 'bangalore_rain',
  },
  {
    id: 'preset_vinyl',
    name: 'Starlight Lofi Vinyl',
    subtitle: 'Warm vintage vinyl crackle & ethereal bells',
    icon: 'vinyl',
    type: 'synth',
    synthStyle: 'lofi_vinyl',
  },
  {
    id: 'preset_hearth',
    name: 'Acoustic Hearth & Night',
    subtitle: 'Night breeze, warm harmonics & gentle ambiance',
    icon: 'hearth',
    type: 'synth',
    synthStyle: 'acoustic_hearth',
  },
];

// Helper to extract YouTube ID
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

// Helper to extract Spotify Track ID
function extractSpotifyTrackId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/i);
  return match ? match[1] : null;
}

// Helper to normalize direct audio links (Google Drive, Dropbox, etc.)
function normalizeAudioUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  // Google Drive sharing link
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch) {
    return `https://docs.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  // Dropbox link
  if (url.includes('dropbox.com') && url.includes('dl=0')) {
    return url.replace('dl=0', 'raw=1');
  }
  return url;
}

export const AmbientAudioController: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('akra_audio_volume');
    return saved !== null ? parseFloat(saved) : 0.4;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [activeSoundtrackId, setActiveSoundtrackId] = useState<string>(() => {
    return localStorage.getItem('akra_active_soundtrack_id') || 'preset_golden_hour';
  });
  const [customTrackUrl, setCustomTrackUrl] = useState<string>(() => {
    return localStorage.getItem('akra_custom_soundtrack_url') || '';
  });
  const [urlInputVal, setUrlInputVal] = useState<string>(() => {
    return localStorage.getItem('akra_custom_soundtrack_url') || '';
  });
  const [customFileName, setCustomFileName] = useState<string>(() => {
    return localStorage.getItem('akra_custom_soundtrack_name') || '';
  });
  const [customAudioDataUrl, setCustomAudioDataUrl] = useState<string>('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Audio nodes & refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const synthIntervalRef = useRef<number | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load saved IndexedDB audio file on mount if available
  useEffect(() => {
    loadSavedAudioFile().then((saved) => {
      if (saved) {
        setCustomAudioDataUrl(saved.url);
        if (!customFileName) {
          setCustomFileName(saved.fileName);
        }
      }
    });
  }, [customFileName]);

  // Determine active profile
  const activeProfile =
    activeSoundtrackId === 'custom_track'
      ? {
          id: 'custom_track',
          name: customFileName || 'Our Custom Track',
          subtitle: customFileName
            ? 'Personal audio track'
            : customTrackUrl
            ? 'Custom web audio'
            : 'Custom romantic track',
          icon: 'custom' as const,
          type: (customAudioDataUrl ? 'custom_file' : 'audio_url') as 'custom_file' | 'audio_url',
          url: customAudioDataUrl || normalizeAudioUrl(customTrackUrl),
        }
      : PRESET_SOUNDTRACKS.find((p) => p.id === activeSoundtrackId) || PRESET_SOUNDTRACKS[0];

  const youtubeId =
    activeSoundtrackId === 'custom_track' && customTrackUrl
      ? extractYouTubeId(customTrackUrl)
      : null;

  const spotifyTrackId =
    activeSoundtrackId === 'custom_track' && customTrackUrl
      ? extractSpotifyTrackId(customTrackUrl)
      : null;

  // Stop everything safely
  const stopAllAudio = useCallback(() => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
        noiseSourceRef.current.disconnect();
      } catch {
        // ignore
      }
      noiseSourceRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
      htmlAudioRef.current.currentTime = 0;
      htmlAudioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoadingAudio(false);
  }, []);

  // Web Audio Synth generator for the atmospheric presets
  const startSynthAtmosphere = useCallback(
    (style: 'puducherry_ocean' | 'bangalore_rain' | 'lofi_vinyl' | 'acoustic_hearth') => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);
        masterGain.connect(ctx.destination);
        masterGainRef.current = masterGain;

        const bufferSize = ctx.sampleRate * 3;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        if (style === 'puducherry_ocean') {
          let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.969 * b2 + white * 0.153852;
            b3 = 0.8665 * b3 + white * 0.3104856;
            b4 = 0.55 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.016898;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.02;
            b6 = white * 0.115926;
          }
        } else if (style === 'bangalore_rain') {
          for (let i = 0; i < bufferSize; i++) {
            const drop = Math.random() < 0.015 ? (Math.random() * 2 - 1) * 0.12 : (Math.random() * 2 - 1) * 0.01;
            output[i] = drop;
          }
        } else if (style === 'lofi_vinyl') {
          for (let i = 0; i < bufferSize; i++) {
            const pop = Math.random() < 0.003 ? (Math.random() * 2 - 1) * 0.08 : 0;
            const hiss = (Math.random() * 2 - 1) * 0.006;
            output[i] = pop + hiss;
          }
        } else {
          for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.008;
          }
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        if (style === 'puducherry_ocean') {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(380, ctx.currentTime);
          const swellGain = ctx.createGain();
          swellGain.gain.setValueAtTime(0.05, ctx.currentTime);

          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(0.12, ctx.currentTime);
          const lfoGain = ctx.createGain();
          lfoGain.gain.setValueAtTime(0.04, ctx.currentTime);
          lfo.connect(lfoGain);
          lfoGain.connect(swellGain.gain);
          lfo.start();

          whiteNoise.connect(filter);
          filter.connect(swellGain);
          swellGain.connect(masterGain);
        } else {
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(style === 'bangalore_rain' ? 1200 : 800, ctx.currentTime);
          filter.Q.setValueAtTime(1.2, ctx.currentTime);
          whiteNoise.connect(filter);
          filter.connect(masterGain);
        }

        whiteNoise.start(0);
        noiseSourceRef.current = whiteNoise;

        // Chords generator for melodic tone
        const playTone = (freq: number, dur: number, startDelay: number, toneGainVal: number) => {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
          const currentCtx = audioCtxRef.current;
          const osc = currentCtx.createOscillator();
          const noteGain = currentCtx.createGain();

          osc.type = style === 'lofi_vinyl' ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, currentCtx.currentTime + startDelay);

          noteGain.gain.setValueAtTime(0, currentCtx.currentTime + startDelay);
          noteGain.gain.linearRampToValueAtTime(toneGainVal, currentCtx.currentTime + startDelay + 0.3);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, currentCtx.currentTime + startDelay + dur);

          osc.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(currentCtx.currentTime + startDelay);
          osc.stop(currentCtx.currentTime + startDelay + dur + 0.1);
        };

        const chordProgression = [
          [220.0, 261.63, 329.63, 392.0], // Am7
          [174.61, 220.0, 261.63, 329.63], // Fmaj7
          [130.81, 164.81, 196.0, 246.94], // Cmaj7
          [196.0, 246.94, 293.66, 349.23], // G7
        ];

        let chordIdx = 0;
        const triggerChord = () => {
          const chord = chordProgression[chordIdx % chordProgression.length];
          chord.forEach((freq, idx) => {
            playTone(freq, 4.5, idx * 0.18, 0.02);
          });
          chordIdx++;
        };

        triggerChord();
        synthIntervalRef.current = window.setInterval(triggerChord, 5500);
        setIsPlaying(true);
        setIsLoadingAudio(false);
        setAudioError(null);
      } catch (err) {
        console.error('Failed to start synth atmosphere:', err);
        setIsPlaying(false);
        setIsLoadingAudio(false);
      }
    },
    [isMuted, volume]
  );

  // Play audio stream/file via HTML5 Audio
  const playHtmlAudio = useCallback(
    (url: string) => {
      setIsLoadingAudio(true);
      setAudioError(null);

      const audio = new Audio();
      audio.src = url;
      audio.loop = true;
      audio.volume = isMuted ? 0 : volume;
      audio.crossOrigin = 'anonymous';

      const handleCanPlay = () => {
        setIsLoadingAudio(false);
      };

      const handleError = () => {
        setIsLoadingAudio(false);
        setIsPlaying(false);
        setAudioError('Unable to play audio from this URL or file. Please check link format or upload an MP3 directly.');
      };

      audio.addEventListener('canplay', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError, { once: true });

      audio
        .play()
        .then(() => {
          htmlAudioRef.current = audio;
          setIsPlaying(true);
          setIsLoadingAudio(false);
          setAudioError(null);
        })
        .catch((playErr) => {
          console.warn('Audio play error:', playErr);
          setIsLoadingAudio(false);
          setIsPlaying(false);
          setAudioError('Browser blocked autoplay or could not decode track. Click Play again or try another format.');
        });
    },
    [isMuted, volume]
  );

  // Master playback dispatcher
  const startChosenSoundtrack = useCallback(
    (targetId?: string) => {
      stopAllAudio();
      setAudioError(null);

      const currentId = targetId || activeSoundtrackId;

      if (currentId === 'custom_track') {
        const directUrl = customAudioDataUrl || normalizeAudioUrl(customTrackUrl);
        const yt = extractYouTubeId(customTrackUrl);
        const sp = extractSpotifyTrackId(customTrackUrl);

        if (yt || sp) {
          // Handled via iframe embed
          setIsPlaying(true);
          return;
        }

        if (directUrl) {
          playHtmlAudio(directUrl);
        } else {
          setAudioError('Please upload an audio file or paste an audio URL.');
        }
      } else {
        const preset = PRESET_SOUNDTRACKS.find((p) => p.id === currentId) || PRESET_SOUNDTRACKS[0];
        if (preset.type === 'audio_url' && preset.url) {
          playHtmlAudio(preset.url);
        } else {
          startSynthAtmosphere(preset.synthStyle || 'puducherry_ocean');
        }
      }
    },
    [activeSoundtrackId, customAudioDataUrl, customTrackUrl, playHtmlAudio, startSynthAtmosphere, stopAllAudio]
  );

  const togglePlayback = () => {
    if (isPlaying) {
      stopAllAudio();
    } else {
      startChosenSoundtrack();
    }
  };

  const handleSelectTrack = (trackId: string) => {
    setActiveSoundtrackId(trackId);
    localStorage.setItem('akra_active_soundtrack_id', trackId);
    setAudioError(null);
    if (isPlaying) {
      setTimeout(() => startChosenSoundtrack(trackId), 50);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    localStorage.setItem('akra_audio_volume', newVol.toString());
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(isMuted ? 0 : newVol, audioCtxRef.current.currentTime);
    }
    if (htmlAudioRef.current) {
      htmlAudioRef.current.volume = isMuted ? 0 : newVol;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(nextMuted ? 0 : volume, audioCtxRef.current.currentTime);
    }
    if (htmlAudioRef.current) {
      htmlAudioRef.current.volume = nextMuted ? 0 : volume;
    }
  };

  // Handle local file upload with IndexedDB persistence
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoadingAudio(true);
      setAudioError(null);
      const url = await saveAudioFile(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');

      setCustomAudioDataUrl(url);
      setCustomFileName(cleanName);
      localStorage.setItem('akra_custom_soundtrack_name', cleanName);
      setActiveSoundtrackId('custom_track');
      localStorage.setItem('akra_active_soundtrack_id', 'custom_track');

      // Immediately play the uploaded track
      stopAllAudio();
      playHtmlAudio(url);
    } catch (err) {
      console.error('File upload error:', err);
      setAudioError('Failed to process uploaded audio file.');
      setIsLoadingAudio(false);
    }
  };

  // Handle custom URL submit
  const handleApplyUrl = (overrideUrl?: string) => {
    const targetUrl = (overrideUrl !== undefined ? overrideUrl : urlInputVal).trim();
    if (!targetUrl) {
      setAudioError('Please enter a valid link or upload an audio file.');
      return;
    }

    setCustomTrackUrl(targetUrl);
    localStorage.setItem('akra_custom_soundtrack_url', targetUrl);
    setActiveSoundtrackId('custom_track');
    localStorage.setItem('akra_active_soundtrack_id', 'custom_track');
    setAudioError(null);

    const yt = extractYouTubeId(targetUrl);
    const sp = extractSpotifyTrackId(targetUrl);

    stopAllAudio();

    if (yt || sp) {
      setIsPlaying(true);
    } else {
      playHtmlAudio(normalizeAudioUrl(targetUrl));
    }
  };

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Hidden YouTube Background Audio Player */}
      {isPlaying && youtubeId && activeSoundtrackId === 'custom_track' && (
        <div className="sr-only">
          <iframe
            id="akra-youtube-player"
            width="200"
            height="200"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&loop=1&playlist=${youtubeId}&playsinline=1`}
            title="AKRA Ambient Player"
            allow="autoplay; encrypted-media"
            className="w-0 h-0 pointer-events-none opacity-0"
          />
        </div>
      )}

      {/* Expanded Audio Options Modal */}
      {showPicker && (
        <div className="mb-3 w-84 sm:w-96 glass-cream rounded-2xl border border-[#7a5240]/30 shadow-2xl p-4 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 text-[#3e2723]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#7a5240]/15">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#b06a5e]" />
              <h3 className="font-serif text-sm font-semibold text-[#5b3a2e]">
                Couple Ambient Soundtrack
              </h3>
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="p-1 text-[#7a5240] hover:text-[#3e2723] rounded-full hover:bg-white/40 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error Banner if any */}
          {audioError && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-600/30 flex items-start gap-2 text-xs text-amber-900 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>{audioError}</span>
            </div>
          )}

          {/* Spotify Player Embed if Spotify URL is active */}
          {isPlaying && spotifyTrackId && activeSoundtrackId === 'custom_track' && (
            <div className="mt-3 rounded-xl overflow-hidden shadow-sm border border-[#7a5240]/20">
              <iframe
                src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
                width="100%"
                height="80"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify Soundtrack Player"
              />
            </div>
          )}

          {/* Track Presets */}
          <div className="mt-3 space-y-1.5 max-h-52 overflow-y-auto pr-1">
            <div className="text-[11px] font-mono text-[#7a5240] uppercase tracking-wider mb-1 px-1">
              Curated Couple Soundscapes
            </div>
            {PRESET_SOUNDTRACKS.map((track) => {
              const isSelected = activeSoundtrackId === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => handleSelectTrack(track.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#5b3a2e] text-[#f9efe8] border-[#5b3a2e] shadow-xs'
                      : 'bg-white/40 border-[#7a5240]/15 hover:bg-white/80 text-[#3e2723]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-white/20 text-[#f9efe8]' : 'bg-[#7a5240]/10 text-[#5b3a2e]'
                      }`}
                    >
                      {track.icon === 'waves' && <Waves className="w-4 h-4" />}
                      {track.icon === 'rain' && <CloudRain className="w-4 h-4" />}
                      {track.icon === 'vinyl' && <Disc className="w-4 h-4" />}
                      {track.icon === 'hearth' && <Flame className="w-4 h-4" />}
                      {track.icon === 'custom' && <Music className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-medium leading-tight">{track.name}</div>
                      <div
                        className={`text-[10px] leading-tight ${
                          isSelected ? 'text-[#f9efe8]/80' : 'text-[#7a5240]'
                        }`}
                      >
                        {track.subtitle}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}

            {/* Custom Track Card */}
            <div
              className={`p-3 rounded-xl border transition-all mt-2 ${
                activeSoundtrackId === 'custom_track'
                  ? 'bg-[#5b3a2e] text-[#f9efe8] border-[#5b3a2e] shadow-xs'
                  : 'bg-white/40 border-[#7a5240]/15 text-[#3e2723]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  <span className="text-xs font-medium">Your Favorite Track / Song</span>
                </div>
                {activeSoundtrackId === 'custom_track' && (
                  <span className="text-[10px] font-mono uppercase bg-white/20 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>

              {/* Upload or Link selector */}
              <div className="space-y-2 mt-2">
                {/* File Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoadingAudio}
                  className={`w-full py-2 px-3 rounded-lg border border-dashed flex items-center justify-center gap-2 text-xs font-medium transition cursor-pointer ${
                    activeSoundtrackId === 'custom_track'
                      ? 'border-white/40 hover:bg-white/20 text-[#f9efe8]'
                      : 'border-[#7a5240]/30 hover:bg-white text-[#5b3a2e]'
                  }`}
                >
                  {isLoadingAudio ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {customFileName ? `Change file (${customFileName})` : 'Upload audio file (.mp3, .wav, .m4a)'}
                  </span>
                </button>

                {/* Paste URL Input & Play button */}
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Link2
                      className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                        activeSoundtrackId === 'custom_track' ? 'text-white/60' : 'text-[#7a5240]'
                      }`}
                    />
                    <input
                      type="url"
                      placeholder="Paste YouTube, Spotify, or MP3 link..."
                      value={urlInputVal}
                      onChange={(e) => setUrlInputVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleApplyUrl();
                        }
                      }}
                      className={`w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border outline-none font-sans ${
                        activeSoundtrackId === 'custom_track'
                          ? 'bg-white/20 border-white/30 text-[#f9efe8] placeholder-white/60'
                          : 'bg-white border-[#7a5240]/20 text-[#3e2723] placeholder-[#7a5240]/60'
                      }`}
                    />
                  </div>
                  <button
                    onClick={() => handleApplyUrl()}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                      activeSoundtrackId === 'custom_track'
                        ? 'bg-white text-[#5b3a2e] hover:bg-white/90 shadow-xs'
                        : 'bg-[#5b3a2e] text-[#f9efe8] hover:bg-[#4a2e24] shadow-xs'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Volume Slider in Modal */}
          <div className="flex items-center gap-3 pt-3 mt-3 border-t border-[#7a5240]/15">
            <button
              onClick={toggleMute}
              className="text-[#5b3a2e] hover:text-[#3e2723] cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-1.5 accent-[#5b3a2e] cursor-pointer"
            />
            <span className="text-[10px] font-mono text-[#7a5240] w-8 text-right">
              {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
            </span>
          </div>
        </div>
      )}

      {/* Floating Ambient Bar */}
      <div className="glass-cream rounded-full border border-[#7a5240]/25 shadow-xl p-1.5 flex items-center gap-2 backdrop-blur-md transition-all duration-300">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayback}
          className="w-8 h-8 rounded-full bg-[#5b3a2e] text-[#f9efe8] hover:bg-[#4a2e24] flex items-center justify-center transition cursor-pointer active:scale-95 shadow-xs"
          title={isPlaying ? 'Pause background soundtrack' : 'Play background soundtrack'}
        >
          {isLoadingAudio ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Soundtrack Label & Waveform (Click to open Choice picker) */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-white/40 transition cursor-pointer"
          title="Click to choose background soundtrack"
        >
          {/* Animated Waveform */}
          <div className="flex items-center gap-0.5 h-4">
            {[1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className={`w-0.5 rounded-full bg-[#5b3a2e] transition-all duration-300 ${
                  isPlaying
                    ? bar === 1
                      ? 'h-3 animate-pulse'
                      : bar === 2
                      ? 'h-4 animate-slow-orb-pulse'
                      : bar === 3
                      ? 'h-2.5 animate-pulse'
                      : 'h-3.5 animate-slow-orb-pulse'
                    : 'h-1 opacity-40'
                }`}
              />
            ))}
          </div>

          <div className="text-left hidden sm:block">
            <span className="text-[10px] font-mono text-[#5b3a2e] block leading-tight max-w-[130px] truncate">
              {isPlaying ? activeProfile.name : 'Soundtrack choice'}
            </span>
          </div>

          <Disc
            className={`w-3.5 h-3.5 text-[#5b3a2e] ${isPlaying ? 'animate-spin' : ''}`}
            style={{ animationDuration: '6s' }}
          />
        </button>

        {/* Quick Volume & Mute */}
        <div className="flex items-center gap-1.5 pl-1.5 pr-1 border-l border-[#7a5240]/15">
          <button
            onClick={toggleMute}
            className="p-1 text-[#5b3a2e] hover:text-[#4a2e24] cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
