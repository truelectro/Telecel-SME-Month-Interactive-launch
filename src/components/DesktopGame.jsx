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
  Keyboard
} from 'lucide-react';
import ReactorCanvas from './ReactorCanvas';
import MultiplierGauge from './MultiplierGauge';
import LaunchLogo from './LaunchLogo';
import { audioEngine } from '../utils/audioEngine';

export default function DesktopGame({ socket, gameState, serverInfo }) {
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useHttpsQR, setUseHttpsQR] = useState(true);
  const [boostAnimating, setBoostAnimating] = useState(false);
  const [shakeFlash, setShakeFlash] = useState(false);
  const [showLocalFallback, setShowLocalFallback] = useState(false);

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
  const prevStatusRef = useRef(status);

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
      return;
    }

    const showMessage = () => {
      const msg = getVoltageTierMessage(voltage);
      setOverlayMessage(msg);
      setOverlayVisible(true);
      setTimeout(() => {
        setOverlayVisible(false);
      }, 1900);
    };

    // Initial popup shortly after game starts
    const initTimer = setTimeout(showMessage, 900);

    // Periodic popups tailored to current voltage every 4.2s
    const interval = setInterval(showMessage, 4200);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [status, voltage, getVoltageTierMessage]);

  // Room code and controller URL resolution (supports Vercel, cloud, tunnel, and local)
  const roomCode = serverInfo?.roomCode || 'telecel-launch';
  const isHttps = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname.includes('vercel.app') || window.location.hostname !== 'localhost');
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  
  // Construct mobile controller QR link
  let controllerUrl = serverInfo?.tunnelUrl;
  if (!controllerUrl) {
    controllerUrl = `${window.location.origin}/controller?room=${encodeURIComponent(roomCode)}`;
  }
  
  // On Vercel / HTTPS or when tunnel is active, QR code is immediately ready
  const tunnelReady = isHttps || !!serverInfo?.tunnelUrl;

  // Trigger sound engine updates on voltage changes
  useEffect(() => {
    audioEngine.updateVoltageHum(voltage, status === 'playing');
  }, [voltage, status]);

  // Handle victory audio (confetti removed per user request)
  useEffect(() => {
    if (status === 'victory') {
      audioEngine.playVictory();
    } else if (status === 'gameover') {
      audioEngine.playGameOver();
    }
  }, [status]);

  // Listen for socket sound effect events
  useEffect(() => {
    if (!socket) return;

    const onSurgePulse = ({ intensity }) => {
      audioEngine.playShakeZap(intensity);
      setShakeFlash(true);
      setTimeout(() => setShakeFlash(false), 80);
    };

    const onBoostActivated = () => {
      audioEngine.playBoostSurge();
      setBoostAnimating(true);
      setTimeout(() => setBoostAnimating(false), 400);
    };

    const onMultiplierUp = ({ multiplier: newMult }) => {
      audioEngine.playMultiplierUp(newMult);
    };

    socket.on('surge_pulse', onSurgePulse);
    socket.on('boost_activated', onBoostActivated);
    socket.on('multiplier_up', onMultiplierUp);

    return () => {
      socket.off('surge_pulse', onSurgePulse);
      socket.off('boost_activated', onBoostActivated);
      socket.off('multiplier_up', onMultiplierUp);
    };
  }, [socket]);

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
    <div className="relative w-screen h-screen min-h-[700px] bg-[#070204] text-white flex flex-col justify-between p-3 md:p-6 overflow-hidden select-none font-rajdhani">
      
      {/* Background Industrial Skyline Silhouette & Lightning Atmospherics */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Dark Red Nebula Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c060b] via-[#0d0305] to-[#050102]" />
        
        {/* Background Electric Lightning Flash Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-transparent via-[#ff1f43]/10 to-transparent bg-lightning-flash ${
          boostAnimating ? 'opacity-40 bg-[#ff1f43]/30 transition-opacity' : ''
        }`} />

        {/* Industrial Tower Silhouettes at Horizon */}
        <svg className="absolute bottom-0 w-full h-48 opacity-25 text-[#1f070b]" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,200 L0,140 L40,140 L50,80 L60,80 L70,140 L120,140 L140,110 L160,140 L220,140 L230,60 L240,60 L250,140 L340,140 L360,95 L390,140 L460,140 L480,40 L495,40 L510,140 L600,140 L620,105 L650,140 L720,140 L735,70 L750,140 L830,140 L850,50 L870,140 L960,140 L980,100 L1010,140 L1100,140 L1120,75 L1140,140 L1200,140 L1200,200 Z" />
        </svg>

        {/* Scanlines Effect */}
        <div className="absolute inset-0 scanlines" />
      </div>

      {/* Screen Edge Bevel Outer Border (Cyberpunk Metal Enclosure) */}
      <div className="absolute inset-2 md:inset-4 border border-[#42111a]/80 pointer-events-none z-10 sci-fi-cut">
        {/* Corner Rivet Details */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#ff2a4b]/40 shadow-[0_0_8px_#ff2a4b]" />
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff2a4b]/40 shadow-[0_0_8px_#ff2a4b]" />
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#ff2a4b]/40 shadow-[0_0_8px_#ff2a4b]" />
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#ff2a4b]/40 shadow-[0_0_8px_#ff2a4b]" />
      </div>

      {/* ==================================================== */}
      {/* 1. TOP HEADER                                       */}
      {/* ==================================================== */}
      <header className={`relative z-20 flex items-center justify-between px-4 py-2 ${
        isBooting || status === 'playing' ? 'animate-cyber-down' : ''
      }`}>
        {/* Left: VOLTAGE SURGE Metallic Red Title */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <h1 className="font-orbitron font-black text-3xl md:text-4xl tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-[#ff4d6d] to-[#ff0033] drop-shadow-[0_0_18px_rgba(255,31,67,0.8)] italic">
              VOLTAGE
            </h1>
          </div>
          <span className="font-orbitron font-bold text-xs md:text-sm tracking-[0.45em] text-[#ff8095] -mt-1 ml-0.5">
            S U R G E
          </span>
        </div>

        {/* Center: MAX VOLTAGE 100% Display */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] md:text-xs tracking-widest font-semibold text-[#ff8095]/80 uppercase">
            {status === 'playing' ? 'SYSTEM CHARGE' : 'MAX VOLTAGE'}
          </span>
          <div className="px-5 py-1 bg-[#20070b]/90 border border-[#5e1925] sci-fi-cut-sm shadow-[0_0_12px_rgba(255,31,67,0.3)]">
            <span className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
              {status === 'playing' ? `${Math.floor(voltage)}%` : '100%'}
            </span>
          </div>
        </div>

        {/* Right: Utility & Audio Buttons */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Audio Mute Toggle */}
          <button
            onClick={handleToggleMute}
            aria-label="Toggle Audio"
            className="w-9 h-9 flex items-center justify-center bg-[#25080e]/80 border border-[#521520] hover:border-[#ff2a4b] hover:bg-[#3d0d17] transition-all sci-fi-cut-sm text-[#ff8095] hover:text-white"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Help Button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            aria-label="How to play"
            className="w-9 h-9 flex items-center justify-center bg-[#25080e]/80 border border-[#521520] hover:border-[#ff2a4b] hover:bg-[#3d0d17] transition-all sci-fi-cut-sm text-[#ff8095] hover:text-white"
          >
            <HelpCircle size={18} />
          </button>

          {/* Reset / Settings */}
          <button
            onClick={handleResetGame}
            title="Reset Game / Lobby"
            aria-label="Reset Game"
            className="w-9 h-9 flex items-center justify-center bg-[#25080e]/80 border border-[#521520] hover:border-[#ff2a4b] hover:bg-[#3d0d17] transition-all sci-fi-cut-sm text-[#ff8095] hover:text-white"
          >
            <RotateCcw size={18} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
            className="w-9 h-9 hidden sm:flex items-center justify-center bg-[#25080e]/80 border border-[#521520] hover:border-[#ff2a4b] hover:bg-[#3d0d17] transition-all sci-fi-cut-sm text-[#ff8095] hover:text-white"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 2. MAIN 3-COLUMN GAME HUD (Hero Reactor Layout)     */}
      {/* ==================================================== */}
      <main className="relative z-20 flex-1 grid grid-cols-12 gap-3 md:gap-8 items-center px-2 md:px-6 my-auto max-w-[1600px] mx-auto w-full h-full">
        
        {/* -------------------------------------------------- */}
        {/* LEFT COLUMN: Objectives, Score, Best, Multiplier   */}
        {/* -------------------------------------------------- */}
        <div className={`col-span-12 md:col-span-3 flex flex-col gap-3 md:gap-4 order-2 md:order-1 ${
          isBooting || status === 'playing' ? 'animate-cyber-left' : ''
        }`}>
          {/* OBJECTIVE CARD */}
          <div className="hud-panel p-3.5 sci-fi-cut">
            <span className="text-[11px] font-bold tracking-widest text-[#ff4d6d] uppercase block mb-1">
              LAUNCH MISSION
            </span>
            <p className="font-orbitron font-semibold text-xs md:text-sm text-gray-200 uppercase tracking-wide">
              SURGE COLLECTIVE POWER TO 100%!
            </p>
          </div>

          {/* CONNECTED AUDIENCE CARD */}
          <div className="hud-panel p-3.5 sci-fi-cut">
            <span className="text-[11px] font-bold tracking-widest text-[#ff4d6d] uppercase block mb-0.5">
              CONNECTED AUDIENCE
            </span>
            <div className="font-orbitron font-black text-2xl md:text-3xl text-white tracking-wider text-glow-red">
              {gameState.connectedCount || 0}
            </div>
          </div>

          {/* COLLECTIVE SCORE CARD */}
          <div className="hud-panel p-3 sci-fi-cut">
            <span className="text-[10px] font-bold tracking-widest text-[#a83244] uppercase block mb-0.5">
              COLLECTIVE ENERGY
            </span>
            <div className="font-orbitron font-bold text-lg md:text-xl text-[#f08095] tracking-wider">
              {score.toLocaleString()}
            </div>
          </div>

          {/* RADIAL MULTIPLIER CARD */}
          <div className="hud-panel p-3 sci-fi-cut flex flex-col items-center">
            <span className="text-[11px] font-bold tracking-widest text-[#ff4d6d] uppercase mb-1">
              MULTIPLIER
            </span>
            <MultiplierGauge multiplier={multiplier} progress={multiplierProgress} />
          </div>

          {/* STATUS FOOTER BADGE */}
          <div className="hud-panel p-2.5 sci-fi-cut flex items-center justify-center gap-2 border-[#801b2a]">
            <Zap size={14} className="text-[#ff1f43] animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest text-[#ff99aa] uppercase">
              {status === 'playing' ? 'KEEP THE VOLTAGE RISING!' : 'WAITING FOR SENSORS'}
            </span>
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* CENTER COLUMN: Central High-Voltage Reactor Core   */}
        {/* -------------------------------------------------- */}
        <div className={`col-span-12 md:col-span-6 flex flex-col items-center justify-center relative order-1 md:order-2 h-full py-1 ${
          isBooting || status === 'playing' ? 'animate-cyber-core' : ''
        }`}>
          
          {/* Main Heavy Reactor Assembly (Larger & Taller) */}
          <div className="relative w-full max-w-[460px] md:max-w-[500px] lg:max-w-[540px] h-[540px] md:h-[640px] lg:h-[720px] max-h-[82vh] flex items-center justify-center">
            
            {/* Left & Right Insulator Coils & Heavy Conduit Cables */}
            {/* Left Insulator Coil */}
            <div className="absolute -left-2 md:-left-4 bottom-14 z-10 flex flex-col items-center">
              <div className="w-10 h-16 md:w-11 md:h-18 bg-gradient-to-b from-[#2a0b12] to-[#120407] border-2 border-[#631826] rounded-t-md flex flex-col justify-evenly items-center shadow-[0_0_20px_rgba(255,31,67,0.4)]">
                <div className="w-8 md:w-9 h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
                <div className="w-8 md:w-9 h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
                <div className="w-8 md:w-9 h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
              </div>
              <div className="w-14 h-7 bg-[#180509] border border-[#50131e] rounded-b-md" />
              {/* Cable connecting into base */}
              <svg className="w-14 h-9 text-[#3d0f17]" viewBox="0 0 50 30">
                <path d="M 10 0 C 15 25, 40 25, 50 20" fill="none" stroke="currentColor" strokeWidth="4" />
              </svg>
            </div>

            {/* Right Insulator Coil */}
            <div className="absolute -right-2 md:-right-4 bottom-14 z-10 flex flex-col items-center">
              <div className="w-10 h-16 md:w-11 md:h-18 bg-gradient-to-b from-[#2a0b12] to-[#120407] border-2 border-[#631826] rounded-t-md flex flex-col justify-evenly items-center shadow-[0_0_20px_rgba(255,31,67,0.4)]">
                <div className="w-8 md:w-9 h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
                <div className="w-8 md:w-9 h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
                <div className="w-8 md:w-9 h-2 bg-[#ff1f43]/80 rounded-full shadow-[0_0_8px_#ff1f43]" />
              </div>
              <div className="w-14 h-7 bg-[#180509] border border-[#50131e] rounded-b-md" />
              {/* Cable connecting into base */}
              <svg className="w-14 h-9 text-[#3d0f17]" viewBox="0 0 50 30">
                <path d="M 40 0 C 35 25, 10 25, 0 20" fill="none" stroke="currentColor" strokeWidth="4" />
              </svg>
            </div>

            {/* Height Percentage Ruler Ticks (0%, 25%, 50%, 75%, 100%) */}
            <div className="absolute right-4 md:right-7 top-[10%] bottom-[15%] flex flex-col justify-between items-start text-xs md:text-sm font-orbitron font-bold text-[#802434] pointer-events-none z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#802434]" />
                <span className={voltage >= 95 ? 'text-white font-bold text-glow-red text-sm md:text-base' : ''}>100%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#802434]" />
                <span className={voltage >= 75 ? 'text-[#ff4d6d] font-bold' : ''}>75%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#802434]" />
                <span className={voltage >= 50 ? 'text-[#ff4d6d] font-bold' : ''}>50%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#802434]" />
                <span className={voltage >= 25 ? 'text-[#ff4d6d] font-bold' : ''}>25%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#802434]" />
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
            <div className="absolute bottom-1 inset-x-6 md:inset-x-8 z-10 flex flex-col items-center">
              <div className="w-full py-2.5 px-6 bg-gradient-to-r from-[#2a0a10] via-[#47111b] to-[#2a0a10] border-2 border-[#7a1c2d] sci-fi-cut flex items-center justify-center gap-2.5 shadow-[0_0_24px_rgba(255,31,67,0.45)]">
                <Zap size={18} className={`text-[#ff1f43] ${voltage > 0 ? 'animate-bounce' : ''}`} />
                <span className="font-orbitron font-black text-xs md:text-sm tracking-widest text-white uppercase drop-shadow-[0_0_10px_rgba(255,31,67,0.9)]">
                  {status === 'playing' ? (voltage > 70 ? 'CRITICAL SURGE' : 'VOLTAGE RISING') : 'STANDBY MODE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* RIGHT COLUMN: How to Play Cards & Status           */}
        {/* -------------------------------------------------- */}
        <div className={`col-span-12 md:col-span-3 flex flex-col gap-3 md:gap-4 order-3 ${
          isBooting || status === 'playing' ? 'animate-cyber-right' : ''
        }`}>
          
          {/* HOW TO PLAY CARDS */}
          <div className="hud-panel p-4 sci-fi-cut flex flex-col gap-3">
            <span className="text-[11px] font-bold tracking-widest text-[#ff4d6d] uppercase block">
              HOW TO PLAY
            </span>

            {/* Rule 1 */}
            <div className="flex items-start gap-3 bg-[#170508]/60 p-2 rounded border border-[#3b0f17]">
              <div className="w-8 h-8 rounded bg-[#330c14] flex items-center justify-center shrink-0 border border-[#661827]">
                <Zap size={16} className="text-[#ff1f43]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase">SHAKE TO SURGE</span>
                <span className="text-[11px] text-[#b85c6c]">Shake your phones rapidly to raise the voltage</span>
              </div>
            </div>

            {/* Rule 2 */}
            <div className="flex items-start gap-3 bg-[#170508]/60 p-2 rounded border border-[#3b0f17]">
              <div className="w-8 h-8 rounded bg-[#330c14] flex items-center justify-center shrink-0 border border-[#661827]">
                <Activity size={16} className="text-[#ff1f43]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase">KEEP ENERGY FLOWING</span>
                <span className="text-[11px] text-[#b85c6c]">Maintain rhythm together to multiply power</span>
              </div>
            </div>

            {/* Rule 3 */}
            <div className="flex items-start gap-3 bg-[#170508]/60 p-2 rounded border border-[#3b0f17]">
              <div className="w-8 h-8 rounded bg-[#330c14] flex items-center justify-center shrink-0 border border-[#661827]">
                <ShieldAlert size={16} className="text-[#ff1f43]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase">DON'T LET IT DROP</span>
                <span className="text-[11px] text-[#b85c6c]">Voltage drains continuously if shaking stops</span>
              </div>
            </div>
          </div>

          {/* REAL-TIME SYSTEM CORE STATUS CARD */}
          <div className="hud-panel p-3.5 sci-fi-cut flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-[#ff1f43] animate-pulse" />
              <span className="font-orbitron font-bold text-xs text-gray-200 uppercase tracking-wider">
                CORE STATUS
              </span>
            </div>
            <span className="font-orbitron font-black text-sm text-[#ff4d6d] tracking-widest uppercase">
              {status === 'playing' ? (voltage > 75 ? 'MAX OVERCHARGE' : 'POWER RISING') : 'LOBBY STANDBY'}
            </span>
          </div>

          {/* Quick Keyboard Hint */}
          <div className="text-[10px] text-center text-[#7a2c39] flex items-center justify-center gap-1 mt-1">
            <Keyboard size={12} />
            <span>Dev shortcuts: [Space] Shake • [S] Start • [R] Reset</span>
          </div>

        </div>

      </main>

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
            <div className="relative z-10 bg-[#160307]/85 backdrop-blur-md px-8 md:px-12 py-5 md:py-6 rounded-2xl border-2 border-[#ff1f43]/70 shadow-[0_0_50px_rgba(255,31,67,0.5)] sci-fi-cut">
              <div className="font-orbitron font-black text-3xl md:text-5xl lg:text-6xl text-white tracking-widest uppercase text-glow-red drop-shadow-[0_0_25px_#ff1f43]">
                {overlayMessage.title}
              </div>
              {overlayMessage.sub && (
                <p className="font-rajdhani font-bold text-sm md:text-xl text-[#ffccd5] tracking-[0.25em] uppercase mt-2 drop-shadow-[0_0_8px_#ff1f43]">
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
        <div className="fixed inset-0 z-50 w-screen h-screen bg-[#0a0204] flex flex-col justify-between p-3 sm:p-5 md:p-8 overflow-hidden select-none animate-fade-in">
          
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
          <div className="absolute inset-2 sm:inset-4 md:inset-6 border-2 border-[#ff1f43]/40 pointer-events-none z-10 sci-fi-cut shadow-[0_0_40px_rgba(255,31,67,0.25)]">
            <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
          </div>

          {/* Top: Telecel SME Month Logo & Headline */}
          <div className="relative z-20 flex flex-col items-center text-center mt-1">
            <div className="w-full max-w-[260px] sm:max-w-[300px] md:max-w-[360px] max-h-[13vh] flex items-center justify-center mb-1">
              <LaunchLogo className="w-full h-auto max-w-[340px] max-h-[12vh] object-contain" animate={false} />
            </div>
            
            <h2 className="font-orbitron font-black text-2xl sm:text-3xl md:text-4xl tracking-wider uppercase text-white drop-shadow-[0_0_18px_#ff1f43] mt-1">
              SCAN TO JOIN THE CROWD SURGE
            </h2>
            <p className="text-xs sm:text-sm text-[#ff99aa] max-w-2xl mt-1 px-4">
              Everyone in the audience scan with your smartphone! When the activation begins, shake your phones together to surge the voltage to 100%!
            </p>
          </div>

          {/* Center Stage: Split Hero Presentation Area (Large QR Code + Connected Counter) */}
          <div className="relative z-20 flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-12 items-center justify-center max-w-5xl mx-auto w-full my-auto px-4">
            
            {/* Left: Large High-Contrast Stage QR Code */}
            <div className="flex flex-col items-center justify-center">
              {tunnelReady || showLocalFallback ? (
                <div className="relative p-4 sm:p-5 bg-white rounded-2xl shadow-[0_0_45px_rgba(255,31,67,0.8)] border-4 border-[#ff1f43]">
                  <QRCodeSVG
                    value={controllerUrl}
                    size={280}
                    level="H"
                    includeMargin={false}
                    className="w-[180px] h-[180px] sm:w-[230px] sm:h-[230px] md:w-[280px] md:h-[280px] lg:w-[310px] lg:h-[310px]"
                  />
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-[#120407] text-[#ff4d6d] font-orbitron font-bold text-xs sm:text-sm px-5 py-1 border-2 border-[#ff1f43] rounded-full whitespace-nowrap shadow-[0_0_15px_#ff1f43]">
                    {tunnelReady ? 'SCAN TO SYNC ⚡' : 'LOCAL WI-FI (FALLBACK)'}
                  </div>
                </div>
              ) : (
                <div className="relative p-8 bg-[#170508] rounded-2xl border-2 border-[#521520] flex flex-col items-center justify-center gap-3 min-h-[260px] min-w-[260px]">
                  <div className="w-10 h-10 border-4 border-[#ff1f43] border-t-transparent rounded-full animate-spin" />
                  <span className="font-orbitron font-bold text-sm text-[#ff8095] uppercase tracking-wider animate-pulse">
                    ESTABLISHING SECURE LINK...
                  </span>
                  <button
                    onClick={() => setShowLocalFallback(true)}
                    className="mt-2 text-xs text-[#ff4d6d] underline hover:text-white transition-colors"
                  >
                    Or use local network QR code
                  </button>
                </div>
              )}
            </div>

            {/* Right: Live Audience Counter Box */}
            <div className="flex flex-col items-center justify-center w-full">
              <div className="w-full bg-gradient-to-b from-[#2d0c14]/90 to-[#140407]/95 border-2 border-[#ff1f43]/70 rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_0_40px_rgba(255,31,67,0.4)] flex flex-col items-center justify-center text-center sci-fi-cut">
                
                {/* Massive Live Counter Number */}
                <div className="font-orbitron font-black text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white tracking-wider text-glow-red drop-shadow-[0_0_30px_#ff1f43] leading-none mb-3">
                  {gameState.connectedCount || 0}
                </div>

                {/* Connected Audience Label */}
                <div className="flex items-center gap-2 text-[#ff8095] mb-3">
                  <Users size={22} className="text-[#ff1f43] animate-pulse" />
                  <span className="font-orbitron font-bold text-sm sm:text-base md:text-lg tracking-[0.25em] uppercase text-white">
                    CONNECTED AUDIENCE
                  </span>
                </div>

                {/* Live Feed Pill */}
                <div className="px-4 py-1.5 bg-[#140306] border border-[#ff1f43]/40 rounded-full text-xs sm:text-sm text-[#ff99aa] font-semibold">
                  {gameState.connectedCount > 0 
                    ? `⚡ Live: ${gameState.connectedCount} device${gameState.connectedCount > 1 ? 's' : ''} ready to shake!` 
                    : 'Scan the QR code with your phone to join'}
                </div>
              </div>
            </div>

          </div>

          {/* Bottom: Start Launch Sequence CTA */}
          <div className="relative z-20 flex flex-col items-center justify-center w-full max-w-xl mx-auto mb-1">
            <button
              onClick={handleStartGame}
              className="w-full py-4 sm:py-5 px-8 sci-fi-cut font-orbitron font-black text-lg sm:text-xl md:text-2xl tracking-widest uppercase bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] hover:from-[#b01430] hover:via-[#ff3d5e] hover:to-[#b01430] active:scale-95 text-white shadow-neon-red-lg border-2 border-white/60 cursor-pointer transition-all flex items-center justify-center gap-3"
            >
              <Zap size={24} className="animate-bounce" />
              <span>START LAUNCH ACTIVATION</span>
            </button>
            <span className="text-xs text-[#a03d4c] mt-2 font-mono">
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
          className="fixed inset-0 z-50 w-screen h-screen bg-[#100204] flex flex-col items-center justify-between p-4 md:p-8 overflow-hidden select-none animate-fade-in"
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
          <div className="absolute inset-3 md:inset-6 border-2 border-[#ff1f43]/40 pointer-events-none z-10 sci-fi-cut shadow-[0_0_40px_rgba(255,31,67,0.25)]">
            <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
            <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-[#ff1f43] shadow-[0_0_12px_#ff1f43]" />
          </div>

          {/* Top Welcome Badge */}
          <div className="relative z-20 mt-2 md:mt-3">
            <div className="inline-flex items-center px-8 py-2 bg-[#2b080f]/90 border-2 border-[#ff1f43] rounded-full shadow-[0_0_30px_rgba(255,31,67,0.8)] backdrop-blur-md">
              <span className="font-orbitron font-black text-xs md:text-sm tracking-[0.35em] text-white uppercase drop-shadow-[0_0_10px_#ffffff]">
                WELCOME TO
              </span>
            </div>
          </div>

          {/* Center: Hero Animated Launch Logo (Edge-to-Edge Stage Flow) */}
          <div className="relative z-20 flex-1 flex items-center justify-center w-full px-4 my-auto">
            <LaunchLogo className="w-full h-auto max-w-[680px] md:max-w-[780px] lg:max-w-[880px] max-h-[58vh] object-contain" animate={true} />
          </div>

          {/* Bottom Activation Status Tagline */}
          <div className="relative z-20 mb-2 md:mb-3 text-center flex items-center justify-center gap-2">
            <Zap size={14} className="text-[#ff1f43] animate-pulse" />
            <span className="font-orbitron font-bold text-xs md:text-sm text-[#ff99aa] uppercase tracking-[0.3em] drop-shadow-[0_0_8px_#ff1f43]">
              TELECEL SME MONTH • OFFICIAL ACTIVATION COMPLETE
            </span>
            <Zap size={14} className="text-[#ff1f43] animate-pulse" />
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

    </div>
  );
}
