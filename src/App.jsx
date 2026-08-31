import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import DesktopGame from './components/DesktopGame';
import MobileController from './components/MobileController';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState({
    status: 'lobby',
    voltage: 0,
    score: 0,
    highScore: 25000,
    multiplier: 1,
    multiplierProgress: 0,
    boostCharges: 3,
    timeRemaining: 60,
    slots: { p1: null, p2: null },
  });
  const [serverInfo, setServerInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check if current page is the controller route
  const isController = window.location.pathname.startsWith('/controller');

  useEffect(() => {
    // When opened via tunnel (loca.lt, etc.) or production: connect to same origin.
    // When opened via Vite dev (port 5173): connect to Express on port 3001.
    const socketUrl = window.location.port === '5173'
      ? `http://${window.location.hostname}:3001`
      : window.location.origin;

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 50,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to game server socket:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from game server');
      setIsConnected(false);
    });

    newSocket.on('init_sync', (data) => {
      if (data.gameState) setGameState(data.gameState);
      setServerInfo((prev) => ({
        ...prev,
        lanIp: data.lanIp,
        httpPort: data.httpPort,
        httpsPort: data.httpsPort,
        tunnelUrl: data.tunnelUrl ? `${data.tunnelUrl}/controller` : prev?.tunnelUrl || null,
      }));
    });

    // When the tunnel comes online after initial connect
    newSocket.on('tunnel_ready', ({ tunnelUrl }) => {
      setServerInfo((prev) => ({
        ...prev,
        tunnelUrl: `${tunnelUrl}/controller`,
      }));
    });

    newSocket.on('game_state_update', (updatedState) => {
      setGameState((prev) => ({ ...prev, ...updatedState }));
    });

    newSocket.on('players_changed', (slots) => {
      setGameState((prev) => ({ ...prev, slots }));
    });

    setSocket(newSocket);

    // Fetch server info via REST API as fallback (picks up tunnelUrl if already established)
    fetch('/api/info')
      .then((res) => res.json())
      .then((info) => {
        setServerInfo((prev) => ({
          ...prev,
          ...info,
        }));
      })
      .catch((err) => console.log('Info fetch error:', err.message));

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#070204]">
      {/* Connection Indicator if server drops */}
      {!isConnected && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-900/90 text-white text-center py-1 text-xs font-bold font-orbitron border-b border-red-500 animate-pulse">
          CONNECTING TO GAME SERVER...
        </div>
      )}

      {isController ? (
        <MobileController socket={socket} gameState={gameState} serverInfo={serverInfo} />
      ) : (
        <DesktopGame socket={socket} gameState={gameState} serverInfo={serverInfo} />
      )}
    </div>
  );
}
