import { UserProfile, RelationshipInfo, ChatMessage, VaultItem, Memory, Letter, Milestone, FutureItem, MovieItem } from '../types';

export const initialUserLeo: UserProfile = {
  id: 'user_leo',
  name: 'Ragul',
  nickname: 'Mama',
  email: 'ragultheking0007@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80',
  role: 'you',
  city: 'Puducherry',
  country: 'India',
  lat: 11.9416,
  lng: 79.8083,
  isSharingLocation: true,
  lastLocationUpdate: 'Just now',
  isOnline: true,
  lastSeen: 'Active now',
  statusMessage: 'Watching the dusk ocean, thinking of my Akshu',
};

export const initialUserMaya: UserProfile = {
  id: 'user_maya',
  name: 'Akshya',
  nickname: 'Akshu',
  email: 'akshya@akra.love',
  avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80',
  role: 'partner',
  city: 'Bangalore',
  country: 'India',
  lat: 12.9716,
  lng: 77.5946,
  isSharingLocation: true,
  lastLocationUpdate: '2 minutes ago',
  isOnline: true,
  lastSeen: 'Active now',
  statusMessage: 'Rainy Bangalore breeze & holding you in my heart',
};

// Relationship started Dec 20, 2024
export const initialRelationship: RelationshipInfo = {
  anniversaryDate: '2024-12-20T00:00:00.000Z',
  partnerCode: 'AKRA-LOVE-779',
  nextMeetingDate: '2026-09-21T18:00:00.000Z',
  nextMeetingTitle: 'Reunion on Puducherry Promenade Beach',
  nextMeetingLocation: 'Rock Beach Promenade, Puducherry',
  vaultPin: '1122',
  story: 'From Puducherry to Bangalore, connected by an unbreakable thread.',
  favoriteSong: {
    title: 'golden hour',
    artist: 'JVKE',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-moment-112193.mp3',
  },
};

export const initialChatMessages: ChatMessage[] = [];

export const initialVaultItems: VaultItem[] = [];

export const initialMemories: Memory[] = [];

export const initialLetters: Letter[] = [];

export const initialMilestones: Milestone[] = [];

export const initialFutureItems: FutureItem[] = [];

export const initialMovies: MovieItem[] = [
  {
    id: 'mov_1',
    title: 'Before Sunrise',
    genre: 'Cinema Romance',
    duration: '1h 41m',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    description: 'Two travelers meet on a train and wander through the evening streets of Vienna.',
  },
  {
    id: 'mov_2',
    title: 'Sunset over the Seine & Starlit Bridges',
    genre: 'Ambient Atmosphere',
    duration: '14:20',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80',
    description: 'A soothing evening cruise down the glowing waters of Paris under romantic amber streetlamps.',
  },
  {
    id: 'mov_3',
    title: 'Cozy Rain & Fireplace in the Highlands',
    genre: 'Ambient Atmosphere',
    duration: '22:45',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80',
    description: 'Gentle raindrops tapping against window panes with soft crackling wood and warm golden light.',
  },
];
