import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  Zap, 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  Settings, 
  Maximize2, 
  RotateCcw, 
  Smartphone, 
  Users, 
  ShieldAlert, 
  Activity,
  CheckCircle2,
  Copy,
  ExternalLink,
  Keyboard,
  Flame,
  QrCode
} from 'lucide-react';
import ReactorCanvas from './ReactorCanvas';
import MultiplierGauge from './MultiplierGauge';
import LaunchLogo from './LaunchLogo';
import { audioEngine } from '../utils/audioEngine';

const SIMULATED_NAMES = [
  'Kwame Mensah', 'Ama Serwaa', 'Kofi Boateng', 'Akua Osei', 'Yaw Appiah',
  'Abena Darko', 'Kwadwo Frimpong', 'Yaa Asantewaa', 'Kwabena Agyeman', 'Afia Poku',
  'Kweku Baah', 'Esi Sutherland', 'Kobina Ansah', 'Efua Sutherland', 'Poku Ware',
  'Adjoa Kwarteng', 'Nana Yaw', 'Akosua Addo', 'Nii Armah', 'Naa Borkor'
];

export default function DesktopGame({ socket, gameState, serverInfo }) {
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useHttpsQR, setUseHttpsQR] = useState(true);
  const [boostAnimating, setBoostAnimating] = useState(false);
  const [shakeFlash, setShakeFlash] = useState(false);
  const [showLocalFallback, setShowLocalFallback] = useState(false);
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);
  const [simulatingCrowd, setSimulatingCrowd] = useState(false);
  const [floatingSurges, setFloatingSurges] = useState([]);
  const [recentOperativeNames, setRecentOperativeNames] = useState([]);
  const [joinedOperatives, setJoinedOperatives] = useState([]);
  const lastFloatingSurgeTimeRef = useRef(0);
  const simIntervalRef = useRef(null);
  const rosterListRef = useRef(null);

  // Check if viewing desktop screen on a mobile device
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.innerWidth < 768);
    if (isMobile) {
      setShowMobilePrompt(true);
    }
  }, []);

  const {
    status = 'lobby',
    voltage = 0,
    score = 0,
    highScore = 50000,
    multiplier = 1,
    multiplierProgress = 0,
  } = gameState || {};

  // Auto-enable local QR fallback after 4 seconds if tunnel hasn't connected
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLocalFallback(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Voltage-Tiered Motivational Directives (Tailored to current voltage level)
  const getVoltageTierMessage = useCallback((v) => {
    if (v < 25) {
      const msgs = [
        { title: "START SHAKING! ⚡", sub: "Generate initial collective power" },
        { title: "UNLEASH THE ENERGY! 🔥", sub: "Shake phones together to build momentum" },
        { title: "ALL OPERATIVES ENGAGE! ⚡", sub: "Raise the launch voltage" },
        { title: "SHAKE TO CHARGE! 🚀", sub: "Every device contributes power" },
      ];
      return msgs[Math.floor(Math.random() * msgs.length)];
    } else if (v < 55) {
      const msgs = [
        { title: "KEEP SHAKING! POWER RISING! 🚀", sub: "Steady surge climbing" },
        { title: "MAINTAIN THE RHYTHM! ⚡", sub: "Multipliers activating across devices" },
        { title: "HALFWAY THERE! MORE POWER! 🔥", sub: "Collective surge compounding" },
        { title: "MOMENTUM BUILDING! ⚡", sub: "Voltage passing intermediate threshold" },
      ];
      return msgs[Math.floor(Math.random() * msgs.length)];
    } else if (v < 80) {
      const msgs = [
        { title: "OVERCHARGE ACCELERATING! ⚡", sub: "Approaching critical energy capacity" },
        { title: "FASTER! FEEL THE SURGE! 🚀", sub: "High voltage detected" },
        { title: "INTENSE POWER DETECTED! 🔥", sub: "Reactor coils charging rapidly" },
        { title: "SURGE MULTIPLYING! ⚡", sub: "Power grid operating at high intensity" },
      ];
      return msgs[Math.floor(Math.random() * msgs.length)];
    } else {
      const msgs = [
        { title: "ALMOST AT 100%! 💥", sub: "Final push to initiate the launch!" },
        { title: "MAXIMUM OVERDRIVE! ⚡", sub: "Do not stop! Overcharge in progress!" },
        { title: "CRITICAL ACTIVATION IMMINENT! 🔥", sub: "Push to 100% now!" },
        { title: "HOLD NOTHING BACK! 💥", sub: "Launch sequence ready to trigger!" },
      ];
      return msgs[Math.floor(Math.random() * msgs.length)];
    }
  }, []);

  const [overlayMessage, setOverlayMessage] = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const [audienceToasts, setAudienceToasts] = useState([]);
  const prevStatusRef = useRef(status);
  const voltageRef = useRef(voltage);
  const lastToastTimeRef = useRef(0);

  useEffect(() => {
    voltageRef.current = voltage;
  }, [voltage]);

  // Hi-Tech screen element entrance animation trigger when game starts
  useEffect(() => {
    if (prevStatusRef.current === 'lobby' && status === 'playing') {
      setIsBooting(true);
      const timer = setTimeout(() => setIsBooting(false), 1400);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status]);

  // Periodic Voltage-Tiered Motivational Fullscreen Overlay
  useEffect(() => {
    if (status !== 'playing') {
      setOverlayVisible(false);
      setOverlayMessage(null);
      return;
    }

    const showMessage = () => {
      const msg = getVoltageTierMessage(voltageRef.current);
      setOverlayMessage(msg);
      setOverlayVisible(true);
      setTimeout(() => {
        setOverlayVisible(false);
      }, 2200);
    };

    // Initial popup 500ms after game starts
    const initTimer = setTimeout(showMessage, 500);

    // Periodic popups tailored to current voltage every 3.8s
    const interval = setInterval(showMessage, 3800);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [status, getVoltageTierMessage]);

  // Room code and controller URL resolution (supports Vercel, cloud, tunnel, and local)
  const roomCode = serverInfo?.roomCode || 'telecel-launch';
  const isHttps = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname.includes('vercel.app') || window.location.hostname !== 'localhost');
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  
  // Construct mobile controller QR link with guaranteed roomCode parameter
  let baseControllerUrl = serverInfo?.tunnelUrl;
  if (!baseControllerUrl) {
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalhost && serverInfo?.lanIp) {
      baseControllerUrl = `http://${serverInfo.lanIp}:${serverInfo?.httpPort || 3001}/controller`;
    } else {
      baseControllerUrl = `${window.location.origin}/controller`;
    }
  }
  
  let controllerUrl = baseControllerUrl;
  if (!controllerUrl.includes('/controller')) {
    controllerUrl = `${controllerUrl}/controller`;
  }
  if (!controllerUrl.includes('room=')) {
    const separator = controllerUrl.includes('?') ? '&' : '?';
    controllerUrl = `${controllerUrl}${separator}room=${encodeURIComponent(roomCode)}`;
  }
  
  // On Vercel / HTTPS or when tunnel is active or when LAN IP is resolved, QR code is immediately ready
  const tunnelReady = isHttps || !!serverInfo?.tunnelUrl || !!serverInfo?.lanIp;

  // Trigger sound engine updates on voltage changes
  useEffect(() => {
    audioEngine.updateVoltageHum(voltage, status === 'playing');
  }, [voltage, status]);

  // Handle victory audio & spectacular celebratory confetti explosion
  useEffect(() => {
    if (status === 'victory') {
      audioEngine.playVictory();

      // Multi-stage celebratory confetti explosion
      const duration = 5.5 * 1000;
      const animationEnd = Date.now() + duration;
      const colors = ['#e60000', '#ff1f43', '#ffffff', '#ffccd5', '#ffd700', '#ff4d6d'];

      // 1. Instant massive center burst
      try {
        confetti({
          particleCount: 140,
          spread: 100,
          origin: { y: 0.55 },
          colors,
          zIndex: 9999,
        });
      } catch (e) {}

      // 2. Continuous left & right side cannons + star bursts throughout celebration
      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 45 * (timeLeft / duration);

        try {
          // Left Cannon
          confetti({
            particleCount,
            angle: 60,
            spread: 70,
            origin: { x: 0, y: 0.72 },
            colors,
            zIndex: 9999,
          });
          // Right Cannon
          confetti({
            particleCount,
            angle: 120,
            spread: 70,
            origin: { x: 1, y: 0.72 },
            colors,
            zIndex: 9999,
          });
          // Star bursts
          confetti({
            particleCount: 12,
            spread: 360,
            ticks: 50,
            gravity: 0.4,
            decay: 0.94,
            startVelocity: 28,
            shapes: ['star'],
            colors: ['#ffd700', '#ffffff', '#ff1f43'],
            origin: { x: Math.random(), y: Math.random() * 0.4 + 0.2 },
            zIndex: 9999,
          });
        } catch (e) {}
      }, 250);

      return () => clearInterval(interval);
    } else if (status === 'gameover') {
      audioEngine.playGameOver();
    }
  }, [status]);

  // Listen for socket sound effect events and audience interactive toasts
  useEffect(() => {
    if (!socket) return;

    const onSurgePulse = ({ intensity, operativeNumber, name, playerName }) => {
      audioEngine.playShakeZap(intensity);
      setShakeFlash(true);
      setTimeout(() => setShakeFlash(false), 80);

      const opName = name || playerName || (operativeNumber ? `Operative #${operativeNumber}` : 'Audience Operative');
      const now = Date.now();

      // Ensure operative is in roster list
      if (opName && !opName.startsWith('Audience Operative')) {
        setJoinedOperatives((prev) => {
          if (prev.some((p) => p.name === opName)) return prev;
          return [...prev, { id: `${now}-${Math.random()}`, name: opName, time: now }];
        });
      }

      // Spawn floating surge name tag
      if (now - lastFloatingSurgeTimeRef.current > 110) {
        lastFloatingSurgeTimeRef.current = now;
        const newSurge = {
          id: `${now}-${Math.random()}`,
          name: opName,
          intensity: intensity || 1.0,
          leftPercent: Math.floor(Math.random() * 55) + 5,
          duration: (1.8 + Math.random() * 0.7).toFixed(2),
        };
        setFloatingSurges((prev) => [...prev.slice(-16), newSurge]);
      }

      if (now - lastToastTimeRef.current > 1200) {
        lastToastTimeRef.current = now;
        const toast = { id: now, text: `${opName} +SURGE ENERGY! ⚡`, type: 'surge' };
        setAudienceToasts((prev) => [...prev.slice(-2), toast]);
        setTimeout(() => {
          setAudienceToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, 2200);
      }
    };

    const onParticipantJoined = (data) => {
      const name = data?.name || data?.playerName || (data?.operativeNumber ? `Operative #${data.operativeNumber}` : 'New Operative');
      setJoinedOperatives((prev) => {
        if (prev.some((p) => p.name === name)) return prev;
        return [...prev, { id: `${Date.now()}-${Math.random()}`, name, time: Date.now() }];
      });
      setRecentOperativeNames((prev) => [name, ...prev.filter((n) => n !== name)].slice(0, 10));
      const toast = { id: Date.now() + Math.random(), text: `${name} JOINED THE SURGE! ⚡`, type: 'join' };
      setAudienceToasts((prev) => [...prev.slice(-2), toast]);
      setTimeout(() => {
        setAudienceToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3000);
    };

    const onBoostActivated = () => {
      audioEngine.playBoostSurge();
      setBoostAnimating(true);
      setTimeout(() => setBoostAnimating(false), 400);
      const toast = { id: Date.now(), text: `🔥 SYSTEM BOOST ENGAGED! +25%`, type: 'boost' };
      setAudienceToasts((prev) => [...prev.slice(-2), toast]);
      setTimeout(() => {
        setAudienceToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 2500);
    };

    const onMultiplierUp = ({ multiplier: newMult }) => {
      audioEngine.playMultiplierUp(newMult);
      const toast = { id: Date.now(), text: `⚡ ${newMult}X SURGE MULTIPLIER ACTIVE!`, type: 'multiplier' };
      setAudienceToasts((prev) => [...prev.slice(-2), toast]);
      setTimeout(() => {
        setAudienceToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 2500);
    };

    socket.on('surge_pulse', onSurgePulse);
    socket.on('participant_joined', onParticipantJoined);
    socket.on('boost_activated', onBoostActivated);
    socket.on('multiplier_up', onMultiplierUp);

    return () => {
      socket.off('surge_pulse', onSurgePulse);
      socket.off('participant_joined', onParticipantJoined);
      socket.off('boost_activated', onBoostActivated);
      socket.off('multiplier_up', onMultiplierUp);
    };
  }, [socket]);

  // Auto-scroll joined operatives roster container when new members join
  useEffect(() => {
    if (rosterListRef.current) {
      rosterListRef.current.scrollTop = rosterListRef.current.scrollHeight;
    }
  }, [joinedOperatives.length]);

  // Sync simulated operatives when crowd simulator is active
  useEffect(() => {
    if (simulatingCrowd) {
      setJoinedOperatives(SIMULATED_NAMES.map((name, i) => ({
        id: `sim-${i}`,
        name: `${name} (#${i + 1})`,
        time: Date.now(),
      })));
    }
  }, [simulatingCrowd]);

  // Clean up floating surges after animation completes
  useEffect(() => {
    if (floatingSurges.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setFloatingSurges((prev) => prev.filter((item) => {
        const itemTimestamp = Number(item.id.split('-')[0]);
        return now - itemTimestamp < 2600;
      }));
    }, 400);
    return () => clearInterval(interval);
  }, [floatingSurges.length]);

  // In-Browser 150-Crowd Simulator Loop (Active when simulatingCrowd is ON)
  useEffect(() => {
    if (!simulatingCrowd || status !== 'playing' || !socket) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      return;
    }

    // 150 simulated operatives shaking at randomized realistic intervals with diverse Ghanaian names
    simIntervalRef.current = setInterval(() => {
      if (socket) {
        const randIntensity = Number((0.9 + Math.random() * 0.9).toFixed(2));
        const simName = SIMULATED_NAMES[Math.floor(Math.random() * SIMULATED_NAMES.length)];
        socket.emit('shake_pulse', { intensity: randIntensity, playerName: simName });
      }
    }, 65);

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [simulatingCrowd, status, socket]);

  // Keyboard shortcut listener for easy testing / accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      audioEngine.ensureRunning();
      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'lobby') {
          handleStartGame();
        } else if (status === 'playing' && socket) {
          socket.emit('shake_pulse', { intensity: 1.2 });
        }
      } else if (e.code === 'KeyS' && status === 'lobby') {
        e.preventDefault();
        handleStartGame();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleResetGame();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        setSimulatingCrowd((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [socket, status]);

  const handleStartGame = () => {
    audioEngine.ensureRunning();
    if (socket) socket.emit('start_game');
  };

  const handleResetGame = () => {
    audioEngine.ensureRunning();
    if (socket) socket.emit('reset_game');
  };

  const handleToggleMute = () => {
    audioEngine.ensureRunning();
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(controllerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="relative w-screen h-screen max-h-screen bg-[#070204] text-white flex flex-col justify-between p-2 sm:p-3 md:p-4 overflow-hidden select-none font-rajdhani">
      
      {/* Background Industrial Skyline Silhouette & Lightning Atmospherics */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Dark Red Nebula Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c060b] via-[#0d0305] to-[#050102]" />
        
        {/* Background Electric Lightning Flash Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-transparent via-[#ff1f43]/10 to-transparent bg-lightning-flash ${
          boostAnimating ? 'opacity-40 bg-[#ff1f43]/30 transition-opacity' : ''
        }`} />

        {/* Industrial Tower Silhouettes at Horizon */}
        <svg className="absolute bottom-0 w-full h-36 md:h-48 opacity-25 text-[#1f070b]" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,200 L0,140 L40,140 L50,80 L60,80 L70,140 L120,140 L140,110 L160,140 L220,140 L230,60 L240,60 L250,140 L340,140 L360,95 L390,140 L460,140 L480,40 L495,40 L510,140 L600,140 L620,105 L650,140 L720,140 L735,70 L750,140 L830,140 L850,50 L870,140 L960,140 L980,100 L1010,140 L1100,140 L1120,75 L1140,140 L1200,140 L1200,200 Z" />
        </svg>

        {/* Scanlines Effect */}
        <div className="absolute inset-0 scanlines" />
      </div>

      {/* Screen Edge Bevel Outer Border (Cyberpunk Metal Enclosure) */}
      <div className="absolute inset-1.5 sm:inset-2 md:inset-4 border border-[#42111a]/80 pointer-events-none z-10 sci-fi-cut">
        {/* Corner Rivet Details */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#ff2a4b]/40 shadow-[0_0_8px_#ff2a4b]" />
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff2a4b]/40 shadow-[0_0_8px_#ff2a4b]" />
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#ff2a4b]/40 shadow-[0_0_8px_#ff2a4b]" />
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#ff2a4b]/40 shadow-[0_0_8px_#ff2a4b]" />
      </div>

      {/* ==================================================== */}
      {/* 1. TOP HEADER                                       */}
      {/* ==================================================== */}
      <header className={`relative z-20 flex items-center justify-between px-2 sm:px-4 md:px-6 py-1 shrink-0 ${
        isBooting || status === 'playing' ? 'animate-cyber-down' : ''
      }`}>
        {/* Left: Telecel SME Month Official Brand Logo */}
        <div className="flex items-center min-w-0 pr-2">
          <LaunchLogo 
            className="w-auto h-11 sm:h-13 md:h-15 lg:h-16 max-w-[190px] sm:max-w-[240px] md:max-w-[290px] object-contain drop-shadow-[0_0_20px_rgba(255,31,67,0.9)]" 
            animate={false} 
          />
        </div>

        {/* Right: Utility & Audio Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          {/* 150-Crowd Simulator Toggle */}
          <button
            onClick={() => setSimulatingCrowd(!simulatingCrowd)}
            title="Toggle 150-Operative Crowd Simulator (Key: C)"
            aria-label="Toggle Crowd Simulation"
            className={`px-2 sm:px-2.5 h-8 sm:h-9 flex items-center justify-center gap-1.5 border transition-all sci-fi-cut-sm font-orbitron font-bold text-[10px] sm:text-xs cursor-pointer ${
              simulatingCrowd 
                ? 'bg-[#ff1f43] border-white text-white shadow-neon-red animate-pulse' 
                : 'bg-[#25080e]/80 border-[#521520] hover:border-[#ff2a4b] text-[#ff8095] hover:text-white'
            }`}
          >
            <Users size={14} className={simulatingCrowd ? 'animate-bounce' : ''} />
            <span className="hidden sm:inline">{simulatingCrowd ? '150 CROWD ON' : 'SIM 150'}</span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={handleToggleMute}
            aria-label="Toggle Audio"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#25080e]/80 border border-[#521520] hover:border-[#ff2a4b] hover:bg-[#3d0d17] transition-all sci-fi-cut-sm text-[#ff8095] hover:text-white"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Help Button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            aria-label="How to play"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#25080e]/80 border border-[#521520] hover:border-[#ff2a4b] hover:bg-[#3d0d17] transition-all sci-fi-cut-sm text-[#ff8095] hover:text-white"
          >
            <HelpCircle size={16} />
          </button>

          {/* Reset / Settings */}
          <button
            onClick={handleResetGame}
            title="Reset Game / Lobby"
            aria-label="Reset Game"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#25080e]/80 border border-[#521520] hover:border-[#ff2a4b] hover:bg-[#3d0d17] transition-all sci-fi-cut-sm text-[#ff8095] hover:text-white"
          >
            <RotateCcw size={16} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
            className="w-8 h-8 sm:w-9 sm:h-9 hidden sm:flex items-center justify-center bg-[#25080e]/80 border border-[#521520] hover:border-[#ff2a4b] hover:bg-[#3d0d17] transition-all sci-fi-cut-sm text-[#ff8095] hover:text-white"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 2. MAIN 3-COLUMN GAME HUD (Hero Reactor Layout)     */}
      {/* ==================================================== */}
      <main className="relative z-20 flex-1 min-h-0 grid grid-cols-12 gap-2 sm:gap-3 md:gap-4 lg:gap-6 items-center px-1 sm:px-2 md:px-4 my-auto max-w-[1600px] mx-auto w-full h-full">
        
        {/* -------------------------------------------------- */}
        {/* LEFT COLUMN: Live Floating Surge Stream or Lobby HUD */}
        {/* -------------------------------------------------- */}
        <div className={`col-span-12 md:col-span-3 flex flex-col gap-1.5 sm:gap-2 md:gap-2.5 order-2 md:order-1 justify-center ${
          isBooting || status === 'playing' ? 'animate-cyber-left' : ''
        }`}>
          
          {status === 'playing' ? (
            /* ============================================== */
            /* PLAYING MODE: LIVE FLOATING PARTICIPANT STREAM  */
            /* ============================================== */
            <>
              {/* SURGE STREAM HEADER */}
              <div className="hud-panel p-2 sm:p-2.5 sci-fi-cut flex items-center gap-2">
                <Activity size={16} className="text-[#ff1f43] animate-pulse shrink-0" />
                <span className="font-orbitron font-black text-xs sm:text-sm text-white uppercase tracking-wider drop-shadow-[0_0_8px_#ff1f43]">
                  SURGE STREAM
                </span>
              </div>

              {/* FLOATING NAMES SURGE CASCADE CONTAINER (TALL & DYNAMIC) */}
              <div className="hud-panel p-2.5 sm:p-3 sci-fi-cut h-[220px] sm:h-[260px] md:h-[300px] lg:h-[330px] relative overflow-hidden flex flex-col justify-end shadow-neon-red">
                {/* Ambient Grid & Background Lightning Glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#3a0812]/75 via-[#180408]/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 scanlines opacity-10 pointer-events-none" />

                {/* Floating Participant Surge Badges */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {floatingSurges.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 text-[#ff8095]/60 animate-pulse">
                      <Zap size={24} className="text-[#ff1f43] mb-1.5 animate-bounce" />
                      <span className="font-orbitron font-bold text-xs uppercase tracking-wider">
                        SHAKE PHONES TO SURGE!
                      </span>
                    </div>
                  ) : (
                    floatingSurges.map((surge) => (
                      <div
                        key={surge.id}
                        className="absolute bottom-2 animate-float-up pointer-events-none z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#440a15]/95 via-[#22060c]/95 to-[#440a15]/95 border border-[#ff1f43] shadow-[0_0_18px_rgba(255,31,67,0.7)] backdrop-blur-sm whitespace-nowrap"
                        style={{
                          left: `${surge.leftPercent}%`,
                          animationDuration: `${surge.duration}s`,
                        }}
                      >
                        <Zap size={13} className="text-[#ff1f43] animate-bounce shrink-0" />
                        <span className="font-orbitron font-black text-xs sm:text-sm text-white tracking-wide drop-shadow-[0_0_8px_#ff1f43] max-w-[130px] sm:max-w-[160px] truncate">
                          {surge.name}
                        </span>
                        <span className="font-mono text-[9px] text-[#ffccd5] font-bold">
                          +SURGE
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Live Stream Base Indicator */}
                <div className="relative z-10 w-full pt-1.5 border-t border-[#521520] flex items-center justify-between text-[10px] text-[#ff8095]">
                  <span className="font-orbitron font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Zap size={11} className="text-[#ff1f43] animate-pulse" />
                    LIVE SURGES
                  </span>
                  <span className="font-orbitron font-bold text-white">
                    {multiplier}X MULTIPLIER
                  </span>
                </div>
              </div>

              {/* MASSIVE MID-GAME STAGE QR CODE CARD: SCAN TO JOIN LIVE */}
              <div className="hud-panel p-2.5 sm:p-3 sci-fi-cut flex flex-col items-center bg-gradient-to-b from-[#2d0a14]/95 via-[#180408]/95 to-[#0e0205]/95 border-2 border-[#ff1f43] shadow-[0_0_30px_rgba(255,31,67,0.5)]">
                <div className="flex items-center justify-between w-full mb-1.5 pb-1 border-b border-[#4d131d]">
                  <div className="flex items-center gap-1.5">
                    <QrCode size={15} className="text-[#ff1f43] animate-pulse" />
                    <span className="font-orbitron font-black text-xs sm:text-sm text-white tracking-wider uppercase drop-shadow-[0_0_8px_#ff1f43]">
                      SCAN TO JOIN LIVE
                    </span>
                  </div>
                  <span className="font-orbitron text-[10px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-1 bg-[#102416] px-2 py-0.5 rounded-full border border-green-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    OPEN
                  </span>
                </div>

                {/* Extra-Large High-Contrast QR Code Box */}
                <div className="relative w-full max-w-[210px] sm:max-w-[240px] md:max-w-[260px] aspect-square p-2.5 sm:p-3 bg-white rounded-2xl sm:rounded-3xl shadow-[0_0_30px_rgba(255,31,67,0.75)] border-3 sm:border-4 border-[#ff1f43] flex items-center justify-center my-1">
                  <QRCodeSVG
                    value={controllerUrl}
                    size={240}
                    level="M"
                    includeMargin={false}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 bg-[#120407] text-[#ff4d6d] font-orbitron font-black text-[9px] sm:text-[10px] px-3.5 sm:px-4 py-0.5 border-2 border-[#ff1f43] rounded-full whitespace-nowrap shadow-[0_0_15px_#ff1f43] z-10">
                    SCAN TO SYNC ⚡
                  </div>
                </div>

                <span className="text-[10px] sm:text-[11px] text-[#ffccd5] text-center mt-2 font-semibold leading-tight">
                  Point camera to jump straight into the live game!
                </span>
              </div>
            </>
          ) : (
            /* ============================================== */
            /* LOBBY MODE: AUDIENCE HUD & OBJECTIVES           */
            /* ============================================== */
            <>
              {/* OBJECTIVE CARD */}
              <div className="hud-panel p-2.5 sm:p-3 sci-fi-cut">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#ff4d6d] uppercase block mb-0.5">
                  LAUNCH MISSION
                </span>
                <p className="font-orbitron font-semibold text-xs md:text-sm text-gray-200 uppercase tracking-wide">
                  SURGE COLLECTIVE POWER TO 100%!
                </p>
              </div>

              {/* CONNECTED AUDIENCE CARD */}
              <div className="hud-panel p-2.5 sm:p-3 sci-fi-cut">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#ff4d6d] uppercase block mb-0.5">
                    CONNECTED AUDIENCE
                  </span>
                  <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider">
                    ● READY
                  </span>
                </div>
                <div className="font-orbitron font-black text-xl sm:text-2xl md:text-3xl text-white tracking-wider text-glow-red">
                  {gameState.connectedCount || 0}
                </div>
                {recentOperativeNames.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-[#4d131d] text-[10px] text-[#ff8095] truncate">
                    <span className="text-gray-400">Joined: </span>
                    <span className="text-white font-bold">{recentOperativeNames.slice(0, 3).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* COLLECTIVE SCORE CARD */}
              <div className="hud-panel p-2 sm:p-2.5 sci-fi-cut">
                <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#a83244] uppercase block mb-0.5">
                  COLLECTIVE ENERGY
                </span>
                <div className="font-orbitron font-bold text-base sm:text-lg md:text-xl text-[#f08095] tracking-wider">
                  {score.toLocaleString()}
                </div>
              </div>

              {/* RADIAL MULTIPLIER CARD */}
              <div className="hud-panel p-2 sm:p-2.5 sci-fi-cut flex flex-col items-center">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#ff4d6d] uppercase mb-0.5">
                  MULTIPLIER
                </span>
                <MultiplierGauge multiplier={multiplier} progress={multiplierProgress} />
              </div>

              {/* STATUS FOOTER BADGE */}
              <div className="hud-panel p-2 sm:p-2.5 sci-fi-cut flex items-center justify-center gap-2 border-[#801b2a]">
                <Zap size={14} className="text-[#ff1f43] animate-pulse shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#ff99aa] uppercase truncate">
                  WAITING FOR LAUNCH ACTIVATION
                </span>
              </div>
            </>
          )}

        </div>

        {/* -------------------------------------------------- */}
        {/* CENTER COLUMN: Central High-Voltage Reactor Core   */}
        {/* -------------------------------------------------- */}
        <div className={`col-span-12 md:col-span-6 flex flex-col items-center justify-center relative order-1 md:order-2 h-full py-0.5 sm:py-1 ${
          isBooting || status === 'playing' ? 'animate-cyber-core' : ''
        }`}>
          
          {/* Centered System Charge Percentage Display (Directly Aligned Above Voltage Chamber) */}
          <div className="flex flex-col items-center mb-1 sm:mb-1.5 z-20 shrink-0">
            <span className="text-[10px] sm:text-xs md:text-sm tracking-widest font-orbitron font-bold text-[#ff8095] uppercase drop-shadow-[0_0_8px_#ff1f43]">
              {status === 'playing' ? 'SYSTEM CHARGE' : 'MAX VOLTAGE'}
            </span>
            <div className="mt-0.5 px-5 sm:px-7 py-0.5 sm:py-1 bg-[#22070c]/90 border-2 border-[#ff1f43]/70 sci-fi-cut-sm shadow-[0_0_18px_rgba(255,31,67,0.55)]">
              <span className="font-orbitron font-black text-xl sm:text-2xl md:text-3xl tracking-wider text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]">
                {status === 'playing' ? `${Math.floor(voltage)}%` : '100%'}
              </span>
            </div>
          </div>

          {/* Main Heavy Reactor Assembly */}
          <div className="relative w-full max-w-[340px] sm:max-w-[380px] md:max-w-[440px] lg:max-w-[480px] h-[52vh] sm:h-[56vh] md:h-[60vh] max-h-[520px] flex items-center justify-center">
            
            {/* Left & Right Insulator Coils & Heavy Conduit Cables */}
            {/* Left Insulator Coil */}
            <div className="absolute -left-2 md:-left-4 bottom-8 sm:bottom-10 z-10 flex flex-col items-center pointer-events-none">
              <div className="w-8 sm:w-10 h-14 sm:h-16 md:w-11 md:h-18 bg-gradient-to-b from-[#2a0b12] to-[#120407] border-2 border-[#631826] rounded-t-md flex flex-col justify-evenly items-center shadow-[0_0_20px_rgba(255,31,67,0.4)]">
                <div className="w-6 sm:w-8 md:w-9 h-1.5 sm:h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
                <div className="w-6 sm:w-8 md:w-9 h-1.5 sm:h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
                <div className="w-6 sm:w-8 md:w-9 h-1.5 sm:h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
              </div>
              <div className="w-10 sm:w-14 h-5 sm:h-7 bg-[#180509] border border-[#50131e] rounded-b-md" />
              {/* Cable connecting into base */}
              <svg className="w-10 sm:w-14 h-7 sm:h-9 text-[#3d0f17]" viewBox="0 0 50 30">
                <path d="M 10 0 C 15 25, 40 25, 50 20" fill="none" stroke="currentColor" strokeWidth="4" />
              </svg>
            </div>

            {/* Right Insulator Coil */}
            <div className="absolute -right-2 md:-right-4 bottom-8 sm:bottom-10 z-10 flex flex-col items-center pointer-events-none">
              <div className="w-8 sm:w-10 h-14 sm:h-16 md:w-11 md:h-18 bg-gradient-to-b from-[#2a0b12] to-[#120407] border-2 border-[#631826] rounded-t-md flex flex-col justify-evenly items-center shadow-[0_0_20px_rgba(255,31,67,0.4)]">
                <div className="w-6 sm:w-8 md:w-9 h-1.5 sm:h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
                <div className="w-6 sm:w-8 md:w-9 h-1.5 sm:h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
                <div className="w-6 sm:w-8 md:w-9 h-1.5 sm:h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
              </div>
              <div className="w-10 sm:w-14 h-5 sm:h-7 bg-[#180509] border border-[#50131e] rounded-b-md" />
              {/* Cable connecting into base */}
              <svg className="w-10 sm:w-14 h-7 sm:h-9 text-[#3d0f17]" viewBox="0 0 50 30">
                <path d="M 40 0 C 35 25, 10 25, 0 20" fill="none" stroke="currentColor" strokeWidth="4" />
              </svg>
            </div>

            {/* Height Percentage Ruler Ticks (0%, 25%, 50%, 75%, 100%) */}
            <div className="absolute right-4 md:right-7 top-[10%] bottom-[15%] flex flex-col justify-between items-start text-[11px] sm:text-xs md:text-sm font-orbitron font-bold text-[#802434] pointer-events-none z-10">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="w-3 sm:w-4 h-0.5 bg-[#802434]" />
                <span className={voltage >= 95 ? 'text-white font-bold text-glow-red text-xs sm:text-base' : ''}>100%</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="w-2.5 sm:w-3 h-0.5 bg-[#802434]" />
                <span className={voltage >= 75 ? 'text-[#ff4d6d] font-bold' : ''}>75%</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="w-2.5 sm:w-3 h-0.5 bg-[#802434]" />
                <span className={voltage >= 50 ? 'text-[#ff4d6d] font-bold' : ''}>50%</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="w-2.5 sm:w-3 h-0.5 bg-[#802434]" />
                <span className={voltage >= 25 ? 'text-[#ff4d6d] font-bold' : ''}>25%</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="w-3 sm:w-4 h-0.5 bg-[#802434]" />
                <span className="text-[#a03043]">0%</span>
              </div>
            </div>

            {/* Procedural HTML5 Canvas Reactor Tube */}
            <div className="relative w-full h-full z-0 flex items-center justify-center">
              <ReactorCanvas
                voltage={voltage}
                isOverloaded={voltage >= 90}
                isSurging={shakeFlash || boostAnimating}
              />
            </div>

            {/* Bottom Reactor Base Chassis & Status Button */}
            <div className="absolute -bottom-3 inset-x-2 sm:inset-x-4 md:inset-x-6 z-20 flex flex-col items-center">
              <div className="w-full py-1.5 sm:py-2 px-4 sm:px-6 bg-gradient-to-r from-[#2a0a10] via-[#47111b] to-[#2a0a10] border-2 border-[#7a1c2d] sci-fi-cut flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,31,67,0.45)]">
                <Zap size={16} className={`text-[#ff1f43] ${voltage > 0 ? 'animate-bounce' : ''}`} />
                <span className="font-orbitron font-black text-[11px] sm:text-xs md:text-sm tracking-widest text-white uppercase drop-shadow-[0_0_10px_rgba(255,31,67,0.9)]">
                  {status === 'playing' ? (voltage > 70 ? 'CRITICAL SURGE' : 'VOLTAGE RISING') : 'STANDBY MODE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* RIGHT COLUMN: How to Play Cards & Status           */}
        {/* -------------------------------------------------- */}
        <div className={`col-span-12 md:col-span-3 flex flex-col gap-1.5 sm:gap-2 md:gap-2.5 order-3 justify-center ${
          isBooting || status === 'playing' ? 'animate-cyber-right' : ''
        }`}>
          
          {/* HOW TO PLAY CARDS */}
          <div className="hud-panel p-2.5 sm:p-3 sci-fi-cut flex flex-col gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#ff4d6d] uppercase block">
              HOW TO PLAY
            </span>

            {/* Rule 1 */}
            <div className="flex items-start gap-2 sm:gap-2.5 bg-[#170508]/60 p-1.5 sm:p-2 rounded border border-[#3b0f17]">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-[#330c14] flex items-center justify-center shrink-0 border border-[#661827]">
                <Zap size={14} className="text-[#ff1f43]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] sm:text-xs font-bold text-white uppercase">SHAKE TO SURGE</span>
                <span className="text-[10px] sm:text-[11px] text-[#b85c6c] leading-tight">Shake your phones rapidly to raise voltage</span>
              </div>
            </div>

            {/* Rule 2 */}
            <div className="flex items-start gap-2 sm:gap-2.5 bg-[#170508]/60 p-1.5 sm:p-2 rounded border border-[#3b0f17]">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-[#330c14] flex items-center justify-center shrink-0 border border-[#661827]">
                <Activity size={14} className="text-[#ff1f43]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] sm:text-xs font-bold text-white uppercase">KEEP ENERGY FLOWING</span>
                <span className="text-[10px] sm:text-[11px] text-[#b85c6c] leading-tight">Maintain rhythm together to multiply power</span>
              </div>
            </div>

            {/* Rule 3 */}
            <div className="flex items-start gap-2 sm:gap-2.5 bg-[#170508]/60 p-1.5 sm:p-2 rounded border border-[#3b0f17]">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-[#330c14] flex items-center justify-center shrink-0 border border-[#661827]">
                <ShieldAlert size={14} className="text-[#ff1f43]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] sm:text-xs font-bold text-white uppercase">DON'T LET IT DROP</span>
                <span className="text-[10px] sm:text-[11px] text-[#b85c6c] leading-tight">Voltage drains continuously if shaking stops</span>
              </div>
            </div>
          </div>

          {/* AUDIENCE MOTIVATION / KEEP SHAKING DIRECTIVE CARD */}
          <div className="hud-panel p-2.5 sm:p-3.5 sci-fi-cut flex flex-col items-center justify-center text-center relative overflow-hidden border-2 border-[#801b2a] shadow-neon-red">
            {/* Background Ambient Glow */}
            <div className={`absolute inset-0 bg-gradient-to-b from-[#ff1f43]/25 via-[#ff1f43]/10 to-transparent transition-opacity duration-300 pointer-events-none ${
              shakeFlash ? 'opacity-100' : 'opacity-40'
            }`} />

            {/* Glowing Dynamic Prompt (SHAKE PHONES) */}
            <div className={`font-orbitron font-black text-base sm:text-lg md:text-xl tracking-wider uppercase text-glow-red transition-all duration-300 z-10 ${
              shakeFlash ? 'scale-105 brightness-150 text-white' : 'text-[#ffccd5]'
            }`}>
              {status === 'playing' 
                ? (voltage > 80 ? 'CRITICAL SURGE! 🔥' : (voltage > 50 ? 'MORE POWER! 🚀' : 'SHAKE PHONES! ⚡')) 
                : 'READY TO SURGE'}
            </div>

            <p className="text-[10px] sm:text-[11px] text-[#ff99aa] mt-1 z-10">
              {status === 'playing'
                ? 'Everyone shake continuously to surge power to 100%!'
                : 'Scan QR code with your phone to join'}
            </p>
          </div>

          {/* REAL-TIME SYSTEM CORE STATUS CARD */}
          <div className="hud-panel p-2.5 sm:p-3 sci-fi-cut flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Zap size={16} className="text-[#ff1f43] animate-pulse" />
              <span className="font-orbitron font-bold text-[11px] sm:text-xs text-gray-200 uppercase tracking-wider">
                CORE STATUS
              </span>
            </div>
            <span className="font-orbitron font-black text-xs sm:text-sm text-[#ff4d6d] tracking-widest uppercase">
              {status === 'playing' ? (voltage > 75 ? 'MAX OVERCHARGE' : 'POWER RISING') : 'LOBBY STANDBY'}
            </span>
          </div>

          {/* Quick Keyboard Hint */}
          <div className="text-[10px] text-center text-[#7a2c39] flex items-center justify-center gap-1 mt-0.5">
            <Keyboard size={12} />
            <span>Shortcuts: [S] Start • [Space] Shake • [C] 150 Crowd Sim • [R] Reset</span>
          </div>

        </div>

      </main>

      {/* ==================================================== */}
      {/* LIVE AUDIENCE ACTIVITY TOAST OVERLAY FEED            */}
      {/* ==================================================== */}
      {audienceToasts.length > 0 && (
        <div className="fixed top-18 sm:top-20 right-4 sm:right-6 z-50 pointer-events-none flex flex-col gap-2 max-w-xs sm:max-w-sm">
          {audienceToasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-3.5 py-2 rounded-xl backdrop-blur-md border shadow-neon-red flex items-center gap-2.5 animate-cyber-down ${
                toast.type === 'join'
                  ? 'bg-[#25070d]/95 border-[#ff1f43] text-white'
                  : toast.type === 'boost'
                  ? 'bg-[#3b0914]/95 border-[#ff9900] text-yellow-300'
                  : 'bg-[#180307]/95 border-[#ff4d6d]/80 text-[#ffccd5]'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-[#ff1f43]/25 flex items-center justify-center shrink-0 border border-[#ff1f43]/50">
                <Zap size={13} className="text-[#ff1f43] animate-bounce" />
              </div>
              <span className="font-orbitron font-bold text-[11px] sm:text-xs tracking-wider uppercase">
                {toast.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ==================================================== */}
      {/* CINEMATIC VOLTAGE-TIERED MOTIVATIONAL OVERLAY        */}
      {/* ==================================================== */}
      {status === 'playing' && overlayMessage && (
        <div 
          className={`fixed inset-0 z-40 pointer-events-none flex items-center justify-center transition-all duration-700 ${
            overlayVisible 
              ? 'opacity-100 scale-100 blur-0' 
              : 'opacity-0 scale-90 blur-sm'
          }`}
        >
          <div className="relative max-w-4xl mx-4 px-6 py-4 flex flex-col items-center justify-center text-center">
            {/* Ambient Radial Energy Core */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ff1f43]/25 to-transparent blur-2xl rounded-full" />
            <div className="absolute inset-x-0 h-0.5 top-0 bg-gradient-to-r from-transparent via-[#ff1f43] to-transparent shadow-[0_0_20px_#ff1f43]" />
            <div className="absolute inset-x-0 h-0.5 bottom-0 bg-gradient-to-r from-transparent via-[#ff1f43] to-transparent shadow-[0_0_20px_#ff1f43]" />

            {/* Hi-Tech HUD Framing Box */}
            <div className="relative z-10 bg-[#160307]/90 backdrop-blur-md px-6 md:px-12 py-4 md:py-6 rounded-2xl border-2 border-[#ff1f43]/80 shadow-[0_0_50px_rgba(255,31,67,0.6)] sci-fi-cut">
              <div className="font-orbitron font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-widest uppercase text-glow-red drop-shadow-[0_0_25px_#ff1f43]">
                {overlayMessage.title}
              </div>
              {overlayMessage.sub && (
                <p className="font-rajdhani font-bold text-xs sm:text-base md:text-xl text-[#ffccd5] tracking-[0.25em] uppercase mt-2 drop-shadow-[0_0_8px_#ff1f43]">
                  {overlayMessage.sub}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. FULL-SCREEN IMMERSIVE LOBBY & PAIRING SCREEN     */}
      {/* ==================================================== */}
      {status === 'lobby' && (
        <div className="fixed inset-0 z-50 w-screen h-screen max-h-screen bg-[#0a0204] flex flex-col justify-between p-2.5 sm:p-4 md:p-6 overflow-hidden select-none animate-fade-in">
          
          {/* Ambient Background Radial Glows */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <div 
              className="absolute inset-0 w-full h-full"
              style={{
                background: 'radial-gradient(ellipse 120% 90% at 50% 45%, #6e1020 0%, #380811 45%, #180206 80%, #080103 100%)'
              }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] h-[140vh] rounded-full bg-[#ff1f43]/15 blur-[120px] animate-pulse" />
            <div className="absolute inset-0 scanlines opacity-20" />
          </div>

          {/* Fullscreen Outer Sci-Fi Border */}
          <div className="absolute inset-1.5 sm:inset-3 md:inset-4 border-2 border-[#ff1f43]/40 pointer-events-none z-10 sci-fi-cut shadow-[0_0_40px_rgba(255,31,67,0.25)]">
            <div className="absolute top-2 left-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute top-2 right-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute bottom-2 left-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute bottom-2 right-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
          </div>

          {/* Top: Telecel SME Month Logo & Headline */}
          <div className="relative z-20 flex flex-col items-center text-center mt-0.5 sm:mt-1 shrink-0">
            <div className="w-full max-w-[400px] sm:max-w-[520px] md:max-w-[650px] lg:max-w-[760px] max-h-[15vh] sm:max-h-[18vh] md:max-h-[22vh] flex items-center justify-center mb-1 sm:mb-1.5">
              <LaunchLogo className="w-full h-auto max-w-full max-h-[15vh] sm:max-h-[18vh] md:max-h-[22vh] object-contain" animate={false} />
            </div>
            
            <h2 className="font-orbitron font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-wider uppercase text-white drop-shadow-[0_0_18px_#ff1f43] mt-0.5">
              SCAN TO JOIN THE SME SURGE
            </h2>
            <p className="text-[11px] sm:text-xs md:text-sm text-[#ff99aa] max-w-xl sm:max-w-2xl mt-0.5 sm:mt-1 px-4 leading-tight sm:leading-normal">
              Everyone in the audience scan with your smartphone! When the activation begins, shake your phones together to surge the voltage to 100%!
            </p>
          </div>

          {/* Center Stage: Split Hero Presentation Area (Matching Height QR Code + Connected Counter) */}
          <div className="relative z-20 flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 items-center justify-items-center max-w-4xl lg:max-w-5xl mx-auto w-full my-auto px-2 sm:px-4">
            
            {/* Left: Large High-Contrast Stage QR Code Box */}
            <div className="flex items-center justify-center w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[390px] h-full max-h-[38vh] sm:max-h-[42vh] md:max-h-[46vh] min-h-[180px]">
              {tunnelReady || showLocalFallback ? (
                <div className="relative w-full h-full p-3 sm:p-4 md:p-5 bg-white rounded-2xl sm:rounded-3xl shadow-[0_0_40px_rgba(255,31,67,0.75)] border-[3px] sm:border-4 border-[#ff1f43] flex items-center justify-center">
                  <QRCodeSVG
                    value={controllerUrl}
                    size={300}
                    level="H"
                    includeMargin={false}
                    className="w-full h-full max-h-[82%] max-w-[82%] object-contain"
                  />
                  <div className="absolute -bottom-3 sm:-bottom-3.5 left-1/2 transform -translate-x-1/2 bg-[#120407] text-[#ff4d6d] font-orbitron font-bold text-[10px] sm:text-xs md:text-sm px-3 sm:px-4 py-0.5 sm:py-1 border-2 border-[#ff1f43] rounded-full whitespace-nowrap shadow-[0_0_15px_#ff1f43] z-10">
                    {tunnelReady ? 'SCAN TO SYNC ⚡' : 'LOCAL WI-FI (FALLBACK)'}
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full p-4 sm:p-6 bg-[#170508] rounded-2xl sm:rounded-3xl border-2 border-[#521520] flex flex-col items-center justify-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 sm:border-4 border-[#ff1f43] border-t-transparent rounded-full animate-spin" />
                  <span className="font-orbitron font-bold text-xs sm:text-sm text-[#ff8095] uppercase tracking-wider animate-pulse text-center">
                    ESTABLISHING SECURE LINK...
                  </span>
                  <button
                    onClick={() => setShowLocalFallback(true)}
                    className="mt-1 text-[11px] sm:text-xs text-[#ff4d6d] underline hover:text-white transition-colors cursor-pointer"
                  >
                    Or use local network QR code
                  </button>
                </div>
              )}
            </div>

            {/* Right: Live Audience Roster Box (Matching Height) */}
            <div className="flex items-center justify-center w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[390px] h-full max-h-[38vh] sm:max-h-[42vh] md:max-h-[46vh] min-h-[180px]">
              <div className="w-full h-full bg-gradient-to-b from-[#2a0a12]/95 via-[#180408]/95 to-[#0d0205]/95 border-2 border-[#ff1f43]/70 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-[0_0_40px_rgba(255,31,67,0.4)] flex flex-col justify-between sci-fi-cut relative overflow-hidden">
                
                {/* Header: Title & Live Count Badge */}
                <div className="flex items-center justify-between pb-1.5 border-b border-[#4d131d] shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Users size={15} className="text-[#ff1f43] animate-pulse shrink-0" />
                    <span className="font-orbitron font-bold text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow-[0_0_8px_#ff1f43]">
                      CONNECTED OPERATIVES
                    </span>
                  </div>
                  <div className="px-2 py-0.5 rounded-full bg-[#3d0d17] border border-[#ff1f43] flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                    <span className="font-orbitron font-black text-[10px] sm:text-xs text-[#ffccd5]">
                      {gameState.connectedCount || joinedOperatives.length}
                    </span>
                  </div>
                </div>

                {/* Real-Time Scrolling List of Joined Participants */}
                <div 
                  ref={rosterListRef}
                  className="flex-1 min-h-0 overflow-y-auto my-2 pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-[#ff1f43]/40 scrollbar-track-transparent select-none"
                >
                  {joinedOperatives.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-3 text-center text-[#ff8095]/70 animate-pulse my-auto">
                      <Smartphone size={24} className="text-[#ff1f43] mb-1.5 animate-bounce" />
                      <span className="font-orbitron font-bold text-xs uppercase tracking-wider text-white">
                        SCAN QR TO JOIN ROSTER
                      </span>
                      <span className="text-[10px] text-[#ff8095]/80 mt-0.5">
                        Your name will appear here in real-time!
                      </span>
                    </div>
                  ) : (
                    joinedOperatives.map((op, idx) => (
                      <div
                        key={op.id || idx}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#24060c]/90 border border-[#ff1f43]/50 shadow-[0_0_10px_rgba(255,31,67,0.2)] animate-fade-in"
                      >
                        <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                          <div className="w-5 h-5 rounded-full bg-[#ff1f43]/20 border border-[#ff1f43] flex items-center justify-center shrink-0">
                            <Smartphone size={11} className="text-[#ff1f43]" />
                          </div>
                          <span className="font-orbitron font-bold text-xs sm:text-sm text-white truncate drop-shadow-[0_0_6px_#ff1f43]">
                            {op.name}
                          </span>
                        </div>
                        <span className="font-orbitron text-[9px] text-green-400 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          READY
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Status Pill */}
                <div className="pt-1.5 border-t border-[#4d131d] flex items-center justify-between text-[10px] text-[#ff8095] shrink-0">
                  <span className="truncate font-semibold flex items-center gap-1">
                    <Zap size={11} className="text-[#ff1f43] animate-bounce shrink-0" />
                    {(gameState.connectedCount || joinedOperatives.length) > 0 
                      ? `${gameState.connectedCount || joinedOperatives.length} operative${(gameState.connectedCount || joinedOperatives.length) > 1 ? 's' : ''} ready to surge` 
                      : 'Waiting for attendees...'}
                  </span>
                  <span className="font-orbitron text-[9px] text-[#ffccd5] shrink-0 uppercase">
                    STAGE SYNCED
                  </span>
                </div>

              </div>
            </div>

          </div>

          {/* Bottom: Start Launch Sequence CTA */}
          <div className="relative z-20 flex flex-col items-center justify-center w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto mb-0.5 sm:mb-1 shrink-0">
            <button
              onClick={handleStartGame}
              className="w-full py-2.5 sm:py-3.5 md:py-4 px-6 sm:px-8 sci-fi-cut font-orbitron font-black text-sm sm:text-lg md:text-xl tracking-widest uppercase bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] hover:from-[#b01430] hover:via-[#ff3d5e] hover:to-[#b01430] active:scale-95 text-white shadow-neon-red-lg border-2 border-white/60 cursor-pointer transition-all flex items-center justify-center gap-2.5 sm:gap-3"
            >
              <Zap size={20} className="animate-bounce shrink-0" />
              <span>START LAUNCH ACTIVATION</span>
            </button>
            <span className="text-[10px] sm:text-xs text-[#a03d4c] mt-1 font-mono">
              [Spacebar] or [S] on keyboard to start
            </span>
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* 4. FULL-SCREEN IMMERSIVE LAUNCH REVEAL              */}
      {/* ==================================================== */}
      {status === 'victory' && (
        <div 
          className="fixed inset-0 z-50 w-screen h-screen max-h-screen bg-[#100204] flex flex-col items-center justify-between p-2.5 sm:p-4 md:p-6 overflow-hidden select-none animate-fade-in"
        >
          {/* Fullscreen Seamless Radial Red Background Field (Edge-to-Edge) */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Deep Rich Radial Red Gradient spanning the entire display */}
            <div 
              className="absolute inset-0 w-full h-full"
              style={{
                background: 'radial-gradient(ellipse 130% 95% at 50% 50%, #7a1222 0%, #460914 45%, #220409 75%, #0f0103 100%)'
              }}
            />
            {/* Ambient Animated Red Energy Shockwaves */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160vw] h-[160vh] rounded-full bg-[#ff1f43]/15 blur-[100px] animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vh] rounded-full bg-[#ff4d6d]/20 blur-[80px]" />
            <div className="absolute inset-0 scanlines opacity-15" />
          </div>

          {/* Fullscreen Outer Sci-Fi Border */}
          <div className="absolute inset-1.5 sm:inset-3 md:inset-4 border-2 border-[#ff1f43]/40 pointer-events-none z-10 sci-fi-cut shadow-[0_0_40px_rgba(255,31,67,0.25)]">
            <div className="absolute top-2 left-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute top-2 right-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute bottom-2 left-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute bottom-2 right-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
          </div>

          {/* Top Welcome Badge */}
          <div className="relative z-20 mt-1 sm:mt-2 shrink-0">
            <div className="inline-flex items-center px-6 sm:px-8 py-1.5 sm:py-2 bg-[#2b080f]/90 border-2 border-[#ff1f43] rounded-full shadow-[0_0_30px_rgba(255,31,67,0.8)] backdrop-blur-md">
              <span className="font-orbitron font-black text-xs md:text-sm tracking-[0.35em] text-white uppercase drop-shadow-[0_0_10px_#ffffff]">
                WELCOME TO
              </span>
            </div>
          </div>

          {/* Center: Hero Animated Launch Logo (Edge-to-Edge Stage Flow) */}
          <div className="relative z-20 flex-1 min-h-0 flex items-center justify-center w-full px-4 my-auto">
            <LaunchLogo className="w-full h-auto max-w-[520px] sm:max-w-[640px] md:max-w-[760px] lg:max-w-[840px] max-h-[50vh] sm:max-h-[54vh] md:max-h-[58vh] object-contain" animate={true} />
          </div>

          {/* Bottom Activation Status Tagline */}
          <div className="relative z-20 mb-1 sm:mb-2 md:mb-3 text-center flex items-center justify-center gap-2 shrink-0">
            <Zap size={14} className="text-[#ff1f43] animate-pulse shrink-0" />
            <span className="font-orbitron font-bold text-[11px] sm:text-xs md:text-sm text-[#ff99aa] uppercase tracking-[0.25em] sm:tracking-[0.3em] drop-shadow-[0_0_8px_#ff1f43]">
              TELECEL SME MONTH • OFFICIAL ACTIVATION COMPLETE
            </span>
            <Zap size={14} className="text-[#ff1f43] animate-pulse shrink-0" />
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. TIMEOUT OVERLAY                                   */}
      {/* ==================================================== */}
      {status === 'gameover' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="hud-panel max-w-lg w-full p-8 sci-fi-cut border-2 border-[#521520] shadow-panel-inset flex flex-col items-center text-center">
            <ShieldAlert size={48} className="text-[#a82538] mb-2" />
            <h2 className="font-orbitron font-black text-3xl md:text-4xl text-[#ff4d6d] uppercase tracking-wider mb-1">
              VOLTAGE DEPLETED
            </h2>
            <p className="text-sm text-[#a85060] uppercase tracking-widest mb-6">
              KEEP SHAKING TOGETHER TO REACH 100%
            </p>

            <div className="bg-[#170508] border border-[#3b0f17] p-4 rounded-lg w-full mb-6 flex justify-around">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#a85060] uppercase">PEAK VOLTAGE</span>
                <span className="font-orbitron font-black text-2xl text-[#ff4d6d]">
                  {Math.floor(voltage)}%
                </span>
              </div>
              <div className="w-px bg-[#3b0f17]" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#a85060] uppercase">CROWD SIZE</span>
                <span className="font-orbitron font-black text-2xl text-white">
                  {gameState.connectedCount || 0}
                </span>
              </div>
            </div>

            <button
              onClick={handleResetGame}
              className="w-full py-3.5 px-6 sci-fi-cut font-orbitron font-black text-lg tracking-widest uppercase bg-[#380e15] hover:bg-[#521520] text-white border border-[#7a1c2d] cursor-pointer transition-all"
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. HELP MODAL                                        */}
      {/* ==================================================== */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="hud-panel max-w-md w-full p-6 sci-fi-cut border border-[#ff1f43]" onClick={e => e.stopPropagation()}>
            <h3 className="font-orbitron font-bold text-xl text-white uppercase mb-4 flex items-center gap-2">
              <HelpCircle className="text-[#ff1f43]" /> HOW TO PLAY
            </h3>
            <ul className="text-sm text-[#ffb3c0] space-y-3">
              <li>• <strong className="text-white">Motion Sensors:</strong> Hold your phone firmly and shake vigorously up and down or side to side.</li>
              <li>• <strong className="text-white">2-Player Synergy:</strong> When both players shake concurrently, energy gains combine and multiplier rises to 5x.</li>
              <li>• <strong className="text-white">Boost:</strong> Press the red BOOST button when you need an instant +16% voltage spike!</li>
              <li>• <strong className="text-white">iOS Users:</strong> Tap "ACTIVATE SENSORS" on your phone when prompted by Safari.</li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2 bg-[#ff1f43] hover:bg-[#ff3d5e] text-white font-orbitron font-bold text-sm uppercase sci-fi-cut-sm"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 7. MOBILE DEVICE OPTIMIZATION PROMPT MODAL          */}
      {/* ==================================================== */}
      {showMobilePrompt && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 select-none">
          <div className="hud-panel max-w-md w-full p-6 sm:p-8 sci-fi-cut border-2 border-[#ff1f43] shadow-neon-red flex flex-col items-center text-center animate-fade-in">
            <div className="w-full max-w-[220px] max-h-[80px] mb-3 flex items-center justify-center">
              <LaunchLogo className="w-full h-auto object-contain" animate={false} />
            </div>

            <div className="w-14 h-14 rounded-full bg-[#330c14] border border-[#ff1f43] flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(255,31,67,0.7)]">
              <Smartphone size={28} className="text-[#ff1f43] animate-bounce" />
            </div>

            <h3 className="font-orbitron font-black text-lg sm:text-xl uppercase text-white tracking-wider mb-2">
              BEST EXPERIENCED ON DESKTOP
            </h3>

            <p className="text-xs sm:text-sm text-[#ffccd5] mb-6 leading-relaxed">
              This screen is the main stage display designed for large projectors and desktop monitors. If you are participating as an audience member, please switch to the Mobile Controller to shake and surge power!
            </p>

            <a
              href={`/controller?room=${encodeURIComponent(roomCode)}`}
              className="w-full py-4 px-6 sci-fi-cut font-orbitron font-black text-sm tracking-widest uppercase bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] hover:from-[#b01430] hover:via-[#ff3d5e] hover:to-[#b01430] text-white shadow-neon-red border-2 border-white/60 flex items-center justify-center gap-2 mb-3 cursor-pointer transition-all"
            >
              <Zap size={18} className="animate-pulse" />
              <span>SWITCH TO MOBILE CONTROLLER 📱</span>
            </a>

            <button
              onClick={() => setShowMobilePrompt(false)}
              className="text-xs text-[#ff8095] underline hover:text-white transition-colors cursor-pointer py-1 mt-1"
            >
              Continue viewing desktop screen anyway
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
