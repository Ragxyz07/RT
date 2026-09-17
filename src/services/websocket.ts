// WebSocket & Supabase Realtime sync client for AKRA
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import type { RealtimeChannel } from '@supabase/supabase-js';

type MessageHandler = (type: string, data: any) => void;

class AkraRealtimeClient {
  private ws: WebSocket | null = null;
  private supabaseChannel: RealtimeChannel | null = null;
  private listeners: Set<MessageHandler> = new Set();
  private reconnectTimeout: any = null;
  private currentUserId: string = '';
  private isConnecting: boolean = false;

  public connect(userId: string) {
    this.currentUserId = userId;

    // 1. Connect to Supabase Realtime channel if configured
    if (isSupabaseConfigured && !this.supabaseChannel) {
      try {
        this.supabaseChannel = supabase.channel('couple_akra_1', {
          config: {
            broadcast: { self: false },
          },
        });

        this.supabaseChannel
          .on('broadcast', { event: '*' }, ({ event, payload }) => {
            this.emit(event, payload);
          })
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
              const row: any = payload.new;
              this.emit('new_message', {
                id: row.id,
                coupleId: row.couple_id,
                senderId: row.sender_id,
                senderName: row.sender_name,
                text: row.text,
                imageUrl: row.image_url,
                attachmentType: row.attachment_type,
                audioUrl: row.audio_url,
                createdAt: row.created_at,
              });
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'locations' },
            (payload) => {
              const row: any = payload.new;
              if (row) {
                this.emit('live_location', {
                  userId: row.user_id,
                  latitude: row.latitude,
                  longitude: row.longitude,
                  accuracy: row.accuracy,
                  city: row.city,
                  isSharing: row.is_sharing,
                  updatedAt: row.updated_at,
                });
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'memories' },
            (payload) => {
              const row: any = payload.new;
              this.emit('new_memory', {
                id: row.id,
                title: row.title,
                description: row.description,
                date: row.date,
                year: row.year,
                location: row.location,
                imageUrl: row.image_url,
                tags: row.tags,
                likes: row.likes || 0,
                creatorId: row.creator_id,
                uploadedByName: row.uploaded_by_name,
              });
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'letters' },
            (payload) => {
              const row: any = payload.new;
              this.emit('new_letter', {
                id: row.id,
                senderId: row.sender_id,
                authorName: row.author_name,
                recipientId: row.recipient_id,
                title: row.title,
                content: row.content,
                stamp: row.stamp,
                waxSeal: row.wax_seal,
                paperStyle: row.paper_style,
                createdAt: row.created_at,
              });
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'movie_sessions' },
            (payload) => {
              const row: any = payload.new;
              if (row) {
                this.emit('movie_session_sync', {
                  id: row.id,
                  title: row.title,
                  videoUrl: row.video_url,
                  isPlaying: row.is_playing,
                  currentTime: row.current_time,
                  startedBy: row.started_by,
                  updatedAt: row.updated_at,
                });
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Connected to Supabase Realtime
            }
          });
      } catch (err) {
        console.warn('Supabase Realtime setup notice:', err);
      }
    }

    // 2. Connect to Server WebSocket
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.send('auth', {
          userId: this.currentUserId,
          coupleId: 'couple_akra_1',
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const type = payload.type;
          const data = payload.data;
          this.emit(type, data);
        } catch (e) {
          // ignore non-json
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          if (this.currentUserId) {
            this.connect(this.currentUserId);
          }
        }, 3000);
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch (e) {
      this.isConnecting = false;
    }
  }

  public disconnect() {
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.supabaseChannel) {
      this.supabaseChannel.unsubscribe();
      this.supabaseChannel = null;
    }
  }

  public send(type: string, data: any) {
    // Send via local WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }

    // Broadcast via Supabase Realtime channel
    if (this.supabaseChannel) {
      this.supabaseChannel.send({
        type: 'broadcast',
        event: type,
        payload: data,
      });
    }
  }

  public emit(type: string, data: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(type, data);
      } catch (err) {
        console.error('Listener error in realtime client:', err);
      }
    });
  }

  public subscribe(handler: MessageHandler) {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }
}

export const realtimeClient = new AkraRealtimeClient();
