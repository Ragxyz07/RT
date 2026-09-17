import React from 'react';
import { AkraProvider, useAkra } from './context/AkraContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { AmbientAudioController } from './components/AmbientAudioController';
import { GlassDock } from './components/GlassDock';
import { Toasts } from './components/Toasts';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SupabaseConfigError } from './components/SupabaseConfigError';

import { AkraLogin3D } from './components/3d/AkraLogin3D';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { HomeView } from './views/HomeView';
import { ChatView } from './views/ChatView';
import { PhotoboothView } from './views/PhotoboothView';
import { VaultView } from './views/VaultView';
import { LocationView } from './views/LocationView';
import { MovieNightView } from './views/MovieNightView';
import { MemoriesView } from './views/MemoriesView';
import { LettersView } from './views/LettersView';
import { TimelineView } from './views/TimelineView';
import { FutureView } from './views/FutureView';
import { SettingsView } from './views/SettingsView';

const MainLayout: React.FC = () => {
  const { isAuthenticated, activeTab } = useAkra();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1C1412] text-[#FFF7F2] flex flex-col justify-between">
        <Toasts />
        <OfflineIndicator />
        <SupabaseConfigError bannerOnly={true} />
        <ResetPasswordModal />
        <AkraLogin3D />
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView />;
      case 'chat':
        return <ChatView />;
      case 'photobooth':
        return <PhotoboothView />;
      case 'vault':
        return <VaultView />;
      case 'location':
        return <LocationView />;
      case 'movie-night':
        return <MovieNightView />;
      case 'memories':
        return <MemoriesView />;
      case 'letters':
        return <LettersView />;
      case 'timeline':
        return <TimelineView />;
      case 'future':
        return <FutureView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen bg-pink-dusk text-[#5b3a2e] flex flex-col selection:bg-[#ecd0c8] selection:text-[#5b3a2e]">
      <Toasts />
      <OfflineIndicator />
      <SupabaseConfigError bannerOnly={true} />
      <ResetPasswordModal />
      <Header />

      <main className="flex-1 pb-24 sm:pb-28">
        {renderActiveView()}
      </main>

      {/* Opt-in Gentle Ambient Dusk Audio Controller */}
      <AmbientAudioController />

      {/* Minimal Floating Glass Navigation Dock */}
      <GlassDock />
    </div>
  );
};

export default function App() {
  return (
    <AkraProvider>
      <MainLayout />
    </AkraProvider>
  );
}
