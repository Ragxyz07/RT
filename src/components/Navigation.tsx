import React, { useState } from 'react';
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
  Milestone as MilestoneIcon,
  Compass,
  Settings,
  MoreHorizontal,
  X
} from 'lucide-react';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, unreadCount } = useAkra();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const primaryTabs: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageCircle, badge: unreadCount },
    { id: 'movie-night', label: 'Movie Night', icon: Film },
    { id: 'photobooth', label: 'Photobooth', icon: Camera },
    { id: 'vault', label: 'Vault', icon: Lock },
    { id: 'memories', label: 'Memories', icon: Image },
  ];

  const allTabs: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chat', label: 'Our Chat', icon: MessageCircle, badge: unreadCount },
    { id: 'movie-night', label: 'Movie Night', icon: Film },
    { id: 'photobooth', label: 'Photobooth', icon: Camera },
    { id: 'vault', label: 'Secret Vault', icon: Lock },
    { id: 'location', label: 'Live Distance', icon: MapPin },
    { id: 'memories', label: 'Memories', icon: Image },
    { id: 'letters', label: 'Letters', icon: Mail },
    { id: 'timeline', label: 'Our Story', icon: MilestoneIcon },
    { id: 'future', label: 'Our Future', icon: Compass },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Navigation Bar */}
      <nav className="hidden lg:block bg-[#FFF0F5]/95 border-b border-[#F0C9D8] sticky top-[65px] z-30 px-4 py-2 backdrop-blur-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-1">
          <div className="flex items-center gap-1.5">
            {allTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`desktop-nav-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#5D4037] text-white shadow-xs font-semibold'
                      : 'text-[#795548] hover:text-[#3E2723] hover:bg-[#FCEBF2]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#EFE5E0]' : 'text-[#795548]'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge > 0 ? (
                    <span className="w-4 h-4 rounded-full bg-[#3E2723] text-white text-[10px] font-bold flex items-center justify-center">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFF0F5]/95 backdrop-blur-md border-t border-[#F0C9D8] px-2 py-1.5 shadow-lg safe-area-bottom">
        <div className="flex items-center justify-around">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`mobile-nav-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowMoreMenu(false);
                }}
                className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-[#3E2723]'
                    : 'text-[#795548] hover:text-[#3E2723]'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-[#5D4037] text-white' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium tracking-tight mt-0.5">
                  {tab.label}
                </span>
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute top-1 right-2 w-4 h-4 bg-[#5D4037] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          {/* More Menu Toggle */}
          <button
            id="mobile-nav-more"
            onClick={() => setShowMoreMenu(prev => !prev)}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              showMoreMenu
                ? 'text-[#3E2723]'
                : 'text-[#795548] hover:text-[#3E2723]'
            }`}
          >
            <div className={`p-1 rounded-lg ${showMoreMenu ? 'bg-[#5D4037] text-white' : ''}`}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-0.5">
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Drawer / Modal */}
      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-[#FFF0F5] rounded-t-3xl border-t border-[#F0C9D8] p-5 pb-8 shadow-2xl max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0C9D8] mb-4">
              <span className="font-serif font-semibold text-base text-[#3E2723]">
                AKRA Spaces
              </span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-full text-[#795548] hover:bg-[#FCEBF2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {allTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowMoreMenu(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                      isActive
                        ? 'bg-[#5D4037] text-white border-[#5D4037] shadow-xs'
                        : 'bg-[#FCEBF2] text-[#3E2723] border-[#F0C9D8] hover:bg-[#EFE5E0]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isActive ? 'text-[#EFE5E0]' : 'text-[#5D4037]'}`} />
                    <span className="text-xs font-medium">{tab.label}</span>
                    {tab.badge && tab.badge > 0 ? (
                      <span className="mt-1 text-[9px] px-1.5 py-0.2 bg-[#3E2723] text-white rounded-full font-bold">
                        {tab.badge} new
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
