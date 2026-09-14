import React from 'react';
import { useAkra } from '../context/AkraContext';
import { NavigationTab } from '../types';
import {
  Home,
  MessageCircle,
  Camera,
  Lock,
  MapPin,
  Film,
  Image,
  Mail,
  Sparkles,
  Compass,
  Settings,
} from 'lucide-react';

interface DockItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const GlassDock: React.FC = () => {
  const { activeTab, setActiveTab, unreadCount } = useAkra();

  const dockItems: DockItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageCircle, badge: unreadCount },
    { id: 'memories', label: 'Memories', icon: Image },
    { id: 'photobooth', label: 'Photobooth', icon: Camera },
    { id: 'vault', label: 'Vault', icon: Lock },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'movie-night', label: 'Movie Night', icon: Film },
    { id: 'letters', label: 'Letters', icon: Mail },
    { id: 'timeline', label: 'Timeline', icon: Sparkles },
    { id: 'future', label: 'Future', icon: Compass },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (tabId: NavigationTab) => {
    setActiveTab(tabId);
  };

  return (
    <nav
      id="floating-glass-dock"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] px-2 sm:px-3 py-1.5 rounded-full glass-cream-elevated shadow-2xl transition-all duration-300 pointer-events-auto select-none border border-[#7a5240]/20 animate-breathing-float"
    >
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`dock-item-${item.id}`}
              onClick={() => handleTabClick(item.id)}
              className={`group relative flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-full transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-[#5b3a2e] text-[#f9efe8] shadow-md scale-105'
                  : 'text-[#5b3a2e] hover:text-[#3e2621] hover:bg-[#ecd0c8]/60 hover:-translate-y-0.5'
              }`}
              title={item.label}
            >
              {/* Active subtle halo backing */}
              {isActive && (
                <span className="absolute -inset-0.5 rounded-full bg-[#d9a89e]/30 blur-xs pointer-events-none" />
              )}

              <Icon
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 relative z-10 transition-transform ${
                  isActive ? 'scale-105 text-[#f9efe8]' : 'group-hover:scale-105 text-[#5b3a2e]'
                }`}
              />

              {/* Text label on desktop for active or hover */}
              <span
                className={`text-[9px] font-sans font-medium tracking-tight mt-0.5 hidden lg:block whitespace-nowrap relative z-10 uppercase ${
                  isActive ? 'text-[#f9efe8] font-semibold' : 'text-[#7a5240]'
                }`}
              >
                {item.label}
              </span>

              {/* Unread badge */}
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#b06a5e] text-[#f9efe8] text-[8px] font-bold flex items-center justify-center shadow-xs">
                  {item.badge}
                </span>
              ) : null}

              {/* Tooltip for compact screen view */}
              <span className="absolute -top-8 px-2 py-0.5 rounded-md bg-[#5b3a2e] text-[#f9efe8] text-[9px] font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity lg:hidden whitespace-nowrap shadow-md">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
