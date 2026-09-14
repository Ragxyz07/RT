import React, { useState, useEffect, useRef } from 'react';
import { useAkra } from '../context/AkraContext';
import { NavigationTab } from '../types';
import {
  MessageCircle,
  Camera,
  Lock,
  MapPin,
  Film,
  Image as ImageIcon,
  Mail,
  Sparkles,
  Compass,
  ArrowRight,
  Clock,
  Calendar,
  Heart,
  Send,
} from 'lucide-react';
import { AkraLogo } from '../components/AkraLogo';

export const HomeView: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    relationship,
    calculateDistanceKm,
    memories,
    letters,
    movies,
    futureItems,
    milestones,
    unreadCount,
    setActiveTab,
    sendVirtualHeart,
  } = useAkra();

  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Live clocks for Puducherry and Bangalore
  const [timePuducherry, setTimePuducherry] = useState('');
  const [timeBangalore, setTimeBangalore] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setTimePuducherry(timeStr);
      setTimeBangalore(timeStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Relationship days counter
  const [daysTogether, setDaysTogether] = useState(624);
  useEffect(() => {
    if (relationship.anniversaryDate) {
      const start = new Date(relationship.anniversaryDate).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      if (diff > 0) setDaysTogether(diff);
    }
  }, [relationship.anniversaryDate]);

  // Days until next reunion
  const [daysUntilMeeting, setDaysUntilMeeting] = useState(16);
  useEffect(() => {
    if (relationship.nextMeetingDate) {
      const target = new Date(relationship.nextMeetingDate).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
      setDaysUntilMeeting(diff);
    }
  }, [relationship.nextMeetingDate]);

  const distanceKm = calculateDistanceKm();

  // Subtle parallax tracking on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 16;
    setMousePos({ x, y });
  };

  // Recent Moment items
  const recentMemory = memories[0] || {
    id: 'sample_mem',
    title: 'Sunset at Rock Beach',
    caption: 'The way the evening ocean turned to liquid gold as we held hands.',
    date: 'August 18, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80',
  };

  const recentLetter = letters[0] || {
    id: 'sample_let',
    title: 'The sound of your laugh through the phone',
    content: 'When you laughed tonight, every single mile between Bangalore and Puducherry vanished.',
    date: 'September 2, 2026',
    sender: partnerUser.nickname || partnerUser.name,
  };

  const nextMovie = movies[0] || {
    id: 'sample_mov',
    title: 'Before Sunrise',
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    time: 'Tonight, 9:30 PM',
  };

  const upcomingFuture = futureItems[0] || {
    id: 'sample_fut',
    title: 'Watch the sunrise together at Serenity Beach',
    targetDate: 'October 2026',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
  };

  // Portals list
  const portals = [
    {
      id: 'chat' as NavigationTab,
      title: 'Our Conversation',
      subtitle: unreadCount > 0 ? `${unreadCount} unread notes` : 'Written on glass',
      icon: MessageCircle,
      badge: unreadCount > 0 ? `${unreadCount}` : undefined,
    },
    {
      id: 'memories' as NavigationTab,
      title: 'Photobook',
      subtitle: `${memories.length} preserved frames`,
      icon: ImageIcon,
    },
    {
      id: 'photobooth' as NavigationTab,
      title: 'Photobooth',
      subtitle: 'Live distance viewfinder',
      icon: Camera,
    },
    {
      id: 'vault' as NavigationTab,
      title: 'Private Vault',
      subtitle: 'Secret confidential photos',
      icon: Lock,
    },
    {
      id: 'location' as NavigationTab,
      title: 'Presence & Distance',
      subtitle: `${distanceKm} km • Connected`,
      icon: MapPin,
    },
    {
      id: 'movie-night' as NavigationTab,
      title: 'Movie Night',
      subtitle: 'Synced private screening',
      icon: Film,
    },
    {
      id: 'letters' as NavigationTab,
      title: 'Slow Letters',
      subtitle: `${letters.length} sealed envelopes`,
      icon: Mail,
    },
    {
      id: 'timeline' as NavigationTab,
      title: 'Our Story',
      subtitle: `${milestones.length} quiet milestones`,
      icon: Sparkles,
    },
    {
      id: 'future' as NavigationTab,
      title: 'Someday Dreams',
      subtitle: `${futureItems.length} future intentions`,
      icon: Compass,
    },
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[calc(100vh-80px)] px-4 sm:px-6 py-8 sm:py-12 max-w-5xl mx-auto space-y-12 select-none overflow-hidden"
    >
      {/* Quiet Ambient Shared Orb in Background */}
      <div
        className="absolute top-12 left-1/2 -translate-x-1/2 w-[520px] h-[360px] rounded-full bg-gradient-to-b from-[#f7ded7]/60 via-[#ecd0c8]/40 to-transparent blur-3xl pointer-events-none transition-transform duration-1000 ease-out"
        style={{
          transform: `translate(calc(-50% + ${mousePos.x * 0.4}px), ${mousePos.y * 0.4}px)`,
        }}
      />

      {/* Hero Header: Presence, Local Time & Editorial Greeting */}
      <header className="relative z-10 text-center space-y-4">
        {/* Presence Capsule */}
        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full glass-cream shadow-xs text-xs text-[#5b3a2e]">
          <span className="w-2 h-2 rounded-full bg-[#b06a5e] animate-slow-orb-pulse" />
          <span className="font-medium tracking-wide">Online together</span>
          <span className="text-[#7a5240]/40">•</span>
          <span className="text-[#7a5240]">
            Puducherry <span className="font-mono text-[#5b3a2e] font-semibold">{timePuducherry}</span>
          </span>
          <span className="text-[#7a5240]/40">•</span>
          <span className="text-[#7a5240]">
            Bangalore <span className="font-mono text-[#5b3a2e] font-semibold">{timeBangalore}</span>
          </span>
        </div>

        {/* Large Editorial Serif Greeting */}
        <div>
          <h1 className="font-serif text-4xl sm:text-6xl text-[#5b3a2e] font-normal tracking-tight">
            Hello, <span className="font-serif italic text-[#b06a5e]">{currentUser.nickname || currentUser.name}</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#7a5240] max-w-xl mx-auto font-sans leading-relaxed">
            Day {daysTogether} together • {distanceKm} km apart, closer than ever. Next reunion in{' '}
            <span className="font-semibold text-[#5b3a2e]">{daysUntilMeeting} days</span>.
          </p>
        </div>

        {/* Quiet Virtual Touch Action */}
        <div className="pt-1 flex items-center justify-center gap-3">
          <button
            onClick={sendVirtualHeart}
            className="px-5 py-2 rounded-full glass-cream hover:bg-[#ffffff] text-xs font-semibold text-[#5b3a2e] border border-[#7a5240]/20 hover:border-[#7a5240]/40 transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            title="Send quiet touch across the distance"
          >
            <span className="w-2 h-2 rounded-full bg-[#b06a5e]" />
            <span>Send touch to {partnerUser.nickname || partnerUser.name}</span>
          </button>
        </div>
      </header>

      {/* Section: Slow 3D-Tilted Row of "Moments" */}
      <section className="relative z-10 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="micro-label">Recent Moments</span>
            <h2 className="font-serif text-2xl text-[#5b3a2e] font-normal">
              What we have <span className="font-serif italic">kept</span>
            </h2>
          </div>
          <span className="text-xs text-[#7a5240]/70 font-serif italic">Parallaxing frames</span>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          style={{
            transform: `perspective(1000px) rotateX(${mousePos.y * 0.15}deg) rotateY(${mousePos.x * -0.15}deg)`,
            transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* Card 1: Most Recent Memory */}
          <div
            onClick={() => setActiveTab('memories')}
            className="glass-cream p-4 rounded-[28px] border border-[#7a5240]/20 glass-interactive cursor-pointer flex flex-col justify-between group overflow-hidden"
          >
            <div>
              <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden mb-3 bg-[#ecd0c8]">
                <img
                  src={recentMemory.imageUrl}
                  alt={recentMemory.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-2 left-2 micro-label text-[8px] bg-[#f9efe8]/90 px-2 py-0.5 rounded-full border border-[#7a5240]/15">
                  Memory
                </span>
              </div>
              <h3 className="font-serif text-lg text-[#5b3a2e] leading-snug line-clamp-1">
                {recentMemory.title}
              </h3>
              <p className="text-xs text-[#7a5240] font-serif italic line-clamp-2 mt-1">
                "{recentMemory.caption}"
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#7a5240]/10 flex items-center justify-between text-[10px] text-[#7a5240]/70 font-mono">
              <span>{recentMemory.date}</span>
              <ArrowRight className="w-3 h-3 text-[#7a5240] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Last Letter */}
          <div
            onClick={() => setActiveTab('letters')}
            className="glass-cream p-4 rounded-[28px] border border-[#7a5240]/20 glass-interactive cursor-pointer flex flex-col justify-between group overflow-hidden bg-gradient-to-b from-[#f9efe8]/90 to-[#f3d9d2]/70"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="micro-label text-[8px] bg-[#ecd0c8]/60 px-2 py-0.5 rounded-full border border-[#7a5240]/15">
                  Letter
                </span>
                <span className="text-[10px] text-[#7a5240] font-serif italic">
                  From {recentLetter.sender}
                </span>
              </div>
              <h3 className="font-serif text-lg text-[#5b3a2e] leading-snug line-clamp-1">
                {recentLetter.title}
              </h3>
              <p className="text-xs text-[#7a5240] font-serif italic line-clamp-3 mt-2 leading-relaxed">
                "{recentLetter.content}"
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#7a5240]/10 flex items-center justify-between text-[10px] text-[#7a5240]/70 font-mono">
              <span>{recentLetter.date}</span>
              <ArrowRight className="w-3 h-3 text-[#7a5240] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 3: Next Movie Night */}
          <div
            onClick={() => setActiveTab('movie-night')}
            className="glass-cream p-4 rounded-[28px] border border-[#7a5240]/20 glass-interactive cursor-pointer flex flex-col justify-between group overflow-hidden"
          >
            <div>
              <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden mb-3 bg-[#ecd0c8]">
                <img
                  src={nextMovie.poster}
                  alt={nextMovie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-2 left-2 micro-label text-[8px] bg-[#f9efe8]/90 px-2 py-0.5 rounded-full border border-[#7a5240]/15">
                  Cinema
                </span>
              </div>
              <h3 className="font-serif text-lg text-[#5b3a2e] leading-snug line-clamp-1">
                {nextMovie.title}
              </h3>
              <p className="text-xs text-[#7a5240] mt-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#b06a5e]" />
                <span>{nextMovie.time}</span>
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#7a5240]/10 flex items-center justify-between text-[10px] text-[#7a5240]/70 font-mono">
              <span>Synchronized</span>
              <ArrowRight className="w-3 h-3 text-[#7a5240] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 4: Upcoming Future Dream */}
          <div
            onClick={() => setActiveTab('future')}
            className="glass-cream p-4 rounded-[28px] border border-[#7a5240]/20 glass-interactive cursor-pointer flex flex-col justify-between group overflow-hidden"
          >
            <div>
              <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden mb-3 bg-[#ecd0c8]">
                <img
                  src={upcomingFuture.imageUrl}
                  alt={upcomingFuture.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-2 left-2 micro-label text-[8px] bg-[#f9efe8]/90 px-2 py-0.5 rounded-full border border-[#7a5240]/15">
                  Someday
                </span>
              </div>
              <h3 className="font-serif text-lg text-[#5b3a2e] leading-snug line-clamp-1">
                {upcomingFuture.title}
              </h3>
              <p className="text-xs text-[#7a5240] font-serif italic line-clamp-2 mt-1">
                Planned for {upcomingFuture.targetDate}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#7a5240]/10 flex items-center justify-between text-[10px] text-[#7a5240]/70 font-mono">
              <span>Goal</span>
              <ArrowRight className="w-3 h-3 text-[#7a5240] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* Section: Spaces within the World (Quiet Portals Grid) */}
      <section className="relative z-10 space-y-4">
        <div className="px-1">
          <span className="micro-label">Our Spaces</span>
          <h2 className="font-serif text-2xl text-[#5b3a2e] font-normal">
            Every sanctuary inside <span className="font-serif italic">AKRA</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portals.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className="glass-cream p-5 rounded-[28px] border border-[#7a5240]/18 glass-interactive cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#ecd0c8]/60 group-hover:bg-[#5b3a2e] text-[#5b3a2e] group-hover:text-[#f9efe8] flex items-center justify-center transition-all duration-300 shadow-xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-[#5b3a2e] font-normal">
                      {p.title}
                    </h3>
                    <p className="text-xs text-[#7a5240]/80">
                      {p.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-[#b06a5e] text-[#f9efe8] text-[9px] font-bold shadow-xs">
                      {p.badge}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-[#7a5240]/60 group-hover:text-[#5b3a2e] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
