import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Unique identifier (e.g. 'ragul_mama' or Firebase UID)
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  nickname: text('nickname').notNull(),
  avatar: text('avatar'),
  city: text('city').notNull(), // 'Puducherry' or 'Bangalore'
  bio: text('bio'),
  partnerId: text('partner_id'),
  isOnline: boolean('is_online').default(false),
  lastSeen: timestamp('last_seen').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Couples Table
export const couples = pgTable('couples', {
  id: text('id').primaryKey(), // 'couple_akra_1'
  name: text('name').notNull().default('AKRA'),
  partnerCode: text('partner_code').notNull().default('AKRA-2024'),
  anniversaryDate: text('anniversary_date').notNull().default('2023-11-14'),
  startDate: text('start_date').notNull().default('2022-04-18'),
  story: text('story'),
  songTitle: text('song_title').default('golden hour'),
  songArtist: text('song_artist').default('JVKE'),
  songUrl: text('song_url'),
  vaultPin: text('vault_pin').notNull().default('1403'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Couple Members Table
export const coupleMembers = pgTable('couple_members', {
  id: serial('id').primaryKey(),
  coupleId: text('couple_id').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  role: text('role').default('partner'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Messages Table
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  coupleId: text('couple_id').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull(),
  senderName: text('sender_name').notNull(),
  text: text('text'),
  imageUrl: text('image_url'),
  attachmentType: text('attachment_type').default('none'), // 'none' | 'image' | 'voice' | 'location'
  audioUrl: text('audio_url'),
  reaction: text('reaction'),
  isRead: boolean('is_read').default(false),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Media Table
export const media = pgTable('media', {
  id: text('id').primaryKey(),
  coupleId: text('couple_id').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  uploadedBy: text('uploaded_by').notNull(),
  storagePath: text('storage_path').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size'),
  url: text('url').notNull(),
  caption: text('caption'),
  category: text('category').default('gallery'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Vault Items Table
export const vaultItems = pgTable('vault_items', {
  id: text('id').primaryKey(),
  coupleId: text('couple_id').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  uploadedBy: text('uploaded_by').notNull(),
  createdByName: text('created_by_name').notNull(),
  storagePath: text('storage_path'),
  url: text('url').notNull(),
  title: text('title').notNull(),
  caption: text('caption'),
  category: text('category').default('general'),
  isLocked: boolean('is_locked').default(true),
  date: text('date'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Memories Table
export const memories = pgTable('memories', {
  id: text('id').primaryKey(),
  coupleId: text('couple_id').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  creatorId: text('creator_id').notNull(),
  uploadedByName: text('uploaded_by_name').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  date: text('date').notNull(),
  year: integer('year'),
  location: text('location'),
  imageUrl: text('image_url').notNull(),
  tags: text('tags'), // JSON string array
  photoType: text('photo_type').default('digital'),
  likes: integer('likes').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Letters Table
export const letters = pgTable('letters', {
  id: text('id').primaryKey(),
  coupleId: text('couple_id').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull(),
  authorName: text('author_name').notNull(),
  recipientId: text('recipient_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  stamp: text('stamp').default('rose'),
  waxSeal: text('wax_seal').default('heart'),
  paperStyle: text('paper_style').default('vintage'),
  scheduledFor: text('scheduled_for'),
  isSent: boolean('is_sent').default(true),
  isOpened: boolean('is_opened').default(false),
  openedAt: timestamp('opened_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. Timeline Events Table
export const timelineEvents = pgTable('timeline_events', {
  id: text('id').primaryKey(),
  coupleId: text('couple_id').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull(),
  title: text('title').notNull(),
  date: text('date').notNull(),
  description: text('description'),
  category: text('category').default('Milestone'),
  imageUrl: text('image_url'),
  location: text('location'),
  icon: text('icon').default('heart'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Bucket List Items Table
export const bucketListItems = pgTable('bucket_list_items', {
  id: text('id').primaryKey(),
  coupleId: text('couple_id').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull(),
  suggestedByName: text('suggested_by_name').notNull(),
  title: text('title').notNull(),
  category: text('category').default('travel'),
  targetDate: text('target_date'),
  completed: boolean('completed').default(false),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. Locations Table (live coordinates per user)
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  accuracy: text('accuracy'),
  address: text('address'),
  city: text('city').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 12. Location Sharing Settings
export const locationSharingSettings = pgTable('location_sharing_settings', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  isSharingEnabled: boolean('is_sharing_enabled').default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 13. Movie Sessions Table
export const movieSessions = pgTable('movie_sessions', {
  id: text('id').primaryKey(), // coupleId
  coupleId: text('couple_id').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  videoUrl: text('video_url'),
  videoTitle: text('video_title'),
  isPlaying: boolean('is_playing').default(false),
  currentTime: text('current_time').default('0'),
  hostId: text('host_id'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 14. Notifications Table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info'),
  link: text('link'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 15. Sessions / Tokens Table
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const couplesRelations = relations(couples, ({ many, one }) => ({
  members: many(coupleMembers),
  messages: many(messages),
  media: many(media),
  vaultItems: many(vaultItems),
  memories: many(memories),
  letters: many(letters),
  timelineEvents: many(timelineEvents),
  bucketListItems: many(bucketListItems),
  movieSession: one(movieSessions, {
    fields: [couples.id],
    references: [movieSessions.coupleId],
  }),
}));
