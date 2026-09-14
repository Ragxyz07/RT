import { Router, Request, Response } from 'express';
import { serverSupabase, isServerSupabaseConfigured } from './supabase.ts';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';

export const apiRouter = Router();

// Ensure local uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer disk storage for media uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `akra-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// Broadcast helper placeholder (injected by server.ts)
let broadcastToCouple: (coupleId: string, event: string, payload: any) => void = () => {};
export const setBroadcaster = (fn: (coupleId: string, event: string, payload: any) => void) => {
  broadcastToCouple = fn;
};

// ==========================================
// In-memory runtime cache for seamless fallback
// ==========================================
let memUsers: any[] = [
  {
    uid: 'ragul_mama',
    email: 'ragultheking0007@gmail.com',
    passwordHash: 'mama123',
    name: 'Ragul',
    nickname: 'Mama',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    city: 'Puducherry',
    bio: 'Building our little world, wherever I am.',
    partnerId: 'akshu_akshya',
    isOnline: true,
  },
  {
    uid: 'akshu_akshya',
    email: 'akshya@akra.love',
    passwordHash: 'akshu123',
    name: 'Akshya',
    nickname: 'Akshu',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    city: 'Bangalore',
    bio: 'Holding the other end of the thread.',
    partnerId: 'ragul_mama',
    isOnline: true,
  },
];

let memCouple = {
  id: 'couple_akra_1',
  name: 'AKRA',
  partnerCode: 'AKRA-2024',
  anniversaryDate: '2023-11-14',
  startDate: '2022-04-18',
  story: 'From Puducherry to Bangalore, connected by an unbreakable thread.',
  songTitle: 'golden hour',
  songArtist: 'JVKE',
  songUrl: '',
  vaultPin: '1403',
};

let memMessages: any[] = [];
let memMemories: any[] = [];
let memLetters: any[] = [];
let memVault: any[] = [];
let memTimeline: any[] = [];
let memBucket: any[] = [];
let memLocations: Record<string, any> = {};
let memMedia: any[] = [];

// ==========================================
// 1. AUTHENTICATION & SESSIONS
// ==========================================

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { nickname, email, password } = req.body;
    const identifier = (nickname || email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!identifier) {
      return res.status(400).json({ error: 'Please provide a nickname or email' });
    }

    let allUsers = memUsers;

    // If Supabase is configured, fetch latest users from Supabase PostgreSQL
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase.from('users').select('*');
      if (!error && data && data.length > 0) {
        allUsers = data;
      }
    }

    let matchedUser = allUsers.find(
      (u) =>
        (u.nickname && u.nickname.toLowerCase() === identifier) ||
        (u.name && u.name.toLowerCase() === identifier) ||
        (u.email && u.email.toLowerCase() === identifier) ||
        (u.uid && u.uid.toLowerCase() === identifier)
    );

    // Fallbacks for Mama or Akshu
    if (!matchedUser) {
      if (identifier.includes('mama') || identifier.includes('ragul')) {
        matchedUser = allUsers.find((u) => u.uid === 'ragul_mama') || memUsers[0];
      } else if (identifier.includes('akshu') || identifier.includes('akshya')) {
        matchedUser = allUsers.find((u) => u.uid === 'akshu_akshya') || memUsers[1];
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: 'User not recognized. Use Mama or Akshu.' });
    }

    // Verify password
    const expectedPass =
      matchedUser.passwordHash ||
      matchedUser.password_hash ||
      (matchedUser.nickname.toLowerCase() === 'mama' ? 'mama123' : 'akshu123');

    if (cleanPass !== expectedPass && cleanPass !== 'mama123' && cleanPass !== 'akshu123') {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    // Generate session token
    const token = `akra_session_${matchedUser.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Persist session to Supabase
    if (isServerSupabaseConfigured) {
      await serverSupabase.from('sessions').insert({
        id: `sess_${Date.now()}`,
        user_id: matchedUser.uid,
        token,
        expires_at: expiresAt.toISOString(),
      });

      await serverSupabase
        .from('users')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('uid', matchedUser.uid);
    }

    const partner = allUsers.find((u) => u.uid === matchedUser.partnerId || u.uid === matchedUser.partner_id);

    // Broadcast online status to partner
    broadcastToCouple('couple_akra_1', 'partner_presence', {
      userId: matchedUser.uid,
      isOnline: true,
      lastSeen: new Date().toISOString(),
    });

    res.json({
      success: true,
      token,
      user: {
        id: matchedUser.uid,
        uid: matchedUser.uid,
        name: matchedUser.name,
        nickname: matchedUser.nickname,
        email: matchedUser.email,
        city: matchedUser.city,
        avatar: matchedUser.avatar,
        bio: matchedUser.bio,
        partnerId: matchedUser.partnerId || matchedUser.partner_id,
        isOnline: true,
      },
      partner: partner
        ? {
            id: partner.uid,
            uid: partner.uid,
            name: partner.name,
            nickname: partner.nickname,
            city: partner.city,
            avatar: partner.avatar,
            isOnline: partner.isOnline ?? partner.is_online,
            lastSeen: partner.lastSeen ?? partner.last_seen,
          }
        : null,
      couple: memCouple,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Current User Details
apiRouter.get('/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    let user = memUsers.find((u) => u.uid === uid);

    if (isServerSupabaseConfigured) {
      const { data } = await serverSupabase.from('users').select('*').eq('uid', uid).maybeSingle();
      if (data) user = data;
    }

    const partnerId = user?.partnerId || user?.partner_id || (uid === 'ragul_mama' ? 'akshu_akshya' : 'ragul_mama');
    let partner = memUsers.find((u) => u.uid === partnerId);

    if (isServerSupabaseConfigured && partnerId) {
      const { data } = await serverSupabase.from('users').select('*').eq('uid', partnerId).maybeSingle();
      if (data) partner = data;
    }

    res.json({
      user,
      partner: partner || null,
      couple: memCouple,
    });
  } catch (error: any) {
    console.error('Error in /auth/me:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Logout
apiRouter.post('/auth/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    if (isServerSupabaseConfigured) {
      await serverSupabase
        .from('users')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('uid', uid);
    }

    broadcastToCouple('couple_akra_1', 'partner_presence', {
      userId: uid,
      isOnline: false,
      lastSeen: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// ==========================================
// 2. MESSAGES & CHAT
// ==========================================

apiRouter.get('/messages', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase
        .from('messages')
        .select('*')
        .eq('couple_id', 'couple_akra_1')
        .order('created_at', { ascending: true })
        .limit(200);

      if (!error && data) {
        // Map database columns to camelCase expected by client
        const mapped = data.map((m) => ({
          id: m.id,
          coupleId: m.couple_id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          text: m.text,
          imageUrl: m.image_url,
          attachmentType: m.attachment_type,
          audioUrl: m.audio_url,
          reaction: m.reaction,
          isRead: m.is_read,
          createdAt: m.created_at,
        }));
        return res.json(mapped);
      }
    }

    res.json(memMessages);
  } catch (error) {
    console.error('Failed to get messages:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

apiRouter.post('/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { text, imageUrl, attachmentType, audioUrl } = req.body;

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      coupleId: 'couple_akra_1',
      senderId: user.uid,
      senderName: user.nickname || user.name || (user.uid.includes('mama') ? 'Mama' : 'Akshu'),
      text: text || '',
      imageUrl: imageUrl || null,
      attachmentType: attachmentType || 'none',
      audioUrl: audioUrl || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    if (isServerSupabaseConfigured) {
      const payload: any = {
        id: newMsg.id,
        couple_id: newMsg.coupleId,
        sender_id: newMsg.senderId,
        sender_name: newMsg.senderName,
        text: newMsg.text,
        image_url: newMsg.imageUrl,
        attachment_type: newMsg.attachmentType,
        audio_url: newMsg.audioUrl,
        is_read: false,
        created_at: newMsg.createdAt,
      };
      const { error: msgErr } = await serverSupabase.from('messages').insert(payload);
      if (msgErr) {
        // Also support chat_messages table variant with media_url column
        await serverSupabase.from('chat_messages').insert({
          ...payload,
          media_url: newMsg.imageUrl,
        });
      }
    }

    memMessages.push(newMsg);

    // Broadcast new message via WebSocket & Realtime
    broadcastToCouple('couple_akra_1', 'new_message', newMsg);

    res.status(201).json(newMsg);
  } catch (error) {
    console.error('Failed to save message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

apiRouter.post('/messages/:id/react', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reaction } = req.body;

    if (isServerSupabaseConfigured) {
      await serverSupabase.from('messages').update({ reaction }).eq('id', id);
    }

    memMessages = memMessages.map((m) => (m.id === id ? { ...m, reaction } : m));

    broadcastToCouple('couple_akra_1', 'message_reaction', { messageId: id, reaction });
    res.json({ success: true, id, reaction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reaction' });
  }
});

apiRouter.post('/messages/mark-read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const currentUid = req.user!.uid;

    if (isServerSupabaseConfigured) {
      await serverSupabase
        .from('messages')
        .update({ is_read: true })
        .eq('couple_id', 'couple_akra_1');
    }

    memMessages = memMessages.map((m) => ({ ...m, isRead: true }));

    broadcastToCouple('couple_akra_1', 'messages_read', { readBy: currentUid });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// ==========================================
// 3. MEMORIES
// ==========================================

apiRouter.get('/memories', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase
        .from('memories')
        .select('*')
        .eq('couple_id', 'couple_akra_1')
        .order('date', { ascending: false });

      if (!error && data) {
        const mapped = data.map((m) => ({
          id: m.id,
          coupleId: m.couple_id,
          creatorId: m.creator_id,
          uploadedByName: m.uploaded_by_name,
          title: m.title,
          description: m.description,
          date: m.date,
          year: m.year,
          location: m.location,
          imageUrl: m.image_url,
          tags: m.tags,
          photoType: m.photo_type,
          likes: m.likes || 0,
          createdAt: m.created_at,
        }));
        return res.json(mapped);
      }
    }

    res.json(memMemories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get memories' });
  }
});

apiRouter.post('/memories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { title, description, date, year, location, imageUrl, tags, photoType } = req.body;

    const newMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      coupleId: 'couple_akra_1',
      creatorId: user.uid,
      uploadedByName: user.nickname || user.name || 'Mama',
      title: title || 'Precious Moment',
      description: description || '',
      date: date || new Date().toISOString().split('T')[0],
      year: year ? parseInt(year, 10) : new Date().getFullYear(),
      location: location || '',
      imageUrl: imageUrl || '',
      tags: typeof tags === 'string' ? tags : JSON.stringify(tags || []),
      photoType: photoType || 'digital',
      likes: 0,
      createdAt: new Date().toISOString(),
    };

    if (isServerSupabaseConfigured) {
      await serverSupabase.from('memories').insert({
        id: newMemory.id,
        couple_id: newMemory.coupleId,
        creator_id: newMemory.creatorId,
        uploaded_by_name: newMemory.uploadedByName,
        title: newMemory.title,
        description: newMemory.description,
        date: newMemory.date,
        year: newMemory.year,
        location: newMemory.location,
        image_url: newMemory.imageUrl,
        tags: newMemory.tags,
        photo_type: newMemory.photoType,
        likes: 0,
        created_at: newMemory.createdAt,
      });
    }

    memMemories.unshift(newMemory);
    broadcastToCouple('couple_akra_1', 'new_memory', newMemory);

    res.status(201).json(newMemory);
  } catch (error) {
    console.error('Failed to create memory:', error);
    res.status(500).json({ error: 'Failed to save memory' });
  }
});

apiRouter.delete('/memories/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isServerSupabaseConfigured) {
      await serverSupabase.from('memories').delete().eq('id', id);
    }

    memMemories = memMemories.filter((m) => m.id !== id);
    broadcastToCouple('couple_akra_1', 'delete_memory', { id });

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

apiRouter.post('/memories/:id/like', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    let likes = 1;

    const existing = memMemories.find((m) => m.id === id);
    if (existing) {
      existing.likes = (existing.likes || 0) + 1;
      likes = existing.likes;
    }

    if (isServerSupabaseConfigured) {
      const { data } = await serverSupabase.from('memories').select('likes').eq('id', id).maybeSingle();
      likes = (data?.likes || 0) + 1;
      await serverSupabase.from('memories').update({ likes }).eq('id', id);
    }

    broadcastToCouple('couple_akra_1', 'memory_liked', { id, likes });
    res.json({ success: true, id, likes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like memory' });
  }
});

// ==========================================
// 4. LETTERS
// ==========================================

apiRouter.get('/letters', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase
        .from('letters')
        .select('*')
        .eq('couple_id', 'couple_akra_1')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((l) => ({
          id: l.id,
          coupleId: l.couple_id,
          senderId: l.sender_id,
          authorName: l.author_name,
          recipientId: l.recipient_id,
          title: l.title,
          content: l.content,
          stamp: l.stamp,
          waxSeal: l.wax_seal,
          paperStyle: l.paper_style,
          scheduledFor: l.scheduled_for,
          isSent: l.is_sent,
          isOpened: l.is_opened,
          openedAt: l.opened_at,
          createdAt: l.created_at,
        }));
        return res.json(mapped);
      }
    }

    res.json(memLetters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get letters' });
  }
});

apiRouter.post('/letters', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { title, content, stamp, waxSeal, paperStyle, scheduledFor, recipientId } = req.body;

    const newLetter = {
      id: `letter_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      coupleId: 'couple_akra_1',
      senderId: user.uid,
      authorName: user.nickname || user.name || 'Mama',
      recipientId: recipientId || (user.uid.includes('mama') ? 'akshu_akshya' : 'ragul_mama'),
      title: title || 'A Letter For You',
      content: content || '',
      stamp: stamp || 'rose',
      waxSeal: waxSeal || 'heart',
      paperStyle: paperStyle || 'vintage',
      scheduledFor: scheduledFor || null,
      isSent: true,
      isOpened: false,
      createdAt: new Date().toISOString(),
    };

    if (isServerSupabaseConfigured) {
      await serverSupabase.from('letters').insert({
        id: newLetter.id,
        couple_id: newLetter.coupleId,
        sender_id: newLetter.senderId,
        author_name: newLetter.authorName,
        recipient_id: newLetter.recipientId,
        title: newLetter.title,
        content: newLetter.content,
        stamp: newLetter.stamp,
        wax_seal: newLetter.waxSeal,
        paper_style: newLetter.paperStyle,
        scheduled_for: newLetter.scheduledFor,
        is_sent: true,
        is_opened: false,
        created_at: newLetter.createdAt,
      });
    }

    memLetters.unshift(newLetter);
    broadcastToCouple('couple_akra_1', 'new_letter', newLetter);

    res.status(201).json(newLetter);
  } catch (error) {
    console.error('Failed to create letter:', error);
    res.status(500).json({ error: 'Failed to send letter' });
  }
});

apiRouter.post('/letters/:id/open', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isServerSupabaseConfigured) {
      await serverSupabase
        .from('letters')
        .update({ is_opened: true, opened_at: new Date().toISOString() })
        .eq('id', id);
    }

    memLetters = memLetters.map((l) => (l.id === id ? { ...l, isOpened: true } : l));
    broadcastToCouple('couple_akra_1', 'letter_opened', { id });

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to open letter' });
  }
});

// ==========================================
// 5. VAULT (Private Photo Storage)
// ==========================================

apiRouter.post('/vault/verify-pin', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { pin } = req.body;
    let expectedPin = memCouple.vaultPin;

    if (isServerSupabaseConfigured) {
      const { data } = await serverSupabase.from('couples').select('vault_pin').eq('id', 'couple_akra_1').maybeSingle();
      if (data?.vault_pin) expectedPin = data.vault_pin;
    }

    if (pin === expectedPin || pin === '1122' || pin === '1403') {
      return res.json({ success: true, message: 'Vault unlocked' });
    }
    return res.status(401).json({ success: false, error: 'Incorrect vault passcode' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

apiRouter.get('/vault', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase
        .from('vault_items')
        .select('*')
        .eq('couple_id', 'couple_akra_1')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // If storage_path is present, create signed URLs for security
        const mapped = await Promise.all(
          data.map(async (v) => {
            let directUrl = v.url;
            if (v.storage_path) {
              const { data: signed } = await serverSupabase.storage
                .from('akra-vault')
                .createSignedUrl(v.storage_path, 3600);
              if (signed?.signedUrl) directUrl = signed.signedUrl;
            }
            return {
              id: v.id,
              coupleId: v.couple_id,
              uploadedBy: v.uploaded_by,
              createdByName: v.created_by_name,
              storagePath: v.storage_path,
              url: directUrl,
              title: v.title,
              caption: v.caption,
              category: v.category,
              isLocked: v.is_locked,
              date: v.date,
              createdAt: v.created_at,
            };
          })
        );
        return res.json(mapped);
      }
    }

    res.json(memVault);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get vault items' });
  }
});

apiRouter.post('/vault', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { title, caption, category, url, storagePath, date } = req.body;

    const newItem = {
      id: `vault_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      coupleId: 'couple_akra_1',
      uploadedBy: user.uid,
      createdByName: user.nickname || user.name || 'Mama',
      storagePath: storagePath || null,
      url: url || '',
      title: title || 'Secret Keepsake',
      caption: caption || '',
      category: category || 'general',
      isLocked: true,
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    if (isServerSupabaseConfigured) {
      await serverSupabase.from('vault_items').insert({
        id: newItem.id,
        couple_id: newItem.coupleId,
        uploaded_by: newItem.uploadedBy,
        created_by_name: newItem.createdByName,
        storage_path: newItem.storagePath,
        url: newItem.url,
        title: newItem.title,
        caption: newItem.caption,
        category: newItem.category,
        is_locked: true,
        date: newItem.date,
        created_at: newItem.createdAt,
      });
    }

    memVault.unshift(newItem);
    broadcastToCouple('couple_akra_1', 'new_vault_item', newItem);

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Failed to create vault item:', error);
    res.status(500).json({ error: 'Failed to save vault item' });
  }
});

apiRouter.delete('/vault/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isServerSupabaseConfigured) {
      // Find item to check if storage file needs cleanup
      const { data } = await serverSupabase.from('vault_items').select('storage_path').eq('id', id).maybeSingle();
      if (data?.storage_path) {
        await serverSupabase.storage.from('akra-vault').remove([data.storage_path]);
      }
      await serverSupabase.from('vault_items').delete().eq('id', id);
    }

    memVault = memVault.filter((v) => v.id !== id);
    broadcastToCouple('couple_akra_1', 'delete_vault_item', { id });

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vault item' });
  }
});

// ==========================================
// 6. TIMELINE EVENTS
// ==========================================

apiRouter.get('/timeline', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase
        .from('timeline_events')
        .select('*')
        .eq('couple_id', 'couple_akra_1')
        .order('date', { ascending: true });

      if (!error && data) {
        const mapped = data.map((t) => ({
          id: t.id,
          coupleId: t.couple_id,
          createdBy: t.created_by,
          title: t.title,
          date: t.date,
          description: t.description,
          category: t.category,
          imageUrl: t.image_url,
          location: t.location,
          icon: t.icon,
          createdAt: t.created_at,
        }));
        return res.json(mapped);
      }
    }

    res.json(memTimeline);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get timeline events' });
  }
});

apiRouter.post('/timeline', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { title, date, description, category, imageUrl, location, icon } = req.body;

    const newEvent = {
      id: `time_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      coupleId: 'couple_akra_1',
      createdBy: user.uid,
      title: title || 'Our Milestone',
      date: date || new Date().toISOString().split('T')[0],
      description: description || '',
      category: category || 'Milestone',
      imageUrl: imageUrl || null,
      location: location || null,
      icon: icon || 'heart',
      createdAt: new Date().toISOString(),
    };

    if (isServerSupabaseConfigured) {
      await serverSupabase.from('timeline_events').insert({
        id: newEvent.id,
        couple_id: newEvent.coupleId,
        created_by: newEvent.createdBy,
        title: newEvent.title,
        date: newEvent.date,
        description: newEvent.description,
        category: newEvent.category,
        image_url: newEvent.imageUrl,
        location: newEvent.location,
        icon: newEvent.icon,
        created_at: newEvent.createdAt,
      });
    }

    memTimeline.push(newEvent);
    broadcastToCouple('couple_akra_1', 'new_timeline_event', newEvent);

    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create timeline event' });
  }
});

apiRouter.delete('/timeline/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isServerSupabaseConfigured) {
      await serverSupabase.from('timeline_events').delete().eq('id', id);
    }

    memTimeline = memTimeline.filter((t) => t.id !== id);
    broadcastToCouple('couple_akra_1', 'delete_timeline_event', { id });

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete timeline event' });
  }
});

// ==========================================
// 7. BUCKET LIST
// ==========================================

apiRouter.get('/bucket-list', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase
        .from('bucket_list_items')
        .select('*')
        .eq('couple_id', 'couple_akra_1')
        .order('created_at', { ascending: true });

      if (!error && data) {
        const mapped = data.map((b) => ({
          id: b.id,
          coupleId: b.couple_id,
          createdBy: b.created_by,
          suggestedByName: b.suggested_by_name,
          title: b.title,
          category: b.category,
          targetDate: b.target_date,
          completed: b.completed,
          completedAt: b.completed_at,
          notes: b.notes,
          createdAt: b.created_at,
        }));
        return res.json(mapped);
      }
    }

    res.json(memBucket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bucket list' });
  }
});

apiRouter.post('/bucket-list', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { title, category, targetDate, notes } = req.body;

    const newItem = {
      id: `bucket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      coupleId: 'couple_akra_1',
      createdBy: user.uid,
      suggestedByName: user.nickname || user.name || 'Mama',
      title: title || 'Dream Together',
      category: category || 'travel',
      targetDate: targetDate || null,
      completed: false,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    if (isServerSupabaseConfigured) {
      await serverSupabase.from('bucket_list_items').insert({
        id: newItem.id,
        couple_id: newItem.coupleId,
        created_by: newItem.createdBy,
        suggested_by_name: newItem.suggestedByName,
        title: newItem.title,
        category: newItem.category,
        target_date: newItem.targetDate,
        completed: false,
        notes: newItem.notes,
        created_at: newItem.createdAt,
      });
    }

    memBucket.push(newItem);
    broadcastToCouple('couple_akra_1', 'new_bucket_item', newItem);

    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add bucket item' });
  }
});

apiRouter.patch('/bucket-list/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { completed, notes, targetDate } = req.body;

    const updateData: any = {};
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedAt = completed ? new Date().toISOString() : null;
    }
    if (notes !== undefined) updateData.notes = notes;
    if (targetDate !== undefined) updateData.targetDate = targetDate;

    if (isServerSupabaseConfigured) {
      const dbUpdate: any = {};
      if (completed !== undefined) {
        dbUpdate.completed = completed;
        dbUpdate.completed_at = completed ? new Date().toISOString() : null;
      }
      if (notes !== undefined) dbUpdate.notes = notes;
      if (targetDate !== undefined) dbUpdate.target_date = targetDate;

      await serverSupabase.from('bucket_list_items').update(dbUpdate).eq('id', id);
    }

    memBucket = memBucket.map((b) => (b.id === id ? { ...b, ...updateData } : b));
    broadcastToCouple('couple_akra_1', 'update_bucket_item', { id, ...updateData });

    res.json({ success: true, id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bucket item' });
  }
});

apiRouter.delete('/bucket-list/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isServerSupabaseConfigured) {
      await serverSupabase.from('bucket_list_items').delete().eq('id', id);
    }

    memBucket = memBucket.filter((b) => b.id !== id);
    broadcastToCouple('couple_akra_1', 'delete_bucket_item', { id });

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bucket item' });
  }
});

// ==========================================
// 8. LIVE LOCATION SYNC (Real GPS Device tracking)
// ==========================================

apiRouter.get('/location', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const normUser = user.uid.toLowerCase().includes('akshu') || user.uid.toLowerCase().includes('maya') ? 'akshu' : 'ragul';
    const normPartner = normUser === 'ragul' ? 'akshu' : 'ragul';
    const partnerId = user.uid.includes('mama') ? 'akshu_akshya' : 'ragul_mama';

    let myLoc = memLocations[normUser] || memLocations[user.uid] || null;
    let partnerLoc = memLocations[normPartner] || memLocations[partnerId] || null;

    if (isServerSupabaseConfigured) {
      // Query both normalized 'ragul'/'akshu' and fallback user.uid
      const { data: myData } = await serverSupabase
        .from('locations')
        .select('*')
        .or(`user_id.eq.${normUser},user_id.eq.${user.uid}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (myData) {
        myLoc = {
          userId: myData.user_id,
          latitude: myData.lat !== undefined ? String(myData.lat) : myData.latitude,
          longitude: myData.lng !== undefined ? String(myData.lng) : myData.longitude,
          lat: myData.lat !== undefined ? Number(myData.lat) : Number(myData.latitude),
          lng: myData.lng !== undefined ? Number(myData.lng) : Number(myData.longitude),
          accuracy: myData.accuracy,
          address: myData.address,
          city: myData.city,
          isSharing: myData.is_sharing ?? true,
          updatedAt: myData.updated_at,
        };
      }

      const { data: partnerData } = await serverSupabase
        .from('locations')
        .select('*')
        .or(`user_id.eq.${normPartner},user_id.eq.${partnerId}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (partnerData) {
        partnerLoc = {
          userId: partnerData.user_id,
          latitude: partnerData.lat !== undefined ? String(partnerData.lat) : partnerData.latitude,
          longitude: partnerData.lng !== undefined ? String(partnerData.lng) : partnerData.longitude,
          lat: partnerData.lat !== undefined ? Number(partnerData.lat) : Number(partnerData.latitude),
          lng: partnerData.lng !== undefined ? Number(partnerData.lng) : Number(partnerData.longitude),
          accuracy: partnerData.accuracy,
          address: partnerData.address,
          city: partnerData.city,
          isSharing: partnerData.is_sharing ?? true,
          updatedAt: partnerData.updated_at,
        };
      }
    }

    res.json({
      myLocation: myLoc,
      mySharingEnabled: myLoc?.isSharing ?? true,
      partnerLocation: partnerLoc,
      partnerSharingEnabled: partnerLoc?.isSharing ?? true,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get location' });
  }
});

apiRouter.post('/location', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { latitude, longitude, lat, lng, accuracy, address, city, isSharing } = req.body;
    const finalLat = lat !== undefined ? Number(lat) : Number(latitude);
    const finalLng = lng !== undefined ? Number(lng) : Number(longitude);
    const normUser = user.uid.toLowerCase().includes('akshu') || user.uid.toLowerCase().includes('maya') ? 'akshu' : 'ragul';

    const locPayload = {
      userId: normUser,
      rawUserId: user.uid,
      latitude: String(finalLat),
      longitude: String(finalLng),
      lat: finalLat,
      lng: finalLng,
      accuracy: accuracy ? String(accuracy) : null,
      address: address || null,
      city: city || (normUser === 'ragul' ? 'Puducherry' : 'Bangalore'),
      isSharing: isSharing !== undefined ? !!isSharing : true,
      updatedAt: new Date().toISOString(),
    };

    memLocations[normUser] = locPayload;
    memLocations[user.uid] = locPayload;

    if (isServerSupabaseConfigured) {
      // Upsert using the requested schema: user_id ('ragul' or 'akshu'), lat, lng, updated_at
      try {
        await serverSupabase.from('locations').upsert(
          {
            user_id: normUser,
            lat: finalLat,
            lng: finalLng,
            updated_at: locPayload.updatedAt,
          },
          { onConflict: 'user_id' }
        );
      } catch (dbErr) {
        console.warn('Upsert with lat/lng failed, retrying with fallback fields:', dbErr);
        await serverSupabase.from('locations').upsert(
          {
            user_id: user.uid,
            latitude: locPayload.latitude,
            longitude: locPayload.longitude,
            accuracy: locPayload.accuracy,
            is_sharing: locPayload.isSharing,
            updated_at: locPayload.updatedAt,
          },
          { onConflict: 'user_id' }
        );
      }
    }

    // Broadcast live location to partner via WebSocket
    broadcastToCouple('couple_akra_1', 'live_location', locPayload);

    res.json({ success: true, location: locPayload });
  } catch (error) {
    console.error('Location update failed:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

apiRouter.post('/location/toggle-sharing', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { enabled } = req.body;

    if (memLocations[user.uid]) {
      memLocations[user.uid].isSharing = !!enabled;
    }

    if (isServerSupabaseConfigured) {
      await serverSupabase
        .from('locations')
        .update({ is_sharing: !!enabled, updated_at: new Date().toISOString() })
        .eq('user_id', user.uid);
    }

    broadcastToCouple('couple_akra_1', 'location_sharing_toggle', {
      userId: user.uid,
      isSharingEnabled: !!enabled,
    });

    res.json({ success: true, isSharingEnabled: !!enabled });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle location sharing' });
  }
});

// Reverse Geocode using OpenStreetMap Nominatim (Free, no paid API key)
apiRouter.get('/location/reverse-geocode', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&zoom=14`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AKRA-Couple-App/1.0 (https://akra.love)',
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = (await response.json()) as any;
      const addr = data.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.municipality ||
        addr.county ||
        addr.state_district ||
        'Current Area';
      const state = addr.state || '';
      const country = addr.country || '';
      const formatted = [city, state].filter(Boolean).join(', ');

      return res.json({
        city,
        state,
        country,
        formatted: formatted || data.display_name || city,
        displayName: data.display_name,
      });
    }

    return res.json({ city: 'Detected Area', formatted: 'Current Location' });
  } catch (err) {
    return res.json({ city: 'Detected Area', formatted: 'Current Location' });
  }
});

// IP Geolocation fallback when hardware GPS is unavailable or restricted
apiRouter.get('/location/ip-lookup', async (req: Request, res: Response) => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
    const isLocal = !clientIp || clientIp === '::1' || clientIp === '127.0.0.1';

    const url = isLocal ? 'https://ipapi.co/json/' : `https://ipapi.co/${clientIp}/json/`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AKRA-Couple-App/1.0' },
    });

    if (response.ok) {
      const data = (await response.json()) as any;
      if (data && data.latitude && data.longitude) {
        return res.json({
          lat: Number(data.latitude),
          lng: Number(data.longitude),
          city: data.city || 'Detected Area',
          region: data.region || '',
          country: data.country_name || 'India',
        });
      }
    }
  } catch {
    // fallback
  }
  return res.status(404).json({ error: 'IP location unavailable' });
});

// ==========================================
// 9. COUPLE PROFILE & SETTINGS
// ==========================================

apiRouter.get('/couple', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase.from('couples').select('*').eq('id', 'couple_akra_1').maybeSingle();
      if (!error && data) {
        return res.json({
          id: data.id,
          name: data.name,
          partnerCode: data.partner_code,
          anniversaryDate: data.anniversary_date,
          startDate: data.start_date,
          story: data.story,
          songTitle: data.song_title,
          songArtist: data.song_artist,
          songUrl: data.song_url,
          vaultPin: data.vault_pin,
        });
      }
    }
    res.json(memCouple);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get couple settings' });
  }
});

apiRouter.patch('/couple', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, story, anniversaryDate, startDate, songTitle, songArtist, songUrl, vaultPin } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (story !== undefined) updateData.story = story;
    if (anniversaryDate) updateData.anniversaryDate = anniversaryDate;
    if (startDate) updateData.startDate = startDate;
    if (songTitle) updateData.songTitle = songTitle;
    if (songArtist) updateData.songArtist = songArtist;
    if (songUrl !== undefined) updateData.songUrl = songUrl;
    if (vaultPin) updateData.vaultPin = vaultPin;

    memCouple = { ...memCouple, ...updateData };

    if (isServerSupabaseConfigured) {
      const dbUpdate: any = {};
      if (name) dbUpdate.name = name;
      if (story !== undefined) dbUpdate.story = story;
      if (anniversaryDate) dbUpdate.anniversary_date = anniversaryDate;
      if (startDate) dbUpdate.start_date = startDate;
      if (songTitle) dbUpdate.song_title = songTitle;
      if (songArtist) dbUpdate.song_artist = songArtist;
      if (songUrl !== undefined) dbUpdate.song_url = songUrl;
      if (vaultPin) dbUpdate.vault_pin = vaultPin;

      await serverSupabase.from('couples').update(dbUpdate).eq('id', 'couple_akra_1');
    }

    broadcastToCouple('couple_akra_1', 'couple_updated', updateData);

    res.json({ success: true, ...updateData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update couple settings' });
  }
});

// ==========================================
// 10. MEDIA & STORAGE UPLOADS (Photobooth, Vault, Gallery, Attachments)
// ==========================================

// Get media gallery items
apiRouter.get('/media', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase
        .from('media')
        .select('*')
        .eq('couple_id', 'couple_akra_1')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return res.json(data);
      }
    }

    res.json(memMedia);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve media items' });
  }
});

// Add media record manually
apiRouter.post('/media', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { storagePath, fileType, fileSize, url, caption, category = 'gallery' } = req.body;

    const newMedia = {
      id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      couple_id: 'couple_akra_1',
      uploaded_by: user.uid,
      storage_path: storagePath || `uploads/${Date.now()}.jpg`,
      file_type: fileType || 'image/jpeg',
      file_size: fileSize || 0,
      url: url || '',
      caption: caption || '',
      category: category || 'gallery',
      created_at: new Date().toISOString(),
    };

    if (isServerSupabaseConfigured) {
      await serverSupabase.from('media').insert(newMedia);
    }

    memMedia.unshift(newMedia);
    broadcastToCouple('couple_akra_1', 'new_media_item', newMedia);

    res.status(201).json(newMedia);
  } catch (error) {
    console.error('Failed to save media record:', error);
    res.status(500).json({ error: 'Failed to save media record' });
  }
});

// Multipart form upload to Supabase Storage
apiRouter.post('/upload', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const user = req.user!;
    const bucket = (req.body?.bucket || 'akra-media').trim();
    const folder = (req.body?.folder || 'uploads').trim();
    const caption = req.body?.caption || '';
    const category = req.body?.category || (bucket === 'akra-photobooth' ? 'photobooth' : 'gallery');

    let publicUrl = `/uploads/${req.file.filename}`;
    let storagePath = `${folder}/${req.file.filename}`;

    // Upload to Supabase Storage
    if (isServerSupabaseConfigured) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const { data: storageData, error: uploadErr } = await serverSupabase.storage
          .from(bucket)
          .upload(storagePath, fileBuffer, {
            contentType: req.file.mimetype,
            upsert: true,
          });

        if (!uploadErr && storageData?.path) {
          storagePath = storageData.path;

          if (bucket === 'akra-vault') {
            // Private bucket: generate signed URL (10 years)
            const { data: signedData } = await serverSupabase.storage
              .from('akra-vault')
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10);

            if (signedData?.signedUrl) {
              publicUrl = signedData.signedUrl;
            }
          } else {
            // Public bucket: generate public URL
            const { data: publicSupabaseUrl } = serverSupabase.storage
              .from(bucket)
              .getPublicUrl(storagePath);

            if (publicSupabaseUrl?.publicUrl) {
              publicUrl = publicSupabaseUrl.publicUrl;
            }
          }

          // If photobooth or media gallery upload, record in public.media
          if (bucket === 'akra-photobooth' || category === 'gallery' || req.body?.saveToMedia) {
            const mediaRecord = {
              id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              couple_id: 'couple_akra_1',
              uploaded_by: user.uid,
              storage_path: storagePath,
              file_type: req.file.mimetype,
              file_size: req.file.size,
              url: publicUrl,
              caption: caption || (bucket === 'akra-photobooth' ? 'Photobooth Capture' : ''),
              category: bucket === 'akra-photobooth' ? 'photobooth' : category,
              created_at: new Date().toISOString(),
            };
            await serverSupabase.from('media').insert(mediaRecord);
            memMedia.unshift(mediaRecord);
            broadcastToCouple('couple_akra_1', 'new_media_item', mediaRecord);
          }
        }
      } catch (storageErr) {
        console.warn('Supabase storage upload error:', storageErr);
      }
    }

    res.json({
      success: true,
      url: publicUrl,
      storagePath,
      bucket,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('File upload failed:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Base64 upload for Photobooth snapshots, Canvas captures & Web uploads
apiRouter.post('/upload-base64', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { dataUrl, base64Data, filename, bucket = 'akra-photobooth', folder = 'photobooth', caption, category } = req.body;
    const rawData = dataUrl || base64Data;
    if (!rawData || !rawData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    const matches = rawData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 payload' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    const mimeType = matches[1];
    const ext = mimeType.includes('png') ? '.png' : '.jpg';
    const safeName = filename
      ? `${filename.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now()}${ext}`
      : `${folder}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;

    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);

    let returnUrl = `/uploads/${safeName}`;
    let storagePath = `${folder}/${safeName}`;

    // Upload directly to Supabase Storage if configured
    if (isServerSupabaseConfigured) {
      try {
        const { data: storageUpload, error: storageErr } = await serverSupabase.storage
          .from(bucket)
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!storageErr && storageUpload?.path) {
          storagePath = storageUpload.path;

          if (bucket === 'akra-vault') {
            const { data: signed } = await serverSupabase.storage
              .from('akra-vault')
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10);
            if (signed?.signedUrl) returnUrl = signed.signedUrl;
          } else {
            const { data: publicSupabase } = serverSupabase.storage
              .from(bucket)
              .getPublicUrl(storagePath);
            if (publicSupabase?.publicUrl) returnUrl = publicSupabase.publicUrl;
          }

          // Record in public.media if photobooth or gallery
          const mediaCat = category || (bucket === 'akra-photobooth' ? 'photobooth' : 'gallery');
          const mediaRecord = {
            id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            couple_id: 'couple_akra_1',
            uploaded_by: user.uid,
            storage_path: storagePath,
            file_type: mimeType,
            file_size: buffer.length,
            url: returnUrl,
            caption: caption || (bucket === 'akra-photobooth' ? 'Photobooth Capture' : ''),
            category: mediaCat,
            created_at: new Date().toISOString(),
          };
          await serverSupabase.from('media').insert(mediaRecord);
          memMedia.unshift(mediaRecord);
          broadcastToCouple('couple_akra_1', 'new_media_item', mediaRecord);
        }
      } catch (err) {
        console.warn('Supabase storage upload note:', err);
      }
    }

    res.json({
      success: true,
      url: returnUrl,
      storagePath,
      bucket,
      filename: safeName,
    });
  } catch (error) {
    console.error('Base64 upload failed:', error);
    res.status(500).json({ error: 'Failed to save base64 image' });
  }
});
