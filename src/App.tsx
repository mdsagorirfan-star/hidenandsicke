import React, { useEffect, useState } from 'react';
import type { MapId, QualityPreset, RoomSettings } from '../shared/types.ts';
import { AppShell } from './components/AppShell.tsx';
import { GamePlayView } from './components/GamePlayView.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { useSocketMultiplayer } from './hooks/useSocketMultiplayer.ts';
import { LoginPage, RegisterPage } from './pages/AuthPages.tsx';
import { LandingPage, type PageRoute } from './pages/LandingPage.tsx';
import {
  CreateRoomPage,
  DashboardPage,
  GameResultsPage,
  LobbyPage,
  QuickMatchPage,
  RoomLobbyPage,
} from './pages/LobbyAndRoomsPages.tsx';
import {
  AdminPanelPage,
  InventoryPage,
  LeaderboardPage,
  NotFoundPage,
  RewardsPage,
  SettingsPage,
} from './pages/ProgressionAndAdminPages.tsx';
import {
  FriendsPage,
  MessagesPage,
  NotificationsPage,
  ProfilePage,
} from './pages/SocialPages.tsx';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || 'Unexpected error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-6 text-slate-100">
          <div className="max-w-md w-full bg-[#111827] border border-rose-500/30 rounded-2xl p-6 space-y-4">
            <h1 className="font-display text-xl font-bold text-rose-300">Application Error</h1>
            <p className="text-xs text-slate-300 break-words">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              Reload Hideverse
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const VALID_ROUTES = new Set<PageRoute>([
  'landing',
  'register',
  'login',
  'dashboard',
  'lobby',
  'quick_match',
  'create_room',
  'room_lobby',
  'gameplay',
  'results',
  'friends',
  'messages',
  'notifications',
  'profile',
  'leaderboard',
  'rewards',
  'inventory',
  'settings',
  'admin',
  'not_found',
]);

function HideverseRouter() {
  const { user, loading, logout, refreshUser } = useAuth();
  const [route, setRoute] = useState<PageRoute>('landing');
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room');
  });
  const [pendingQuickMap, setPendingQuickMap] = useState<MapId | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [quality, setQuality] = useState<QualityPreset>('high');
  const [sensitivity, setSensitivity] = useState<number>(1.0);

  const mp = useSocketMultiplayer(
    user
      ? {
          uid: user.uid,
          username: user.username,
          displayName: user.displayName,
          equippedSkin: user.equippedSkin,
          equippedAccessory: user.equippedAccessory,
        }
      : null
  );

  // Sync live online players counter from /api/health
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setOnlineCount(Number(data.onlinePlayers) || 1);
        }
      } catch {
        // Ignore transient network errors
      }
    };
    void fetchHealth();
    const id = setInterval(fetchHealth, 12_000);
    return () => clearInterval(id);
  }, []);

  // Redirect signed-in users off auth pages or into pending invite room
  useEffect(() => {
    if (loading) return;
    if (user) {
      if (pendingRoomId) {
        const rid = pendingRoomId;
        setPendingRoomId(null);
        void mp
          .joinRoom(rid)
          .then(() => setRoute('room_lobby'))
          .catch(() => setRoute('lobby'));
        return;
      }
      if (pendingQuickMap) {
        const mId = pendingQuickMap;
        setPendingQuickMap(null);
        void mp
          .quickMatch(mId)
          .then((rid) => mp.joinRoom(rid))
          .then(() => setRoute('room_lobby'))
          .catch(() => setRoute('quick_match'));
        return;
      }
      if (route === 'landing' || route === 'login' || route === 'register') {
        setRoute('dashboard');
      }
    }
  }, [loading, user, pendingRoomId, pendingQuickMap]);

  // Transition automatically into active 3D gameplay when match starts
  useEffect(() => {
    if (mp.matchState && (mp.matchState.phase === 'hiding' || mp.matchState.phase === 'seeking')) {
      if (route !== 'gameplay') {
        setRoute('gameplay');
      }
    }
  }, [mp.matchState?.phase]);

  // Transition automatically to match results & refresh progression stats
  useEffect(() => {
    if (mp.lastMatchResult) {
      void refreshUser();
      setRoute('results');
    }
  }, [mp.lastMatchResult]);

  // Return to lobby if kicked
  useEffect(() => {
    if (mp.kickedNotice) {
      setRoute('lobby');
    }
  }, [mp.kickedNotice]);

  const navigate = (next: PageRoute) => {
    const target = VALID_ROUTES.has(next) ? next : 'not_found';
    const publicRoutes: PageRoute[] = ['landing', 'login', 'register', 'leaderboard', 'settings', 'not_found'];
    if (!user && !publicRoutes.includes(target)) {
      setRoute('login');
      return;
    }
    setRoute(target);
  };

  const handleQuickPlayMap = async (mapId: MapId) => {
    if (!user) {
      setPendingQuickMap(mapId);
      setRoute('login');
      return;
    }
    const rid = await mp.quickMatch(mapId);
    await mp.joinRoom(rid);
    setRoute('room_lobby');
  };

  const handleQuickMatch = async (mapId?: MapId) => {
    const rid = await mp.quickMatch(mapId);
    await mp.joinRoom(rid);
    setRoute('room_lobby');
  };

  const handleCreateRoom = async (settings: Partial<RoomSettings>, password?: string) => {
    const rid = await mp.createRoom(settings, password);
    await mp.joinRoom(rid, password);
    setRoute('room_lobby');
  };

  const handleJoinRoom = async (roomId: string, password?: string) => {
    const room = await mp.joinRoom(roomId, password);
    if (room.phase === 'hiding' || room.phase === 'seeking') {
      setRoute('gameplay');
    } else {
      setRoute('room_lobby');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center text-slate-300 text-sm">
        Initializing HIDEVERSE...
      </div>
    );
  }

  // Full-viewport 3D gameplay mode
  if (route === 'gameplay' && user && mp.currentRoom) {
    return (
      <GamePlayView
        user={user}
        room={mp.currentRoom}
        matchState={mp.matchState}
        lastTagEffect={mp.lastTagEffect}
        quality={quality}
        onChangeQuality={setQuality}
        sensitivity={sensitivity}
        onMoveSync={mp.sendMove}
        onAttemptTag={mp.sendTagAttempt}
        onLeaveMatch={() => {
          mp.leaveRoom();
          setRoute('dashboard');
        }}
        chatMessages={mp.chatMessages}
        onSendChat={mp.sendChat}
        voiceConnected={mp.voiceConnected}
        voiceMuted={mp.voiceMuted}
        voiceDeafened={mp.voiceDeafened}
        onToggleVoiceJoin={() => void mp.toggleVoiceJoin()}
        onToggleVoiceMute={mp.toggleVoiceMute}
        onToggleVoiceDeafen={mp.toggleVoiceDeafen}
      />
    );
  }

  if (route === 'landing') {
    return (
      <LandingPage
        onlineCount={onlineCount}
        activeRooms={mp.roomsList}
        onNavigate={navigate}
        onQuickPlayMap={(m) => void handleQuickPlayMap(m)}
      />
    );
  }

  if (route === 'login') {
    return <LoginPage onNavigate={navigate} />;
  }

  if (route === 'register') {
    return <RegisterPage onNavigate={navigate} />;
  }

  // Public views accessible without authentication (wrapped in minimal header if unauthenticated)
  if (!user) {
    if (route === 'leaderboard') {
      return (
        <div className="min-h-screen bg-[#090D16] text-slate-100">
          <div className="max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
            <button onClick={() => setRoute('landing')} className="font-display text-lg font-bold text-white">
              ← HIDEVERSE
            </button>
            <button
              onClick={() => setRoute('login')}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              Sign In to Play
            </button>
          </div>
          <LeaderboardPage />
        </div>
      );
    }
    if (route === 'settings') {
      return (
        <div className="min-h-screen bg-[#090D16] text-slate-100">
          <div className="max-w-3xl mx-auto px-6 pt-6 flex items-center justify-between">
            <button onClick={() => setRoute('landing')} className="font-display text-lg font-bold text-white">
              ← HIDEVERSE
            </button>
            <button
              onClick={() => setRoute('login')}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              Sign In
            </button>
          </div>
          <SettingsPage
            user={null}
            quality={quality}
            onChangeQuality={setQuality}
            sensitivity={sensitivity}
            onChangeSensitivity={setSensitivity}
          />
        </div>
      );
    }
    return <LoginPage onNavigate={navigate} />;
  }

  // Authenticated Application Shell
  return (
    <AppShell
      user={user}
      route={route}
      currentRoom={mp.currentRoom}
      onNavigate={navigate}
      onLogout={async () => {
        mp.leaveRoom();
        await logout();
        setRoute('landing');
      }}
    >
      {route === 'dashboard' && (
        <DashboardPage
          user={user}
          rooms={mp.roomsList}
          onlineCount={onlineCount}
          onNavigate={navigate}
          onQuickMatch={handleQuickMatch}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {route === 'lobby' && (
        <LobbyPage
          rooms={mp.roomsList}
          onJoinRoom={handleJoinRoom}
          onNavigate={navigate}
        />
      )}

      {route === 'quick_match' && (
        <QuickMatchPage onQuickMatch={handleQuickMatch} onNavigate={navigate} />
      )}

      {route === 'create_room' && (
        <CreateRoomPage
          defaultName={user.displayName}
          onCreateRoom={handleCreateRoom}
          onNavigate={navigate}
        />
      )}

      {route === 'room_lobby' &&
        (mp.currentRoom ? (
          <RoomLobbyPage
            user={user}
            room={mp.currentRoom}
            members={mp.members}
            chatMessages={mp.chatMessages}
            typingUsers={mp.typingUsers}
            voiceConnected={mp.voiceConnected}
            voiceMuted={mp.voiceMuted}
            voiceDeafened={mp.voiceDeafened}
            voicePeers={mp.voicePeers}
            onSetReady={mp.setReady}
            onUpdateSettings={mp.updateRoomSettings}
            onKickPlayer={mp.kickPlayer}
            onStartMatch={mp.startMatch}
            onLeaveRoom={() => {
              mp.leaveRoom();
              setRoute('lobby');
            }}
            onSendChat={mp.sendChat}
            onSendTyping={mp.sendTyping}
            onToggleVoiceJoin={() => void mp.toggleVoiceJoin()}
            onToggleVoiceMute={mp.toggleVoiceMute}
            onToggleVoiceDeafen={mp.toggleVoiceDeafen}
          />
        ) : (
          <LobbyPage
            rooms={mp.roomsList}
            onJoinRoom={handleJoinRoom}
            onNavigate={navigate}
          />
        ))}

      {route === 'results' &&
        (mp.lastMatchResult ? (
          <GameResultsPage
            result={mp.lastMatchResult}
            isHost={mp.currentRoom?.hostId === user.uid}
            onPlayAgain={() => mp.startMatch()}
            onReturnToLobby={() => {
              mp.resetLobby();
              setRoute('room_lobby');
            }}
            onLeaveRoom={() => {
              mp.leaveRoom();
              setRoute('dashboard');
            }}
          />
        ) : (
          <DashboardPage
            user={user}
            rooms={mp.roomsList}
            onlineCount={onlineCount}
            onNavigate={navigate}
            onQuickMatch={handleQuickMatch}
            onJoinRoom={handleJoinRoom}
          />
        ))}

      {route === 'friends' && <FriendsPage user={user} currentRoom={mp.currentRoom} />}
      {route === 'messages' && <MessagesPage user={user} />}
      {route === 'notifications' && <NotificationsPage user={user} />}
      {route === 'profile' && <ProfilePage user={user} />}
      {route === 'leaderboard' && <LeaderboardPage />}
      {route === 'rewards' && <RewardsPage user={user} />}
      {route === 'inventory' && <InventoryPage user={user} />}
      {route === 'settings' && (
        <SettingsPage
          user={user}
          quality={quality}
          onChangeQuality={setQuality}
          sensitivity={sensitivity}
          onChangeSensitivity={setSensitivity}
        />
      )}
      {route === 'admin' && <AdminPanelPage />}
      {route === 'not_found' && <NotFoundPage onNavigate={navigate} />}
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HideverseRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
