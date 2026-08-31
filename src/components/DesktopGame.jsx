import React, { useState, useEffect, useRef } from 'react';
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

  // Auto-enable local QR fallback after 4 seconds if tunnel hasn't connected
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLocalFallback(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const {
    status = 'lobby',
    voltage = 0,
    score = 0,
    highScore = 25000,
    multiplier = 1,
    multiplierProgress = 0,
    boostCharges = 3,
    timeRemaining = 60,
    slots = { p1: null, p2: null },
  } = gameState || {};

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
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        handleBoost();
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
  }, [socket, status, boostCharges]);

  const handleStartGame = () => {
    audioEngine.ensureRunning();
    if (socket) socket.emit('start_game');
  };

  const handleResetGame = () => {
    audioEngine.ensureRunning();
    if (socket) socket.emit('reset_game');
  };

  const handleBoost = () => {
    audioEngine.ensureRunning();
    if (socket && boostCharges > 0 && status === 'playing') {
      socket.emit('trigger_boost');
    }
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
      <header className="relative z-20 flex items-center justify-between px-4 py-2">
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
        <div className="col-span-12 md:col-span-3 flex flex-col gap-3 md:gap-4 order-2 md:order-1">
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
        <div className="col-span-12 md:col-span-6 flex flex-col items-center justify-center relative order-1 md:order-2 h-full py-1">
          
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
        {/* RIGHT COLUMN: How to Play Cards & BOOST Button     */}
        {/* -------------------------------------------------- */}
        <div className="col-span-12 md:col-span-3 flex flex-col gap-3 md:gap-4 order-3">
          
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

          {/* ROUND TIMER DISPLAY (WHEN PLAYING) */}
          {status === 'playing' && (
            <div className="hud-panel p-3 sci-fi-cut flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-[#ff4d6d] uppercase">
                TIME REMAINING
              </span>
              <span className={`font-orbitron font-black text-xl ${
                timeRemaining <= 10 ? 'text-red-500 animate-pulse text-glow-red' : 'text-white'
              }`}>
                {timeRemaining}s
              </span>
            </div>
          )}

          {/* DYNAMIC BOOST BUTTON */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleBoost}
              disabled={boostCharges <= 0 || status !== 'playing'}
              className={`w-full py-4 px-6 sci-fi-cut font-orbitron font-black text-xl tracking-widest uppercase transition-all duration-150 flex items-center justify-center gap-3 ${
                boostCharges > 0 && status === 'playing'
                  ? 'bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] hover:from-[#b01430] hover:via-[#ff3d5e] hover:to-[#b01430] active:scale-95 text-white shadow-neon-red-lg border-2 border-white/50 cursor-pointer'
                  : 'bg-[#22080d] text-[#6e222e] border border-[#3d1119] cursor-not-allowed opacity-60'
              } ${boostAnimating ? 'scale-105 brightness-150 ring-4 ring-[#ff1f43]' : ''}`}
            >
              <Zap size={22} className={boostCharges > 0 && status === 'playing' ? 'animate-bounce text-white' : ''} />
              <span>BOOST</span>
            </button>

            {/* Boost Charges Counter Badge */}
            <div className="flex items-center gap-1.5 mt-1 px-4 py-0.5 bg-[#180509] border border-[#4d131d] rounded-full">
              <Zap size={13} className="text-[#ff1f43]" />
              <span className="font-orbitron font-bold text-xs text-[#ff99aa]">
                {boostCharges} CHARGES
              </span>
            </div>
          </div>

          {/* Quick Keyboard Hint */}
          <div className="text-[10px] text-center text-[#7a2c39] flex items-center justify-center gap-1 mt-1">
            <Keyboard size={12} />
            <span>Dev shortcuts: [Space] Shake • [B] Boost • [S] Start</span>
          </div>

        </div>

      </main>

      {/* ==================================================== */}
      {/* 3. LOBBY & PAIRING QR CODE MODAL OVERLAY             */}
      {/* ==================================================== */}
      {status === 'lobby' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="hud-panel max-w-2xl w-full p-6 md:p-8 sci-fi-cut border-2 border-[#801b2a] shadow-neon-red flex flex-col items-center text-center">
            
            {/* Launch Event Badge */}
            <div className="inline-flex items-center px-4 py-1.5 bg-[#2b080f] border border-[#ff1f43] rounded-full mb-3 shadow-[0_0_15px_rgba(255,31,67,0.4)]">
              <span className="font-orbitron font-black text-xs tracking-widest text-white uppercase">
                TELECEL SME MONTH LAUNCH
              </span>
            </div>

            {/* Modal Title */}
            <h2 className="font-orbitron font-black text-2xl md:text-3xl tracking-wider uppercase text-white drop-shadow-[0_0_12px_#ff1f43] mb-1">
              SCAN TO JOIN THE CROWD SURGE
            </h2>
            <p className="text-xs md:text-sm text-[#ff99aa] max-w-lg mb-4">
              Everyone in the audience scan with your smartphone! When the countdown begins, shake your phones together to surge the voltage to 100% for the launch reveal!
            </p>

            {/* High-Contrast QR Code Container */}
            {tunnelReady || showLocalFallback ? (
              <div className="relative p-4 bg-white rounded-xl shadow-[0_0_35px_rgba(255,31,67,0.7)] border-4 border-[#ff1f43] mb-4">
                <QRCodeSVG
                  value={controllerUrl}
                  size={210}
                  level="H"
                  includeMargin={false}
                />
                <div className="absolute -bottom-3.5 left-1/2 transform -translate-x-1/2 bg-[#120407] text-[#ff4d6d] font-orbitron font-bold text-[10px] px-3.5 py-0.5 border border-[#ff1f43] rounded-full whitespace-nowrap shadow-md">
                  {tunnelReady ? 'SCAN TO SYNC ⚡' : 'LOCAL WI-FI (FALLBACK)'}
                </div>
              </div>
            ) : (
              <div className="relative p-8 bg-[#170508] rounded-xl border-2 border-[#521520] mb-4 flex flex-col items-center justify-center gap-3 min-h-[232px] min-w-[232px]">
                <div className="w-8 h-8 border-3 border-[#ff1f43] border-t-transparent rounded-full animate-spin" />
                <span className="font-orbitron font-bold text-xs text-[#ff8095] uppercase tracking-wider animate-pulse">
                  ESTABLISHING SECURE LINK...
                </span>
                <span className="text-[10px] text-[#803844]">
                  Setting up HTTPS for phone sensor access
                </span>
                <button
                  onClick={() => setShowLocalFallback(true)}
                  className="mt-2 text-[10px] text-[#ff4d6d] underline hover:text-white transition-colors"
                >
                  Or use local network QR code
                </button>
              </div>
            )}

            {/* REAL-TIME AUDIENCE SCANNER COUNTER (LARGE BOLD DISPLAY) */}
            <div className="w-full max-w-lg bg-gradient-to-b from-[#22070d] to-[#120306] border-2 border-[#801b2a] rounded-2xl p-6 mb-6 shadow-[0_0_30px_rgba(255,31,67,0.35)] flex flex-col items-center justify-center">
              
              {/* Massive Live Counter Number */}
              <div className="font-orbitron font-black text-6xl md:text-7xl text-white tracking-wider text-glow-red drop-shadow-[0_0_20px_#ff1f43] leading-none mb-2">
                {gameState.connectedCount || 0}
              </div>

              {/* Connected Audience Label Beneath Number */}
              <div className="flex items-center gap-2 text-[#ff8095] mb-2">
                <Users size={18} className="text-[#ff1f43] animate-pulse" />
                <span className="font-orbitron font-bold text-sm md:text-base tracking-[0.25em] uppercase text-white">
                  CONNECTED AUDIENCE
                </span>
              </div>

              {/* Live Connection Feed */}
              <div className="text-xs text-[#ff99aa] flex items-center justify-center gap-2 mt-1">
                <span>
                  {gameState.connectedCount > 0 
                    ? `Live: ${gameState.connectedCount} device${gameState.connectedCount > 1 ? 's' : ''} ready to shake!` 
                    : 'Scan the QR code above with your phone to join'}
                </span>
              </div>
            </div>

            {/* Start Launch Sequence CTA */}
            <button
              onClick={handleStartGame}
              className="w-full max-w-lg py-4 px-6 sci-fi-cut font-orbitron font-black text-xl tracking-widest uppercase bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] hover:from-[#b01430] hover:via-[#ff3d5e] hover:to-[#b01430] active:scale-95 text-white shadow-neon-red-lg border-2 border-white/50 cursor-pointer transition-all flex items-center justify-center gap-3"
            >
              <Zap size={22} className="animate-bounce" />
              <span>START LAUNCH ACTIVATION</span>
            </button>
            <span className="text-[10px] text-[#7a2c39] mt-2">
              (Host can also press [Spacebar] or [S] on keyboard to start)
            </span>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. FULL-SCREEN IMMERSIVE LAUNCH REVEAL              */}
      {/* ==================================================== */}
      {status === 'victory' && (
        <div 
          className="fixed inset-0 z-50 w-screen h-screen bg-gradient-to-b from-[#1f050b] via-[#0c0205] to-[#040102] flex flex-col items-center justify-between p-4 md:p-8 overflow-hidden select-none animate-fade-in"
        >
          {/* Immersive Ambient Energy & Radial Shockwave */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vh] max-w-[1400px] max-h-[1400px] rounded-full bg-gradient-to-r from-[#d03b33]/30 via-[#ff1f43]/20 to-transparent blur-3xl animate-pulse pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65vw] h-[65vh] max-w-[950px] max-h-[950px] rounded-full bg-[#ff4d6d]/25 blur-2xl pointer-events-none animate-ping" style={{ animationDuration: '4s' }} />
            <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
          </div>

          {/* Fullscreen Outer Sci-Fi Border */}
          <div className="absolute inset-3 md:inset-6 border-2 border-[#801b2a]/80 pointer-events-none z-10 sci-fi-cut shadow-[0_0_50px_rgba(208,59,51,0.3)]">
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

          {/* Center: Massive Animated Launch Logo (Large Hero Scale) */}
          <div className="relative z-20 flex-1 flex items-center justify-center w-full max-w-7xl px-2 md:px-6 my-auto">
            <LaunchLogo className="w-full max-w-[860px] md:max-w-[1080px] lg:max-w-[1280px] max-h-[75vh] h-auto" animate={true} />
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
