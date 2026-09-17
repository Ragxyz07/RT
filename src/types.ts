export type NavigationTab = 
  | 'home' 
  | 'chat' 
  | 'photobooth' 
  | 'vault' 
  | 'location' 
  | 'movie-night' 
  | 'memories' 
  | 'letters' 
  | 'timeline' 
  | 'future' 
  | 'settings';

export interface UserProfile {
  id: string;
  name: string;
  nickname: string;
  email: string;
  avatar: string;
  role: 'you' | 'partner';
  city: string;
  country: string;
  lat: number;
  lng: number;
  accuracy?: number;
  isSharingLocation: boolean;
  lastLocationUpdate: string;
  isOnline: boolean;
  lastSeen: string;
  statusMessage?: string;
  bio?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  type: 'text' | 'image' | 'voice';
  mediaUrl?: string;
  voiceDuration?: number;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  status: 'sent' | 'delivered' | 'read';
  readAt?: string;
  reaction?: string;
}

export interface VaultItem {
  id: string;
  title: string;
  description?: string;
  type: 'photo' | 'video' | 'note';
  url?: string;
  mediaUrl?: string;
  noteContent?: string;
  createdAt?: string;
  date?: string;
  isLocked?: boolean;
  permission?: 'only_me' | 'only_partner' | 'both';
  createdBy?: string;
  createdByName?: string;
}

export interface MemoryComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: string;
}

export interface Memory {
  id: string;
  title: string;
  year?: number;
  date: string;
  imageUrl: string;
  caption: string;
  description?: string;
  location?: string;
  author?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  likes: number;
  likedByYou: boolean;
  comments: MemoryComment[];
  tags?: string[];
  photoType?: 'single' | '4cut' | 'polaroid' | 'film' | 'gif' | string;
  coupleId?: string;
}

export type FontChoice = 'playfair' | 'jakarta' | 'lora' | 'cormorant';
export type FontSizeChoice = 'normal' | 'large' | 'extra-large';

export interface Letter {
  id: string;
  title: string;
  content: string;
  category?: 'normal' | 'miss_you' | 'sad' | 'anniversary' | 'birthday' | 'scheduled' | 'cant_sleep' | 'stressed' | 'lonely' | 'argument' | 'just_because' | string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
  date?: string;
  sender?: string;
  recipient?: string;
  unlockDate?: string; // ISO date string if scheduled
  waxSealColor?: string;
  stamp?: string;
  waxSeal?: string;
  paperStyle?: string;
  scheduledFor?: string;
  isRead?: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  description: string;
  icon?: string;
  iconType?: string;
  photoUrl?: string;
  location?: string;
  song?: string;
  category?: string;
  addedBy?: string;
}

export interface FutureItem {
  id: string;
  title: string;
  category: 'places' | 'experiences' | 'movies' | 'restaurants' | 'dreams' | 'Travel' | 'Home' | 'Retreat' | 'Life' | string;
  completed: boolean;
  completedAt?: string;
  targetDate?: string;
  imageUrl?: string;
  suggestedBy?: string;
  suggestedByName?: string;
  notes?: string;
}

export interface MovieItem {
  id: string;
  title: string;
  genre: string;
  duration: string;
  videoUrl: string;
  posterUrl: string;
  description: string;
}

export interface WatchRoomState {
  currentMovieId: string;
  isPlaying: boolean;
  currentTime: number;
  updatedBy: string;
  updatedAt: number;
  partnerWatching: boolean;
}

export interface PortalCustomization {
  title?: string;
  subtitle?: string;
  colorTheme?: 'rose' | 'mocha' | 'gold' | 'emerald' | 'lavender';
  badgeText?: string;
}

export interface RelationshipInfo {
  anniversaryDate: string; // ISO date string
  anniversary?: string;
  story?: string;
  partnerCode: string;
  nextMeetingDate: string;
  nextMeetingTitle: string;
  nextMeetingLocation: string;
  vaultPin: string;
  portalDesigns?: Record<string, PortalCustomization>;
  favoriteSong?: {
    title: string;
    artist?: string;
    url?: string;
  };
}
