import React, { useState, useEffect } from 'react';
import DesktopGame from './components/DesktopGame';
import MobileController from './components/MobileController';
import { RealtimeNetwork } from './utils/realtimeEngine';

export default function App() {
  const [network, setNetwork] = useState(null);
  const [gameState, setGameState] = useState({
    status: 'lobby',
    voltage: 0,
    score: 0,
    highScore: 50000,
    multiplier: 1,
    multiplierProgress: 0,
    boostCharges: 5,
    timeRemaining: 90,
    connectedCount: 0,
    maxCapacity: 200,
  });
  const [serverInfo, setServerInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check if current page is the controller route
  const isController = window.location.pathname.startsWith('/controller');

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const roomCode = queryParams.get('room') || 'telecel-launch';

    const net = new RealtimeNetwork({
      isController,
      roomCode,
      socketUrl: import.meta.env.VITE_SOCKET_URL,
    });

    net.on('connect', () => {
      setIsConnected(true);
    });

    net.on('disconnect', () => {
      setIsConnected(false);
    });

    net.on('init_sync', (data) => {
      setIsConnected(true);
      if (data?.gameState) setGameState(data.gameState);
      setServerInfo((prev) => ({
        ...prev,
        roomCode: data?.roomCode || roomCode,
        lanIp: data?.lanIp || prev?.lanIp,
        httpPort: data?.httpPort || prev?.httpPort,
        httpsPort: data?.httpsPort || prev?.httpsPort,
        tunnelUrl: data?.tunnelUrl ? (data.tunnelUrl.endsWith('/controller') ? data.tunnelUrl : `${data.tunnelUrl}/controller`) : prev?.tunnelUrl || null,
      }));
    });

    net.on('tunnel_ready', ({ tunnelUrl }) => {
      setServerInfo((prev) => ({
        ...prev,
        tunnelUrl: tunnelUrl.endsWith('/controller') ? tunnelUrl : `${tunnelUrl}/controller`,
      }));
    });

    net.on('participant_joined', (data) => {
      setIsConnected(true);
      if (data?.connectedCount !== undefined) {
        setGameState((prev) => ({ ...prev, connectedCount: data.connectedCount }));
      }
    });

    net.on('participant_left', (data) => {
      if (data?.connectedCount !== undefined) {
        setGameState((prev) => ({ ...prev, connectedCount: data.connectedCount }));
      }
    });

    net.on('controller_assigned', (data) => {
      setIsConnected(true);
      if (data?.connectedCount !== undefined) {
        setGameState((prev) => ({ ...prev, connectedCount: data.connectedCount }));
      }
    });

    net.on('room_code_changed', ({ roomCode: newRoomCode }) => {
      setServerInfo((prev) => ({
        ...prev,
        roomCode: newRoomCode,
      }));
    });

    net.on('game_state_update', (updatedState) => {
      setIsConnected(true);
      setGameState((prev) => ({ ...prev, ...updatedState }));
    });

    net.init();
    setNetwork(net);

    setServerInfo({
      roomCode,
    });

    fetch('/api/info')
      .then((res) => res.json())
      .then((info) => {
        setServerInfo((prev) => ({
          ...prev,
          ...info,
          roomCode: prev?.roomCode || roomCode,
        }));
      })
      .catch(() => {
        // Expected when running purely serverless on Vercel
      });

    return () => {
      net.destroy();
    };
  }, [isController]);

  return (
    <div className="w-full min-h-screen h-full bg-[#070204]">
      {/* Connection Indicator if disconnected */}
      {!isConnected && (
        <div 
          style={{ paddingTop: 'max(env(safe-area-inset-top), 4px)' }}
          className="fixed top-0 inset-x-0 z-50 bg-red-900/90 text-white text-center py-1 text-xs font-bold font-orbitron border-b border-red-500 animate-pulse"
        >
          {isController ? 'CONNECTING TO EVENT REACTOR...' : 'STARTING LAUNCH REACTOR...'}
        </div>
      )}

      {isController ? (
        <MobileController socket={network} gameState={gameState} serverInfo={serverInfo} isConnected={isConnected} />
      ) : (
        <DesktopGame socket={network} gameState={gameState} serverInfo={serverInfo} isConnected={isConnected} />
      )}
    </div>
  );
}
