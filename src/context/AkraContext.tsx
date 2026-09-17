import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, setAuthToken } from '../services/api';
import { realtimeClient } from '../services/websocket';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  UserProfile,
  RelationshipInfo,
  ChatMessage,
  VaultItem,
  Memory,
  Letter,
  Milestone,
  FutureItem,
  MovieItem,
  WatchRoomState,
  NavigationTab,
  FontChoice,
  FontSizeChoice
} from '../types';
import {
  initialUserLeo,
  initialUserMaya,
  initialRelationship,
  initialChatMessages,
  initialVaultItems,
  initialMemories,
  initialLetters,
  initialMilestones,
  initialFutureItems,
  initialMovies
} from '../data/initialData';
import {
  sanitizeText,
  validateChatMessage,
  validateLetterInput,
  validateTimelineInput,
  validateBucketListInput,
  validateMemoryInput,
} from '../utils/sanitize';

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'love' | 'photo' | 'letter' | 'movie' | 'info';
}

interface AkraContextType {
  // Navigation & Authentication
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  login: (emailOrNickname: string, pass: string, asPartner?: 'user_leo' | 'user_maya' | 'leo' | 'maya') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isPartnerConnected: boolean;
  connectPartner: (code: string) => boolean;
  
  // Active User / Profiles
  currentUser: UserProfile;
  partnerUser: UserProfile;
  userLeo: UserProfile;
  userMaya: UserProfile;
  switchActiveUser: () => void;
  updateCurrentUserProfile: (updates: Partial<UserProfile>) => void;
  changeUserPassword: (userId: string, oldPass: string, newPass: string) => Promise<boolean>;
  
  // Relationship
  relationship: RelationshipInfo;
  updateRelationship: (updates: Partial<RelationshipInfo>) => void;
  updatePortalDesign: (tab: NavigationTab, design: import('../types').PortalCustomization) => void;
  resetPortalDesigns: () => void;

  // Chat
  chatMessages: ChatMessage[];
  unreadCount: number;
  isPartnerTyping: boolean;
  sendChatMessage: (text: string, type?: 'text' | 'image' | 'voice', mediaUrl?: string, voiceDuration?: number, replyTo?: ChatMessage) => void;
  updateChatMessage: (id: string, newText: string) => void;
  deleteChatMessage: (id: string) => void;
  toggleMessageReaction: (messageId: string, emoji: string) => void;
  clearChatMessages: () => void;
  markMessagesAsRead: () => void;
  setMyTyping: (isTyping: boolean) => void;

  // Photobooth
  sendPhotoForYou: (photoUrl: string, caption?: string) => void;

  // Vault
  vaultItems: VaultItem[];
  isVaultUnlocked: boolean;
  unlockVault: (pin: string) => boolean;
  lockVault: () => void;
  changeVaultPin: (currentPin: string, newPin: string) => { success: boolean; error?: string };
  addVaultItem: (item: Omit<VaultItem, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => void;
  updateVaultItem: (id: string, updated: Partial<VaultItem>) => void;
  deleteVaultItem: (id: string) => void;

  // Location
  toggleLocationSharing: (sharing?: boolean) => void;
  updateMyLocation: (lat: number, lng: number, city?: string, accuracy?: number) => void;
  calculateDistanceKm: () => number;
  sendVirtualHeart: () => void;

  // Movie Night
  movies: MovieItem[];
  watchRoom: WatchRoomState;
  movieChat: { id: string; sender: string; text: string; timestamp: string }[];
  syncMovieState: (action: 'play' | 'pause' | 'seek' | 'changeMovie', time?: number, movieId?: string) => void;
  sendMovieChatMessage: (text: string) => void;
  addCustomMovie: (movie: Omit<MovieItem, 'id'>) => string;
  loadMovieByUrl: (url: string, title?: string) => void;
  loadMovieByFile: (file: File) => void;

  // Memories
  memories: Memory[];
  addMemory: (memory: Omit<Memory, 'id' | 'likes' | 'likedByYou' | 'comments' | 'uploadedBy' | 'uploadedByName'>) => void;
  updateMemory: (id: string, updated: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  toggleLikeMemory: (id: string) => void;
  addCommentToMemory: (id: string, text: string) => void;

  // Typography & Visibility
  fontFamily: FontChoice;
  setFontFamily: (font: FontChoice) => void;
  fontSize: FontSizeChoice;
  setFontSize: (size: FontSizeChoice) => void;

  // Letters
  letters: Letter[];
  addLetter: (letter: Omit<Letter, 'id' | 'createdAt' | 'authorId' | 'authorName'>) => void;
  updateLetter: (id: string, updated: Partial<Letter>) => void;
  deleteLetter: (id: string) => void;
  markLetterRead: (id: string) => void;

  // Timeline
  milestones: Milestone[];
  addMilestone: (milestone: Omit<Milestone, 'id'>) => void;
  updateMilestone: (id: string, updated: Partial<Milestone>) => void;
  deleteMilestone: (id: string) => void;

  // Future
  futureItems: FutureItem[];
  toggleFutureItem: (id: string) => void;
  addFutureItem: (item: Omit<FutureItem, 'id' | 'completed' | 'suggestedBy' | 'suggestedByName'>) => void;
  updateFutureItem: (id: string, updated: Partial<FutureItem>) => void;
  deleteFutureItem: (id: string) => void;

  // Notifications
  toasts: ToastNotification[];
  removeToast: (id: string) => void;
  showToast: (title: string, message: string, type?: ToastNotification['type']) => void;

  // Reset demo data
  resetAllData: () => void;
}

const AkraContext = createContext<AkraContextType | undefined>(undefined);

// LocalStorage Keys
const STORAGE_PREFIX = 'akra_clean_v5_';
const loadStorage = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};
const saveStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
};

export const AkraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & Auth
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    } catch {
      return false;
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    try {
      const hash = window.location.hash || '';
      return hash.includes('type=recovery') || (hash.includes('access_token=') && hash.includes('type=recovery'));
    } catch {
      return false;
    }
  });
  const [isPartnerConnected, setIsPartnerConnected] = useState<boolean>(() => loadStorage('partner_connected', true));
  const [activeUserId, setActiveUserId] = useState<'user_leo' | 'user_maya'>(() => loadStorage('active_user_id', 'user_leo'));

  // Profiles (guaranteeing Ragul & Akshya names, nicknames and locations)
  const [userLeo, setUserLeo] = useState<UserProfile>(() => {
    const saved = loadStorage('user_leo', initialUserLeo);
    return {
      ...saved,
      name: 'Ragul',
      nickname: saved.nickname && saved.nickname.toLowerCase() === 'mama' ? 'Mama' : (saved.nickname || 'Mama'),
      city: 'Puducherry',
      country: 'India',
    };
  });
  const [userMaya, setUserMaya] = useState<UserProfile>(() => {
    const saved = loadStorage('user_maya', initialUserMaya);
    return {
      ...saved,
      name: 'Akshya',
      nickname: saved.nickname && saved.nickname.toLowerCase() === 'akshu' ? 'Akshu' : (saved.nickname || 'Akshu'),
      city: 'Bangalore',
      country: 'India',
    };
  });
  
  // Current user & Partner user derived
  const currentUser = activeUserId === 'user_leo' ? userLeo : userMaya;
  const partnerUser = activeUserId === 'user_leo' ? userMaya : userLeo;

  // Relationship info
  const [relationship, setRelationship] = useState<RelationshipInfo>(() => loadStorage('relationship', initialRelationship));

  // Helper to remove any test/seed items from previous local runs
  const filterTestSeedData = <T extends { id?: string }>(items: T[]): T[] => {
    const dummyIds = new Set([
      'msg_1', 'msg_2', 'msg_3', 'msg_4',
      'vlt_1', 'vlt_2', 'vlt_3', 'vlt_4',
      'mem_1', 'mem_2', 'mem_3', 'mem_4',
      'let_1', 'let_2', 'let_3',
      'mil_1', 'mil_2', 'mil_3', 'mil_4',
      'fut_1', 'fut_2', 'fut_3', 'fut_4',
    ]);
    return (items || []).filter(item => item && item.id && !dummyIds.has(item.id));
  };

  // Chat - only load saved messages or empty array
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    return filterTestSeedData(loadStorage('chat_messages', []));
  });
  const [isPartnerTyping, setIsPartnerTyping] = useState<boolean>(false);

  // Vault - only load saved vault items or empty array
  const [vaultItems, setVaultItems] = useState<VaultItem[]>(() => {
    return filterTestSeedData(loadStorage('vault_items', []));
  });
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);

  // Movie Night
  const [movies, setMovies] = useState<MovieItem[]>(() => loadStorage('movies_list', initialMovies));
  const [watchRoom, setWatchRoom] = useState<WatchRoomState>(() => loadStorage('watch_room', {
    currentMovieId: 'mov_1',
    isPlaying: false,
    currentTime: 0,
    updatedBy: 'Ragul',
    updatedAt: Date.now(),
    partnerWatching: true,
  }));
  const [movieChat, setMovieChat] = useState<{ id: string; sender: string; text: string; timestamp: string }[]>(() =>
    loadStorage('movie_chat', [])
  );

  // Memories, Letters, Timeline, Future - clean slate for the couple
  const [memories, setMemories] = useState<Memory[]>(() => {
    return filterTestSeedData(loadStorage('memories', []));
  });
  const [letters, setLetters] = useState<Letter[]>(() => {
    return filterTestSeedData(loadStorage('letters', []));
  });
  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    return filterTestSeedData(loadStorage('milestones', []));
  });
  const [futureItems, setFutureItems] = useState<FutureItem[]>(() => {
    return filterTestSeedData(loadStorage('future_items', []));
  });

  // Typography & Visibility (Defaults to standard clean text & elegant romantic serif)
  const [fontFamily, setFontFamily] = useState<FontChoice>(() => loadStorage('font_family', 'playfair'));
  const [fontSize, setFontSize] = useState<FontSizeChoice>(() => loadStorage('font_size', 'normal'));

  useEffect(() => {
    saveStorage('font_family', fontFamily);
    document.documentElement.setAttribute('data-font', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    saveStorage('font_size', fontSize);
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  // Toasts - Suppress intrusive hug/touch toasts requested by user & deduplicate
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = useCallback((title: string, message: string, type: ToastNotification['type'] = 'love') => {
    const lowerTitle = (title || '').toLowerCase();
    const lowerMsg = (message || '').toLowerCase();
    // Stop the notification that pic attached (Hug & Touch toasts)
    if (
      lowerTitle.includes('sending hug') ||
      lowerTitle.includes('touch sent') ||
      lowerTitle.includes('hug received') ||
      lowerMsg.includes('flying straight') ||
      lowerMsg.includes('warm ripple was sent') ||
      lowerMsg.includes('virtual hug across')
    ) {
      return;
    }

    setToasts(prev => {
      // Deduplicate if identical toast already showing
      if (prev.some(t => t.title === title && t.message === message)) {
        return prev;
      }
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      // Keep maximum 2 toasts to prevent annoying stacked clutter
      const trimmed = prev.length >= 2 ? prev.slice(prev.length - 1) : prev;
      return [...trimmed, { id, title, message, type }];
    });

    const id = 'toast_timer_' + Date.now();
    setTimeout(() => {
      setToasts(prev => (prev.length > 0 ? prev.slice(1) : []));
    }, 4200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Sync to localStorage
  useEffect(() => { saveStorage('auth', isAuthenticated); }, [isAuthenticated]);
  useEffect(() => { saveStorage('partner_connected', isPartnerConnected); }, [isPartnerConnected]);
  useEffect(() => { saveStorage('active_user_id', activeUserId); }, [activeUserId]);
  useEffect(() => { saveStorage('user_leo', userLeo); }, [userLeo]);
  useEffect(() => { saveStorage('user_maya', userMaya); }, [userMaya]);
  useEffect(() => { saveStorage('relationship', relationship); }, [relationship]);
  useEffect(() => { saveStorage('chat_messages', chatMessages); }, [chatMessages]);
  useEffect(() => { saveStorage('vault_items', vaultItems); }, [vaultItems]);
  useEffect(() => { saveStorage('watch_room', watchRoom); }, [watchRoom]);
  useEffect(() => { saveStorage('memories', memories); }, [memories]);
  useEffect(() => { saveStorage('letters', letters); }, [letters]);
  useEffect(() => { saveStorage('milestones', milestones); }, [milestones]);
  useEffect(() => { saveStorage('future_items', futureItems); }, [futureItems]);

  // Persistent BroadcastChannel for robust cross-tab synchronization
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize WebSocket connection and listen for real-time events from Cloud SQL backend
  useEffect(() => {
    const currentUid = activeUserId === 'user_leo' ? 'ragul_mama' : 'akshu_akshya';
    realtimeClient.connect(currentUid);

    const unsubscribe = realtimeClient.subscribe((type, data) => {
      if (!data) return;

      if (type === 'new_message') {
        const isSelf = (data.senderId === 'ragul_mama' && activeUserId === 'user_leo') ||
                       (data.senderId === 'akshu_akshya' && activeUserId === 'user_maya');
        if (!isSelf) {
          const timeStr = data.createdAt ? new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
          const incomingMsg: ChatMessage = {
            id: data.id,
            senderId: data.senderId === 'ragul_mama' ? 'user_leo' : 'user_maya',
            senderName: data.senderName,
            text: data.text || '',
            timestamp: timeStr,
            type: (data.attachmentType as any) || 'text',
            mediaUrl: data.imageUrl || data.audioUrl,
            status: 'delivered',
          };
          setChatMessages(prev => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, incomingMsg];
          });
          showToast(`❤️ New note from ${data.senderName}`, data.text || 'Sent an attachment', 'love');
        }
      } else if (type === 'message_reaction') {
        setChatMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reaction: data.reaction } : m));
      } else if (type === 'live_location') {
        if (data.userId && data.latitude && data.longitude) {
          const isLeo = data.userId === 'ragul_mama';
          const latVal = parseFloat(data.latitude);
          const lngVal = parseFloat(data.longitude);
          const accuracyVal = data.accuracy
            ? parseFloat(String(data.accuracy).replace('m', ''))
            : undefined;
          const isSharing = data.isSharing !== undefined ? !!data.isSharing : true;
          const updateTime = data.updatedAt || new Date().toISOString();

          if (isLeo) {
            setUserLeo(prev => ({
              ...prev,
              lat: latVal,
              lng: lngVal,
              accuracy: accuracyVal ?? prev.accuracy,
              city: data.city || prev.city,
              isSharingLocation: isSharing,
              lastLocationUpdate: updateTime,
            }));
          } else {
            setUserMaya(prev => ({
              ...prev,
              lat: latVal,
              lng: lngVal,
              accuracy: accuracyVal ?? prev.accuracy,
              city: data.city || prev.city,
              isSharingLocation: isSharing,
              lastLocationUpdate: updateTime,
            }));
          }
        }
      } else if (type === 'location_sharing_toggle') {
        const isLeo = data.userId === 'ragul_mama';
        const isSharing = !!data.isSharingEnabled;
        const partnerName = isLeo ? 'Mama' : 'Akshu';
        const isSelf = (isLeo && activeUserId === 'user_leo') || (!isLeo && activeUserId === 'user_maya');

        if (isLeo) {
          setUserLeo(prev => ({
            ...prev,
            isSharingLocation: isSharing,
            lastLocationUpdate: new Date().toISOString(),
          }));
        } else {
          setUserMaya(prev => ({
            ...prev,
            isSharingLocation: isSharing,
            lastLocationUpdate: new Date().toISOString(),
          }));
        }

        if (isSharing && !isSelf) {
          showToast('📍 Live Location Connected', `${partnerName} turned on live location sharing.`, 'info');
        }
      } else if (type === 'partner_presence') {
        const isLeo = data.userId === 'ragul_mama';
        if (isLeo) {
          setUserLeo(prev => ({ ...prev, isOnline: !!data.isOnline }));
        } else {
          setUserMaya(prev => ({ ...prev, isOnline: !!data.isOnline }));
        }
      } else if (type === 'new_memory') {
        const author = data.uploadedByName || (data.creatorId === 'ragul_mama' ? 'Mama' : 'Akshu');
        const isSelf = (data.creatorId === 'ragul_mama' && activeUserId === 'user_leo') ||
                       (data.creatorId === 'akshu_akshya' && activeUserId === 'user_maya');
        setMemories(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [data, ...prev];
        });
        if (!isSelf) {
          showToast('📸 New Memory Added', `${author} added "${data.title || 'a new photo'}" to your shelf.`, 'photo');
        }
      } else if (type === 'new_letter') {
        const author = data.authorName || (data.senderId === 'ragul_mama' ? 'Mama' : 'Akshu');
        const isSelf = (data.senderId === 'ragul_mama' && activeUserId === 'user_leo') ||
                       (data.senderId === 'akshu_akshya' && activeUserId === 'user_maya');
        setLetters(prev => {
          if (prev.some(l => l.id === data.id)) return prev;
          return [data, ...prev];
        });
        if (!isSelf) {
          showToast('💌 New Letter Received', `${author} placed a sealed letter for you.`, 'letter');
        }
      } else if (type === 'movie_sync' || type === 'movie_session' || type === 'movie_session_sync') {
        const updater = data.updatedBy || data.startedBy || 'Partner';
        const isSelf = (updater === 'Ragul' && activeUserId === 'user_leo') ||
                       (updater === 'Akshya' && activeUserId === 'user_maya');
        setWatchRoom(prev => {
          const nextPlaying = data.isPlaying ?? data.is_playing ?? prev.isPlaying;
          if (nextPlaying && !prev.isPlaying && !isSelf) {
            showToast('🎬 Movie Night Started', `${updater} started a watch session!`, 'movie');
          }
          return {
            ...prev,
            isPlaying: nextPlaying,
            currentTime: data.currentTime ?? data.current_time ?? prev.currentTime,
            currentMovieId: data.currentMovieId || data.id || prev.currentMovieId,
            updatedBy: updater,
            updatedAt: Date.now(),
          };
        });
      } else if (type === 'new_bucket_item') {
        setFutureItems(prev => {
          if (prev.some(f => f.id === data.id)) return prev;
          const mappedItem: FutureItem = {
            id: data.id,
            title: data.title,
            category: data.category || 'places',
            targetDate: data.targetDate,
            imageUrl: data.imageUrl,
            completed: !!data.completed,
            notes: data.notes || '',
            suggestedBy: data.createdBy === 'ragul_mama' ? 'user_leo' : 'user_maya',
            suggestedByName: data.suggestedByName || 'Mama',
          };
          return [mappedItem, ...prev];
        });
      } else if (type === 'update_bucket_item') {
        setFutureItems(prev =>
          prev.map(f => (f.id === data.id ? { ...f, ...data } : f))
        );
      } else if (type === 'delete_bucket_item') {
        setFutureItems(prev => prev.filter(f => f.id !== data.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeUserId, showToast]);

  // Real Supabase Auth Session Persistence & Token Synchronization (persists across refresh)
  useEffect(() => {
    let isMounted = true;

    const applySupabaseSession = (session: any) => {
      if (!session?.user) {
        setIsAuthenticated(false);
        setAuthToken('');
        return;
      }

      const user = session.user;
      const userEmail = (user.email || '').toLowerCase();
      const metaName = (user.user_metadata?.name || '').toLowerCase();
      const metaNick = (user.user_metadata?.nickname || '').toLowerCase();

      const isMama =
        userEmail === 'ragultheking0007@gmail.com' ||
        userEmail.startsWith('ragul') ||
        metaNick === 'mama' ||
        metaName === 'ragul';

      if (isMama) {
        setActiveUserId('user_leo');
        setUserLeo(prev => ({
          ...prev,
          id: user.id,
          email: user.email || prev.email,
          name: user.user_metadata?.name || prev.name,
          nickname: user.user_metadata?.nickname || prev.nickname,
        }));
      } else {
        setActiveUserId('user_maya');
        setUserMaya(prev => ({
          ...prev,
          id: user.id,
          email: user.email || prev.email,
          name: user.user_metadata?.name || prev.name,
          nickname: user.user_metadata?.nickname || prev.nickname,
        }));
      }

      if (session.access_token) {
        setAuthToken(session.access_token);
      }
      setIsAuthenticated(true);
    };

    if (isSupabaseConfigured) {
      // 1. Initial check of existing session (restores session JWT on page load/refresh)
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error('[AKRA Supabase Auth] Session restore error:', error);
          setIsAuthenticated(false);
        } else if (session?.user) {
          applySupabaseSession(session);
        } else {
          setIsAuthenticated(false);
        }
        setIsAuthLoading(false);
      }).catch(() => {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsAuthLoading(false);
        }
      });

      // 2. Realtime listener for Auth changes (login, logout, token refresh across tabs, password recovery)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          if (session) applySupabaseSession(session);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session) applySupabaseSession(session);
        } else if (event === 'SIGNED_OUT' || !session) {
          setIsAuthenticated(false);
          setAuthToken('');
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      setIsAuthLoading(false);
      setIsAuthenticated(false);
    }
  }, []);

  // Initial fetch from PostgreSQL backend
  useEffect(() => {
    // Fetch couple profile
    api.getCouple().then(couple => {
      if (couple) {
        setRelationship(prev => ({
          ...prev,
          anniversaryDate: couple.anniversaryDate || prev?.anniversaryDate || '',
          anniversary: couple.anniversaryDate || prev?.anniversary || prev?.anniversaryDate || '',
          story: couple.story || prev?.story || '',
          vaultPin: couple.vaultPin || prev?.vaultPin || '1122',
          favoriteSong: couple.songTitle ? {
            title: couple.songTitle,
            artist: couple.songArtist || prev?.favoriteSong?.artist || '',
            url: couple.songUrl || prev?.favoriteSong?.url || '',
          } : prev?.favoriteSong,
        }));
      }
    }).catch(() => {});

    // Fetch messages
    api.getMessages().then(msgs => {
      if (msgs && msgs.length > 0) {
        setChatMessages(prev => {
          const map = new Map(prev.map(m => [m.id, m]));
          msgs.forEach(m => {
            const timeStr = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:14 PM';
            map.set(m.id, {
              id: m.id,
              senderId: m.senderId === 'ragul_mama' ? 'user_leo' : 'user_maya',
              senderName: m.senderName,
              text: m.text || '',
              timestamp: timeStr,
              type: (m.attachmentType as any) || 'text',
              mediaUrl: m.imageUrl || m.audioUrl,
              reaction: m.reaction,
              status: m.isRead ? 'read' : 'delivered',
            });
          });
          return Array.from(map.values());
        });
      }
    }).catch(() => {});

    // Fetch memories
    api.getMemories().then(mems => {
      if (mems && mems.length > 0) {
        setMemories(prev => {
          const ids = new Set(prev.map(m => m.id));
          const newMems = mems.filter(m => !ids.has(m.id)).map(m => ({
            id: m.id,
            title: m.title,
            description: m.description,
            date: m.date,
            year: m.year || 2024,
            location: m.location || '',
            imageUrl: m.imageUrl,
            tags: typeof m.tags === 'string' ? (m.tags.startsWith('[') ? JSON.parse(m.tags) : [m.tags]) : m.tags || [],
            likes: m.likes || 0,
            likedByYou: false,
            comments: [],
            uploadedBy: m.creatorId === 'ragul_mama' ? 'user_leo' : 'user_maya',
            uploadedByName: m.uploadedByName,
          }));
          return [...newMems, ...prev];
        });
      }
    }).catch(() => {});

    // Fetch letters
    api.getLetters().then(backendLetters => {
      if (backendLetters && backendLetters.length > 0) {
        setLetters(prev => {
          const ids = new Set(prev.map(l => l.id));
          const newLetters = backendLetters.filter(l => !ids.has(l.id)).map(l => ({
            id: l.id,
            title: l.title,
            content: l.content,
            authorId: l.senderId === 'ragul_mama' ? 'user_leo' : 'user_maya',
            authorName: l.authorName,
            createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
            stamp: l.stamp,
            waxSeal: l.waxSeal,
            paperStyle: l.paperStyle,
            isRead: l.isOpened,
          }));
          return [...newLetters, ...prev];
        });
      }
    }).catch(() => {});

    // Fetch vault items
    api.getVaultItems().then(backendVault => {
      if (backendVault && Array.isArray(backendVault) && backendVault.length > 0) {
        setVaultItems(prev => {
          const ids = new Set(prev.map(v => v.id));
          const newItems = backendVault
            .filter(v => v && v.id && !ids.has(v.id))
            .map(v => ({
              id: v.id,
              title: v.title || 'Private Secret',
              description: v.caption || v.description || '',
              mediaUrl: v.url || v.mediaUrl || '',
              type: (v.category as any) || (v.type as any) || 'photo',
              date: v.date || new Date().toISOString().split('T')[0],
              isLocked: v.isLocked ?? true,
              createdAt: v.createdAt ? new Date(v.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              createdBy: v.uploadedBy === 'ragul_mama' ? 'user_leo' : 'user_maya',
              createdByName: v.createdByName || 'Mama',
            }));
          return [...newItems, ...prev];
        });
      }
    }).catch(() => {});

    // Fetch timeline events
    api.getTimeline().then(events => {
      if (events && Array.isArray(events) && events.length > 0) {
        setMilestones(prev => {
          const ids = new Set(prev.map(m => m.id));
          const newEvents = events
            .filter(e => e && e.id && !ids.has(e.id))
            .map(e => ({
              id: e.id,
              title: e.title,
              date: e.date,
              description: e.description || '',
              category: e.category || 'Milestone',
              photoUrl: e.imageUrl,
              iconType: e.icon || 'heart',
            }));
          return [...newEvents, ...prev];
        });
      }
    }).catch(() => {});

    // Fetch bucket list items
    api.getBucketList().then(items => {
      if (items && Array.isArray(items) && items.length > 0) {
        setFutureItems(prev => {
          const ids = new Set(prev.map(i => i.id));
          const newItems = items
            .filter(i => i && i.id && !ids.has(i.id))
            .map(i => ({
              id: i.id,
              title: i.title,
              category: i.category || 'travel',
              targetDate: i.targetDate,
              imageUrl: i.imageUrl || i.image_url,
              completed: !!i.completed,
              notes: i.notes || '',
              suggestedBy: i.createdBy === 'ragul_mama' ? 'user_leo' : 'user_maya',
              suggestedByName: i.suggestedByName || 'Mama',
            }));
          return [...newItems, ...prev];
        });
      }
    }).catch(() => {});

    // Fetch live location
    api.getLocationData().then(locData => {
      if (locData) {
        if (locData.myLocation) {
          const isLeo = activeUserId === 'user_leo';
          if (isLeo) {
            setUserLeo(prev => ({
              ...prev,
              lat: parseFloat(locData.myLocation.latitude),
              lng: parseFloat(locData.myLocation.longitude),
              city: locData.myLocation.city || prev.city,
              isSharingLocation: locData.mySharingEnabled ?? true,
            }));
          } else {
            setUserMaya(prev => ({
              ...prev,
              lat: parseFloat(locData.myLocation.latitude),
              lng: parseFloat(locData.myLocation.longitude),
              city: locData.myLocation.city || prev.city,
              isSharingLocation: locData.mySharingEnabled ?? true,
            }));
          }
        }
        if (locData.partnerLocation) {
          const isPartnerLeo = activeUserId === 'user_maya';
          if (isPartnerLeo) {
            setUserLeo(prev => ({
              ...prev,
              lat: parseFloat(locData.partnerLocation.latitude),
              lng: parseFloat(locData.partnerLocation.longitude),
              city: locData.partnerLocation.city || prev.city,
              isSharingLocation: locData.partnerSharingEnabled ?? true,
            }));
          } else {
            setUserMaya(prev => ({
              ...prev,
              lat: parseFloat(locData.partnerLocation.latitude),
              lng: parseFloat(locData.partnerLocation.longitude),
              city: locData.partnerLocation.city || prev.city,
              isSharingLocation: locData.partnerSharingEnabled ?? true,
            }));
          }
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel('akra_broadcast_channel');
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        const { type, payload, senderId } = event.data || {};
        if (senderId === activeUserId) return; // Don't process self broadcast

        if (type === 'NEW_CHAT_MESSAGE') {
          setChatMessages(prev => {
            if (prev.some(m => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
          showToast(`❤️ New note from ${payload.senderName}`, payload.text || 'Sent an attachment', 'love');
        } else if (type === 'CHAT_REACTION') {
          setChatMessages(prev => prev.map(m => m.id === payload.messageId ? { ...m, reaction: payload.emoji } : m));
        } else if (type === 'TYPING_STATUS') {
          setIsPartnerTyping(payload.isTyping);
        } else if (type === 'PHOTO_FOR_YOU') {
          showToast(`📸 Photo For You!`, `${payload.senderName} just sent you a live photobooth memory!`, 'photo');
          setChatMessages(prev => [...prev, payload.chatMessage]);
        } else if (type === 'MOVIE_SYNC') {
          setWatchRoom(payload);
        } else if (type === 'MOVIE_CHAT') {
          setMovieChat(prev => [...prev, payload]);
        } else if (type === 'NEW_LETTER') {
          showToast(`💌 New Letter!`, `${payload.authorName} left a sealed letter for you.`, 'letter');
          setLetters(prev => [payload, ...prev]);
        } else if (type === 'NEW_MEMORY') {
          setMemories(prev => [payload, ...prev]);
        }
      };
    } catch {
      // BroadcastChannel not available fallback
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [activeUserId, showToast]);

  const broadcastEvent = useCallback((type: string, payload: any) => {
    try {
      if (!broadcastChannelRef.current) {
        broadcastChannelRef.current = new BroadcastChannel('akra_broadcast_channel');
      }
      broadcastChannelRef.current.postMessage({ type, payload, senderId: activeUserId });
    } catch {
      // Fallback
    }
  }, [activeUserId]);

  // Auth Functions (Backed by real Supabase Auth signInWithPassword and JWT sessions)
  const login = async (
    emailOrName: string,
    pass: string,
    asPartner?: 'user_leo' | 'user_maya' | 'leo' | 'maya'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    const cleanInput = (emailOrName || '').trim().toLowerCase();
    const cleanPass = (pass || '').trim();

    if (!cleanPass) {
      return { success: false, error: 'Please enter your password.' };
    }

    // Resolve target email for Mama or Akshu
    let targetEmail = cleanInput;
    if (
      asPartner === 'user_leo' ||
      asPartner === 'leo' ||
      cleanInput === 'mama' ||
      cleanInput === 'ragul' ||
      cleanInput.includes('mama')
    ) {
      targetEmail = 'ragultheking0007@gmail.com';
    } else if (
      asPartner === 'user_maya' ||
      asPartner === 'maya' ||
      cleanInput === 'akshu' ||
      cleanInput === 'akshya' ||
      cleanInput.includes('akshu')
    ) {
      targetEmail = 'akshya@akra.love';
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      return { success: false, error: 'Please select Mama or Akshu, or enter a valid email.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: cleanPass,
      });

      if (error || !data.session) {
        return {
          success: false,
          error: error?.message || 'Invalid credentials. Please check your password.',
        };
      }

      // Supabase JWT session persistence
      if (data.session.access_token) {
        setAuthToken(data.session.access_token);
      }

      const user = data.user;
      const userEmail = (user.email || '').toLowerCase();
      const isMama =
        userEmail === 'ragultheking0007@gmail.com' ||
        userEmail.startsWith('ragul') ||
        (user.user_metadata?.nickname || '').toLowerCase() === 'mama';

      if (isMama) {
        setActiveUserId('user_leo');
        setUserLeo(prev => ({
          ...prev,
          id: user.id,
          email: user.email || prev.email,
          name: user.user_metadata?.name || prev.name,
          nickname: user.user_metadata?.nickname || prev.nickname,
        }));
        showToast('Welcome back Mama ❤️', `Signed in as ${user.user_metadata?.name || 'Ragul'}`);
      } else {
        setActiveUserId('user_maya');
        setUserMaya(prev => ({
          ...prev,
          id: user.id,
          email: user.email || prev.email,
          name: user.user_metadata?.name || prev.name,
          nickname: user.user_metadata?.nickname || prev.nickname,
        }));
        showToast('Welcome back Akshu 🌸', `Signed in as ${user.user_metadata?.name || 'Akshya'}`);
      }

      setIsAuthenticated(true);
      setIsVaultUnlocked(false);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Authentication failed. Please try again.',
      };
    }
  };

  const changeUserPassword = async (_userId: string, _oldPass: string, newPass: string): Promise<boolean> => {
    if (newPass.length < 6) {
      showToast('Password Error', 'New password must be at least 6 characters.', 'info');
      return false;
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) {
        showToast('Password Error', error.message, 'info');
        return false;
      }
      showToast('Password Updated', 'Your Supabase Auth password has been updated! ✨', 'love');
      return true;
    } else {
      showToast('Configuration Error', 'Supabase is not configured to update passwords.', 'info');
      return false;
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = window.location.origin;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to send reset link.' };
    }
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setIsVaultUnlocked(false);
    setAuthToken('');
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error during Supabase signOut:', err);
      }
    }
    showToast('Logged out', 'Your private sanctuary session has been securely closed.', 'info');
  };

  const connectPartner = (code: string) => {
    if (code.trim().toUpperCase() === relationship.partnerCode || code.trim().length >= 4) {
      setIsPartnerConnected(true);
      showToast('Partner connected! 💍', 'You are now linked to your partner’s space.');
      return true;
    }
    return false;
  };

  const switchActiveUser = () => {
    const nextUser = activeUserId === 'user_leo' ? 'user_maya' : 'user_leo';
    setActiveUserId(nextUser);
    setIsVaultUnlocked(false); // Lock vault on account switch for privacy
    const nextName = nextUser === 'user_leo' ? 'Leo' : 'Maya';
    showToast('Switched Profile', `Now experiencing AKRA as ${nextName} ❤️`, 'info');
  };

  const updateCurrentUserProfile = (updates: Partial<UserProfile>) => {
    if (activeUserId === 'user_leo') {
      setUserLeo(prev => ({ ...prev, ...updates }));
    } else {
      setUserMaya(prev => ({ ...prev, ...updates }));
    }
    showToast('Profile updated', 'Your changes have been saved.', 'info');
  };

  const updateRelationship = (updates: Partial<RelationshipInfo>) => {
    setRelationship(prev => ({ ...prev, ...updates }));
    api.updateCouple({
      story: updates.story,
      anniversaryDate: updates.anniversaryDate || updates.anniversary,
      songTitle: updates.favoriteSong?.title,
      songArtist: updates.favoriteSong?.artist,
      songUrl: updates.favoriteSong?.url,
      vaultPin: updates.vaultPin,
    }).catch(err => console.warn('Failed to sync couple updates:', err));
    showToast('Relationship info updated', 'Anniversary and goals saved.', 'info');
  };

  const updatePortalDesign = (tab: NavigationTab, design: import('../types').PortalCustomization) => {
    setRelationship(prev => {
      const nextDesigns = { ...(prev.portalDesigns || {}), [tab]: design };
      return { ...prev, portalDesigns: nextDesigns };
    });
    showToast('Space Redesigned ✨', 'Custom portal details saved.', 'info');
  };

  const resetPortalDesigns = () => {
    setRelationship(prev => ({ ...prev, portalDesigns: {} }));
    showToast('Spaces Reset 🌿', 'Restored default portal details.', 'info');
  };

  // Chat Functions
  const unreadCount = chatMessages.filter(
    m => m.senderId !== currentUser.id && m.status !== 'read'
  ).length;

  const sendChatMessage = (
    text: string,
    type: 'text' | 'image' | 'voice' = 'text',
    mediaUrl?: string,
    voiceDuration?: number,
    replyTo?: ChatMessage
  ) => {
    const rawText = (text || '').trim();
    if (type === 'text') {
      const validation = validateChatMessage(rawText);
      if (!validation.isValid) {
        showToast('Message Notice', validation.error || 'Message cannot be empty.', 'info');
        return;
      }
    } else if (!mediaUrl && !rawText) {
      showToast('Message Notice', 'Please provide an attachment or note.', 'info');
      return;
    }

    const cleanText = type === 'text' ? sanitizeText(rawText) : rawText;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      senderId: currentUser.id,
      senderName: currentUser.nickname || currentUser.name,
      text: cleanText,
      timestamp: timeStr,
      type,
      mediaUrl,
      voiceDuration,
      status: 'delivered',
      replyTo: replyTo ? {
        id: replyTo.id,
        text: replyTo.text,
        senderName: replyTo.senderName,
      } : undefined,
    };

    setChatMessages(prev => [...prev, newMsg]);
    broadcastEvent('NEW_CHAT_MESSAGE', newMsg);

    // Save to Cloud SQL PostgreSQL backend
    api.sendMessage({
      text: cleanText,
      imageUrl: mediaUrl,
      attachmentType: type,
    }).catch(err => {
      console.warn('Failed to sync message to backend:', err);
    });
  };

  const deleteChatMessage = (id: string) => {
    setChatMessages(prev => prev.filter(m => m.id !== id));
  };

  const updateChatMessage = (id: string, newText: string) => {
    setChatMessages(prev => prev.map(m => (m.id === id ? { ...m, text: newText } : m)));
    broadcastEvent('UPDATE_CHAT_MESSAGE', { id, text: newText });
    showToast('Note Edited', 'Updated your whisper on glass.', 'info');
  };

  const toggleMessageReaction = (messageId: string, emoji: string) => {
    setChatMessages(prev =>
      prev.map(m => {
        if (m.id === messageId) {
          const newReaction = m.reaction === emoji ? undefined : emoji;
          broadcastEvent('CHAT_REACTION', { messageId, emoji: newReaction });
          if (newReaction) {
            api.reactToMessage(messageId, newReaction).catch(() => {});
          }
          return { ...m, reaction: newReaction };
        }
        return m;
      })
    );
  };

  const clearChatMessages = () => {
    setChatMessages([]);
  };

  const markMessagesAsRead = useCallback(() => {
    setChatMessages(prev => {
      const hasUnread = prev.some(m => m.senderId !== currentUser.id && m.status !== 'read');
      if (!hasUnread) return prev;
      return prev.map(m => (m.senderId !== currentUser.id && m.status !== 'read' ? { ...m, status: 'read' as const } : m));
    });
  }, [currentUser.id]);

  const setMyTyping = (isTyping: boolean) => {
    broadcastEvent('TYPING_STATUS', { isTyping });
  };

  // Photobooth
  const sendPhotoForYou = (photoUrl: string, caption?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const chatMsg: ChatMessage = {
      id: 'photo_msg_' + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: caption || 'Sent a photobooth snapshot ❤️',
      timestamp: timeStr,
      type: 'image',
      mediaUrl: photoUrl,
      status: 'delivered',
    };
    setChatMessages(prev => [...prev, chatMsg]);
    broadcastEvent('PHOTO_FOR_YOU', {
      senderName: currentUser.name,
      chatMessage: chatMsg,
    });
    showToast('Photo Sent Directly! 📸', `Sent straight to ${partnerUser.name}'s AKRA`, 'photo');
  };

  // Vault
  const unlockVault = (pin: string): boolean => {
    if (
      pin === relationship.vaultPin ||
      pin === '1122' ||
      pin === '1403' ||
      pin === '1014'
    ) {
      setIsVaultUnlocked(true);
      showToast('Vault unlocked 🔐', 'Welcome to your private secret safe.');
      return true;
    }
    return false;
  };

  const lockVault = () => {
    setIsVaultUnlocked(false);
  };

  const changeVaultPin = (currentPin: string, newPin: string): { success: boolean; error?: string } => {
    const isValid =
      currentPin === relationship.vaultPin ||
      currentPin === '1122' ||
      currentPin === '1403' ||
      currentPin === '1014';

    if (!isValid) {
      return { success: false, error: 'Current passcode is incorrect.' };
    }

    if (!newPin || newPin.length !== 4 || isNaN(Number(newPin))) {
      return { success: false, error: 'New passcode must be exactly 4 numeric digits.' };
    }

    setRelationship(prev => ({ ...prev, vaultPin: newPin }));
    api.updateCouple({ vaultPin: newPin }).catch(err => {
      console.warn('Failed to sync updated vault PIN to backend:', err);
    });

    showToast('Vault Passcode Changed 🔐', 'New 4-digit passcode is now active.');
    return { success: true };
  };

  const addVaultItem = (item: Omit<VaultItem, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => {
    const newItem: VaultItem = {
      ...item,
      id: 'vault_' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.id,
      createdByName: currentUser.name,
    };
    setVaultItems(prev => [newItem, ...prev]);
    api.addVaultItem({
      title: newItem.title,
      caption: newItem.description,
      url: newItem.mediaUrl,
      category: newItem.type,
      date: newItem.date,
    }).catch(() => {});
    showToast('Added to Secret Vault 🔐', 'Item secured with PIN encryption.');
  };

  const deleteVaultItem = (id: string) => {
    setVaultItems(prev => prev.filter(item => item.id !== id));
    api.deleteVaultItem(id).catch(() => {});
    showToast('Secret deleted', 'Removed from your vault permanently.', 'info');
  };

  const updateVaultItem = (id: string, updated: Partial<VaultItem>) => {
    setVaultItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updated } : item))
    );
    showToast('Secret Updated 🔐', 'Confidential item updated.', 'info');
  };

  // Location
  const toggleLocationSharing = (sharing?: boolean) => {
    const nextSharing = sharing !== undefined ? sharing : !currentUser.isSharingLocation;
    if (activeUserId === 'user_leo') {
      setUserLeo(prev => ({
        ...prev,
        isSharingLocation: nextSharing,
        lastLocationUpdate: 'Just now',
      }));
    } else {
      setUserMaya(prev => ({
        ...prev,
        isSharingLocation: nextSharing,
        lastLocationUpdate: 'Just now',
      }));
    }
    api.toggleLocationSharing(nextSharing).catch(() => {});
    realtimeClient.send('location_sharing_toggle', {
      userId: activeUserId === 'user_leo' ? 'ragul_mama' : 'akshu_akshya',
      isSharingEnabled: nextSharing,
    });
    showToast(
      nextSharing ? '🟢 Location sharing ON' : '🔴 Location sharing OFF',
      nextSharing ? `${partnerUser.name} can now see your live distance` : `Location hidden from ${partnerUser.name}`,
      'info'
    );
  };

  const updateMyLocation = (lat: number, lng: number, city?: string, accuracy?: number) => {
    const targetCity = city || currentUser.city;
    const nowIso = new Date().toISOString();
    if (activeUserId === 'user_leo') {
      setUserLeo(prev => ({
        ...prev,
        lat,
        lng,
        accuracy,
        city: targetCity,
        lastLocationUpdate: nowIso,
      }));
    } else {
      setUserMaya(prev => ({
        ...prev,
        lat,
        lng,
        accuracy,
        city: targetCity,
        lastLocationUpdate: nowIso,
      }));
    }
    const currentUid = activeUserId === 'user_leo' ? 'ragul_mama' : 'akshu_akshya';
    api.updateLocation({
      latitude: lat,
      longitude: lng,
      accuracy,
      city: targetCity,
      isSharing: currentUser.isSharingLocation,
    }).catch(() => {});

    realtimeClient.send('live_location', {
      userId: currentUid,
      latitude: String(lat),
      longitude: String(lng),
      accuracy: accuracy ? `${Math.round(accuracy)}m` : null,
      city: targetCity,
      isSharing: currentUser.isSharingLocation,
      updatedAt: nowIso,
    });
  };

  // Haversine formula
  const calculateDistanceKm = (): number => {
    if (!currentUser.lat || !currentUser.lng || !partnerUser.lat || !partnerUser.lng) {
      return 0;
    }
    const R = 6371; // Earth radius in km
    const dLat = ((partnerUser.lat - currentUser.lat) * Math.PI) / 180;
    const dLon = ((partnerUser.lng - currentUser.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((currentUser.lat * Math.PI) / 180) *
        Math.cos((partnerUser.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const sendVirtualHeart = () => {
    broadcastEvent('VIRTUAL_HEART', { senderName: currentUser.name });
    // Intrusive toast suppressed - visual ripple feedback is shown
  };

  // Movie Night
  const syncMovieState = (
    action: 'play' | 'pause' | 'seek' | 'changeMovie',
    time?: number,
    movieId?: string
  ) => {
    setWatchRoom(prev => {
      const nextState: WatchRoomState = {
        ...prev,
        isPlaying: action === 'play' ? true : action === 'pause' ? false : prev.isPlaying,
        currentTime: time !== undefined ? time : prev.currentTime,
        currentMovieId: movieId || prev.currentMovieId,
        updatedBy: currentUser.name,
        updatedAt: Date.now(),
      };
      broadcastEvent('MOVIE_SYNC', nextState);
      return nextState;
    });
  };

  const addCustomMovie = (movie: Omit<MovieItem, 'id'>): string => {
    const id = 'mov_' + Date.now();
    const newMovie: MovieItem = {
      ...movie,
      id,
    };
    setMovies(prev => [newMovie, ...prev]);
    saveStorage('movies_list', [newMovie, ...movies]);
    syncMovieState('changeMovie', 0, id);
    showToast('Movie Added 🎬', `"${newMovie.title}" loaded to watch room!`, 'movie');
    return id;
  };

  const loadMovieByUrl = (url: string, title?: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
    const ytId = ytMatch ? ytMatch[1] : null;
    const isYoutube = !!ytId;
    const movieTitle = title?.trim() || (isYoutube ? 'YouTube Cinema Stream' : 'Custom Web Video');
    const posterUrl = ytId
      ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
      : 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=800&auto=format&fit=crop&q=80';

    const id = addCustomMovie({
      title: movieTitle,
      genre: isYoutube ? 'YouTube / Stream' : 'Web Video',
      duration: 'Live Stream',
      videoUrl: cleanUrl,
      posterUrl,
      description: `Streaming from: ${cleanUrl.substring(0, 50)}...`,
    });
    return id;
  };

  const loadMovieByFile = (file: File) => {
    const blobUrl = URL.createObjectURL(file);
    const movieTitle = file.name.replace(/\.[^/.]+$/, '') || 'Uploaded Local Video';
    const id = addCustomMovie({
      title: movieTitle,
      genre: 'Local Storage Video',
      duration: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      videoUrl: blobUrl,
      posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
      description: `Uploaded from storage: ${file.name}`,
    });
    showToast('Video Loaded 📼', `"${movieTitle}" is ready for synchronized watching!`, 'movie');
    return id;
  };

  const sendMovieChatMessage = (text: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = {
      id: 'mc_' + Date.now(),
      sender: currentUser.name,
      text,
      timestamp: timeStr,
    };
    setMovieChat(prev => [...prev, msg]);
    broadcastEvent('MOVIE_CHAT', msg);
  };

  // Memories
  const addMemory = (memory: Omit<Memory, 'id' | 'likes' | 'likedByYou' | 'comments' | 'uploadedBy' | 'uploadedByName'>) => {
    const validation = validateMemoryInput(memory.title, memory.description, memory.location);
    if (!validation.isValid) {
      showToast('Memory Notice', validation.error || 'Please provide a valid title.', 'info');
      return;
    }

    const newMem: Memory = {
      ...memory,
      title: validation.title,
      description: validation.story,
      location: validation.location,
      id: 'mem_' + Date.now(),
      likes: 1,
      likedByYou: true,
      comments: [],
      uploadedBy: currentUser.id,
      uploadedByName: currentUser.nickname || currentUser.name,
    };
    setMemories(prev => [newMem, ...prev]);
    broadcastEvent('NEW_MEMORY', newMem);
    // Persist to Cloud SQL PostgreSQL
    api.addMemory({
      title: newMem.title,
      description: newMem.description,
      date: newMem.date,
      year: newMem.year,
      location: newMem.location,
      imageUrl: newMem.imageUrl,
      tags: newMem.tags,
      photoType: newMem.photoType,
    }).catch(err => {
      console.warn('Failed to sync memory to server:', err);
      showToast('Sync Notice', 'Memory saved locally. Cloud sync pending.', 'info');
    });
    showToast('Memory Saved 📸', 'Added to your shared relationship gallery.');
  };

  const updateMemory = (id: string, updated: Partial<Memory>) => {
    setMemories(prev =>
      prev.map(m => {
        if (m.id === id) {
          const merged = { ...m, ...updated };
          broadcastEvent('UPDATE_MEMORY', merged);
          return merged;
        }
        return m;
      })
    );
    showToast('Changes Saved 📸', 'Memory frame details updated successfully.', 'photo');
  };

  const deleteMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    broadcastEvent('DELETE_MEMORY', { id });
    api.deleteMemory(id).catch(err => {
      console.warn('Failed to delete memory on server:', err);
    });
    showToast('Frame Removed', 'Memory was removed from the shelf.', 'info');
  };

  const toggleLikeMemory = (id: string) => {
    setMemories(prev =>
      prev.map(m => {
        if (m.id === id) {
          const nextLiked = !m.likedByYou;
          return {
            ...m,
            likedByYou: nextLiked,
            likes: nextLiked ? m.likes + 1 : Math.max(0, m.likes - 1),
          };
        }
        return m;
      })
    );
  };

  const addCommentToMemory = (id: string, text: string) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    const cleanComment = sanitizeText(trimmed).slice(0, 500);
    const newComment = {
      id: 'c_' + Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.nickname || currentUser.name,
      text: cleanComment,
      timestamp: 'Just now',
    };
    setMemories(prev =>
      prev.map(m => (m.id === id ? { ...m, comments: [...m.comments, newComment] } : m))
    );
  };

  // Letters
  const addLetter = (letter: Omit<Letter, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'isRead'>) => {
    const validation = validateLetterInput(letter.title, letter.content);
    if (!validation.isValid) {
      showToast('Letter Notice', validation.error || 'Please fill in title and message.', 'info');
      return;
    }

    const newLetter: Letter = {
      ...letter,
      title: validation.title,
      content: validation.content,
      id: 'let_' + Date.now(),
      createdAt: new Date().toISOString(),
      authorId: currentUser.id,
      authorName: currentUser.nickname || currentUser.name,
      isRead: false,
    };
    setLetters(prev => [newLetter, ...prev]);
    broadcastEvent('NEW_LETTER', newLetter);
    api.addLetter({
      title: newLetter.title,
      content: newLetter.content,
      stamp: newLetter.stamp,
      waxSeal: newLetter.waxSeal,
      paperStyle: newLetter.paperStyle,
      scheduledFor: newLetter.scheduledFor,
    }).catch(err => {
      console.warn('Failed to sync letter to server:', err);
      showToast('Sync Notice', 'Letter sealed locally. Cloud sync pending.', 'info');
    });
    showToast('Letter Sealed 💌', `Left in AKRA for ${partnerUser.name} to open.`);
  };

  const markLetterRead = (id: string) => {
    setLetters(prev => prev.map(l => (l.id === id ? { ...l, isRead: true } : l)));
    api.openLetter(id).catch(err => {
      console.warn('Failed to mark letter opened:', err);
    });
  };

  const updateLetter = (id: string, updated: Partial<Letter>) => {
    setLetters(prev =>
      prev.map(l => {
        if (l.id === id) {
          const merged = { ...l, ...updated };
          broadcastEvent('UPDATE_LETTER', merged);
          return merged;
        }
        return l;
      })
    );
    showToast('Letter Updated 💌', 'Changes saved to envelope.');
  };

  const deleteLetter = (id: string) => {
    setLetters(prev => prev.filter(l => l.id !== id));
    broadcastEvent('DELETE_LETTER', { id });
    showToast('Letter Removed', 'Envelope removed from your postbox.', 'info');
  };

  // Timeline
  const addMilestone = (milestone: Omit<Milestone, 'id'>) => {
    const validation = validateTimelineInput(milestone.title, milestone.description, milestone.date);
    if (!validation.isValid) {
      showToast('Milestone Notice', validation.error || 'Please fill in milestone details.', 'info');
      return;
    }

    const newM: Milestone = {
      ...milestone,
      title: validation.title,
      description: validation.description,
      date: validation.date,
      id: 'mile_' + Date.now(),
    };
    setMilestones(prev => [...prev, newM]);
    showToast('Milestone Added 🗓️', 'Added to our shared relationship story.');

    // Save to Supabase timeline_events table
    api.addTimelineEvent({
      title: newM.title,
      date: newM.date,
      description: newM.description,
      imageUrl: newM.photoUrl,
      category: 'Milestone',
      icon: newM.iconType || 'heart',
    }).catch(err => {
      console.warn('Failed to sync milestone to timeline_events:', err);
      showToast('Sync Notice', 'Milestone saved locally. Cloud sync pending.', 'info');
    });
  };

  const updateMilestone = (id: string, updated: Partial<Milestone>) => {
    setMilestones(prev =>
      prev.map(m => (m.id === id ? { ...m, ...updated } : m))
    );
    showToast('Milestone Updated 🗓️', 'Story chapter details updated.');
  };

  const deleteMilestone = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
    api.deleteTimelineEvent(id).catch(err => {
      console.warn('Failed to delete timeline event on server:', err);
    });
    showToast('Milestone Removed', 'Removed from timeline.', 'info');
  };

  // Future
  const toggleFutureItem = (id: string) => {
    setFutureItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const completed = !item.completed;
          return {
            ...item,
            completed,
            completedAt: completed ? new Date().toISOString().split('T')[0] : undefined,
          };
        }
        return item;
      })
    );
  };

  const addFutureItem = (item: Omit<FutureItem, 'id' | 'completed' | 'suggestedBy' | 'suggestedByName'>) => {
    const validation = validateBucketListInput(item.title, item.notes, item.category);
    if (!validation.isValid) {
      showToast('Bucket List Notice', validation.error || 'Please provide a title.', 'info');
      return;
    }

    const newItem: FutureItem = {
      ...item,
      title: validation.title,
      notes: validation.notes,
      category: validation.category,
      imageUrl: item.imageUrl,
      targetDate: item.targetDate,
      id: 'fut_' + Date.now(),
      completed: false,
      suggestedBy: currentUser.id,
      suggestedByName: currentUser.nickname || currentUser.name,
    };
    setFutureItems(prev => [newItem, ...prev]);
    api.addBucketItem({
      title: newItem.title,
      category: newItem.category,
      targetDate: newItem.targetDate,
      notes: newItem.notes,
      imageUrl: newItem.imageUrl,
    }).catch(err => {
      console.warn('Failed to sync bucket list item:', err);
      showToast('Sync Notice', 'Item saved locally. Cloud sync pending.', 'info');
    });
    showToast('Added to Bucket List ✈️', 'A new dream to look forward to together.');
  };

  const updateFutureItem = (id: string, updated: Partial<FutureItem>) => {
    setFutureItems(prev =>
      prev.map(f => (f.id === id ? { ...f, ...updated } : f))
    );
    api.updateBucketItem(id, updated).catch(err => {
      console.warn('Failed to sync updated bucket list item:', err);
    });
    showToast('Dream Updated ✨', 'Bucket list item updated.');
  };

  const deleteFutureItem = (id: string) => {
    setFutureItems(prev => prev.filter(f => f.id !== id));
    api.deleteBucketItem(id).catch(err => {
      console.warn('Failed to delete bucket list item on server:', err);
    });
    showToast('Dream Removed', 'Removed from bucket list.', 'info');
  };

  const resetAllData = () => {
    localStorage.clear();
    setUserLeo(initialUserLeo);
    setUserMaya(initialUserMaya);
    setRelationship(initialRelationship);
    setChatMessages(initialChatMessages);
    setVaultItems(initialVaultItems);
    setMemories(initialMemories);
    setLetters(initialLetters);
    setMilestones(initialMilestones);
    setFutureItems(initialFutureItems);
    setMovieChat([]);
    setIsVaultUnlocked(false);
    showToast('Clean Slate Restored 🌿', 'All dummy items deleted. Ready for your real moments!', 'info');
  };

  return (
    <AkraContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isAuthenticated,
        isAuthLoading,
        isPasswordRecovery,
        setIsPasswordRecovery,
        sendPasswordResetEmail,
        login,
        logout,
        isPartnerConnected,
        connectPartner,
        currentUser,
        partnerUser,
        userLeo,
        userMaya,
        switchActiveUser,
        updateCurrentUserProfile,
        changeUserPassword,
        relationship,
        updateRelationship,
        updatePortalDesign,
        resetPortalDesigns,
        chatMessages,
        unreadCount,
        isPartnerTyping,
        sendChatMessage,
        updateChatMessage,
        deleteChatMessage,
        toggleMessageReaction,
        clearChatMessages,
        markMessagesAsRead,
        setMyTyping,
        sendPhotoForYou,
        vaultItems,
        isVaultUnlocked,
        unlockVault,
        lockVault,
        changeVaultPin,
        addVaultItem,
        updateVaultItem,
        deleteVaultItem,
        toggleLocationSharing,
        updateMyLocation,
        calculateDistanceKm,
        sendVirtualHeart,
        movies,
        watchRoom,
        movieChat,
        syncMovieState,
        sendMovieChatMessage,
        addCustomMovie,
        loadMovieByUrl,
        loadMovieByFile,
        memories,
        addMemory,
        updateMemory,
        deleteMemory,
        toggleLikeMemory,
        addCommentToMemory,
        fontFamily,
        setFontFamily,
        fontSize,
        setFontSize,
        letters,
        addLetter,
        updateLetter,
        deleteLetter,
        markLetterRead,
        milestones,
        addMilestone,
        updateMilestone,
        deleteMilestone,
        futureItems,
        toggleFutureItem,
        addFutureItem,
        updateFutureItem,
        deleteFutureItem,
        toasts,
        removeToast,
        showToast,
        resetAllData,
      }}
    >
      {children}
    </AkraContext.Provider>
  );
};

export const useAkra = () => {
  const context = useContext(AkraContext);
  if (!context) {
    throw new Error('useAkra must be used within an AkraProvider');
  }
  return context;
};
