import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, 
  Smartphone, 
  Flame, 
  Activity, 
  Users, 
  ShieldAlert, 
  Radio,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import LaunchLogo from './LaunchLogo';
import { audioEngine } from '../utils/audioEngine';
import confetti from 'canvas-confetti';

export default function MobileController({ socket, gameState, isConnected: propConnected }) {
  const [playerName, setPlayerName] = useState(() => {
    try { return sessionStorage.getItem('operative_name') || ''; } catch (e) { return ''; }
  });
  const [isRegistered, setIsRegistered] = useState(() => {
    try { return !!sessionStorage.getItem('operative_name'); } catch (e) { return false; }
  });
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');

  const [operativeNumber, setOperativeNumber] = useState(1);
  const [sensorActive, setSensorActive] = useState(false);
  const [needsIOSPermission, setNeedsIOSPermission] = useState(false);
  const [permissionPromptDismissed, setPermissionPromptDismissed] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [lastShakeTimestamp, setLastShakeTimestamp] = useState(0);
  const [gameStartOverlay, setGameStartOverlay] = useState(false);

  const {
    status = 'lobby',
    voltage = 0,
    multiplier = 1,
    connectedCount = 1,
  } = gameState || {};

  const [isConnected, setIsConnected] = useState(propConnected ?? !!socket?.connected);
  const prevStatusRef = useRef(status);

  // Buffer references for high-speed motion tracking
  const accelHistoryRef = useRef([]);
  const lastShakeTimeRef = useRef(0);
  const lastRawCoordsRef = useRef({ x: 0, y: 0, z: 0, time: 0 });
  const socketRef = useRef(socket);
  const statusRef = useRef(status);
  statusRef.current = status;
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

  useEffect(() => {
    socketRef.current = socket;
    if (socket?.connected || propConnected) setIsConnected(true);
  }, [socket, propConnected]);

  // Reset surges when returning to lobby
  useEffect(() => {
    if (status === 'lobby') {
      setShakeCount(0);
    }
  }, [status]);

  // Sync background voltage hum & dynamic synth soundtrack with stage game state
  useEffect(() => {
    audioEngine.updateVoltageHum(voltage, status === 'playing');
  }, [voltage, status]);

  // Handle victory audio & celebratory confetti explosion on mobile
  useEffect(() => {
    if (status === 'victory') {
      try { audioEngine.playVictory(); } catch (e) {}

      // Multi-stage celebratory confetti explosion
      const duration = 5.5 * 1000;
      const animationEnd = Date.now() + duration;
      const colors = ['#e60000', '#ff1f43', '#ffffff', '#ffccd5', '#ffd700', '#ff4d6d'];

      // Instant center burst
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.55 },
          colors,
          zIndex: 9999,
        });
      } catch (e) {}

      // Continuous side stream celebration
      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);

        const particleCount = 25 * (timeLeft / duration);
        try {
          confetti({
            particleCount,
            angle: 60,
            spread: 60,
            origin: { x: 0, y: 0.75 },
            colors,
            zIndex: 9999,
          });
          confetti({
            particleCount,
            angle: 120,
            spread: 60,
            origin: { x: 1, y: 0.75 },
            colors,
            zIndex: 9999,
          });
        } catch (e) {}
      }, 250);

      return () => clearInterval(interval);
    }
  }, [status]);

  // Visual, Haptic, and Audio confirmation when host starts the game
  useEffect(() => {
    if (prevStatusRef.current === 'lobby' && status === 'playing') {
      setShakeCount(0);
      setGameStartOverlay(true);
      
      // Haptic burst pattern
      if (navigator.vibrate) {
        try { navigator.vibrate([120, 60, 180, 60, 250]); } catch (e) {}
      }

      // Audio alarm/surge cue
      audioEngine.ensureRunning();
      try { audioEngine.playGameStart(); } catch (e) {}

      const timer = setTimeout(() => {
        setGameStartOverlay(false);
      }, 2200);

      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status]);

  // Handle socket registration and connection events
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
      if (playerNameRef.current) {
        socket.emit('join_controller', { playerName: playerNameRef.current });
      }
      if (sensorActive) {
        socket.emit('sensor_status', { active: true });
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onGameStarted = () => {
      setShakeCount(0);
      setGameStartOverlay(true);
      if (navigator.vibrate) {
        try { navigator.vibrate([120, 60, 180, 60, 250]); } catch (e) {}
      }
      try { audioEngine.playGameStart(); } catch (e) {}
      setTimeout(() => setGameStartOverlay(false), 2200);
    };

    const onGameReset = () => {
      setShakeCount(0);
      setGameStartOverlay(false);
      audioEngine.resetAudio();
    };

    const onAssigned = ({ operativeNumber: num }) => {
      setIsConnected(true);
      if (num) setOperativeNumber(num);
    };

    const onSync = () => {
      setIsConnected(true);
    };

    if (socket.connected && playerNameRef.current) {
      setIsConnected(true);
      socket.emit('join_controller', { playerName: playerNameRef.current });
    }

    const onMultiplierUp = ({ multiplier: newMult } = {}) => {
      try { audioEngine.playMultiplierUp(newMult || 2); } catch (e) {}
      if (navigator.vibrate) {
        try { navigator.vibrate([60, 40, 80]); } catch (e) {}
      }
    };

    const onBoostActivated = () => {
      try { audioEngine.playBoostSurge(); } catch (e) {}
      if (navigator.vibrate) {
        try { navigator.vibrate([100, 50, 150]); } catch (e) {}
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('controller_assigned', onAssigned);
    socket.on('init_sync', onSync);
    socket.on('game_state_update', onSync);
    socket.on('game_started', onGameStarted);
    socket.on('game_reset', onGameReset);
    socket.on('multiplier_up', onMultiplierUp);
    socket.on('boost_activated', onBoostActivated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('controller_assigned', onAssigned);
      socket.off('init_sync', onSync);
      socket.off('game_state_update', onSync);
      socket.off('game_started', onGameStarted);
      socket.off('game_reset', onGameReset);
      socket.off('multiplier_up', onMultiplierUp);
      socket.off('boost_activated', onBoostActivated);
    };
  }, [socket, sensorActive]);

  // Send Shake Impulse to Server + Haptic Feedback + Audio Zap
  const sendShakeImpulse = useCallback((intensity = 1.0) => {
    audioEngine.ensureRunning();

    if (statusRef.current !== 'playing') {
      setShakeIntensity(0.5);
      setTimeout(() => setShakeIntensity(0), 100);
      return;
    }

    try { audioEngine.playShakeZap(intensity); } catch (e) {}

    setShakeCount(c => c + 1);
    setShakeIntensity(intensity);
    setLastShakeTimestamp(Date.now());

    if (navigator.vibrate) {
      try { navigator.vibrate(35); } catch (e) {}
    }

    const s = socketRef.current;
    if (s) {
      s.emit('shake_pulse', { intensity, playerName: playerNameRef.current });
    }

    setTimeout(() => {
      setShakeIntensity(0);
    }, 150);
  }, []);

  const sendShakeImpulseRef = useRef(sendShakeImpulse);
  sendShakeImpulseRef.current = sendShakeImpulse;

  // Manual screen tap support
  const handleTapSurge = useCallback(() => {
    audioEngine.ensureRunning();
    sendShakeImpulse(1.3);
  }, [sendShakeImpulse]);

  // Motion Processing Function
  const processMotion = useCallback((curX, curY, curZ) => {
    setSensorActive(true);
    const now = Date.now();
    const mag = Math.sqrt(curX * curX + curY * curY + curZ * curZ);

    // 1. Instant delta jerk
    const prev = lastRawCoordsRef.current;
    const dt = now - prev.time;
    let instantJerk = 0;
    if (dt > 0 && dt < 150) {
      const dx = Math.abs(curX - prev.x);
      const dy = Math.abs(curY - prev.y);
      const dz = Math.abs(curZ - prev.z);
      instantJerk = dx + dy + dz;
    }
    lastRawCoordsRef.current = { x: curX, y: curY, z: curZ, time: now };

    // 2. Sliding 200ms Window history
    const history = accelHistoryRef.current;
    history.push({ x: curX, y: curY, z: curZ, mag, time: now });

    while (history.length > 0 && now - history[0].time > 200) {
      history.shift();
    }

    if (history.length < 2) return;

    let minMag = Infinity, maxMag = -Infinity;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < history.length; i++) {
      const s = history[i];
      if (s.mag < minMag) minMag = s.mag;
      if (s.mag > maxMag) maxMag = s.mag;
      if (s.x < minX) minX = s.x;
      if (s.x > maxX) maxX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.y > maxY) maxY = s.y;
      if (s.z < minZ) minZ = s.z;
      if (s.z > maxZ) maxZ = s.z;
    }

    const magRange = maxMag - minMag;
    const maxAxisRange = Math.max(maxX - minX, maxY - minY, maxZ - minZ);

    // Responsive shake trigger for iPhone Safari & Android
    const isShake = (magRange > 1.8 || maxAxisRange > 1.8 || instantJerk > 2.4);

    if (isShake && now - lastShakeTimeRef.current > 70) {
      lastShakeTimeRef.current = now;
      const peak = Math.max(magRange, maxAxisRange, instantJerk);
      const intensity = Math.min(2.0, Math.max(0.7, peak / 3.2));
      sendShakeImpulseRef.current(intensity);
    }
  }, []);

  const processMotionRef = useRef(processMotion);
  processMotionRef.current = processMotion;

  // Stable, Permanent Hardware Event Handlers
  const handleDeviceMotion = useCallback((e) => {
    const a = e.acceleration;
    const ag = e.accelerationIncludingGravity;

    if (a && (a.x !== null || a.y !== null || a.z !== null)) {
      processMotionRef.current(a.x || 0, a.y || 0, a.z || 0);
    } else if (ag && (ag.x !== null || ag.y !== null || ag.z !== null)) {
      processMotionRef.current(ag.x || 0, ag.y || 0, ag.z || 0);
    }
  }, []);

  const handleDeviceOrientation = useCallback((e) => {
    if (e.gamma === null && e.beta === null) return;
    setSensorActive(true);
  }, []);

  // Synchronous User-Gesture iOS Safari Permission Request
  const unlockIOSPermissions = async () => {
    audioEngine.ensureRunning();
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        const motionRes = await DeviceMotionEvent.requestPermission();
        if (motionRes === 'granted') {
          window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
          setSensorActive(true);
          setNeedsIOSPermission(false);
          setPermissionPromptDismissed(true);
          if (socketRef.current) socketRef.current.emit('sensor_status', { active: true });
        } else {
          setNeedsIOSPermission(false);
          setPermissionPromptDismissed(true);
        }
      }

      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const orientRes = await DeviceOrientationEvent.requestPermission();
          if (orientRes === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
          }
        } catch (err) {}
      }
    } catch (e) {
      console.warn('iOS sensor permission notice:', e);
      setNeedsIOSPermission(false);
      setPermissionPromptDismissed(true);
    }
  };

  // Check iOS vs Standard Browsers on Mount
  useEffect(() => {
    const isIOS = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';

    if (isIOS) {
      setNeedsIOSPermission(true);
    } else {
      window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
      window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
      setSensorActive(true);
    }

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, [handleDeviceMotion, handleDeviceOrientation]);

  // Active liveness heartbeat (2s interval)
  useEffect(() => {
    const timer = setInterval(() => {
      if (socketRef.current) {
        socketRef.current.emit('ping_heartbeat', { time: Date.now() });
      }
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Handle Name Registration Form Submission
  const handleRegisterSubmit = (e) => {
    if (e) e.preventDefault();
    const clean = nameInput.trim();
    if (!clean) {
      setNameError('Please enter your name to connect');
      return;
    }

    try {
      sessionStorage.setItem('operative_name', clean);
    } catch (err) {}

    audioEngine.ensureRunning();
    if (statusRef.current === 'playing') {
      audioEngine.updateVoltageHum(voltage, true);
    }

    setPlayerName(clean);
    setIsRegistered(true);
    setNameError('');

    // Trigger iOS permission synchronously on submit button click
    unlockIOSPermissions();

    if (socketRef.current) {
      socketRef.current.emit('join_controller', { playerName: clean });
    }
  };

  // Immediate leave on page unload / navigation away, and refresh on visible
  useEffect(() => {
    const handleUnload = () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_controller');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        audioEngine.ensureRunning();
        if (socketRef.current) {
          socketRef.current.reconnect?.();
          if (playerNameRef.current) {
            socketRef.current.emit('join_controller', { playerName: playerNameRef.current });
          }
        }
      }
    };

    window.addEventListener('pageshow', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const isPlaying = status === 'playing';

  // ====================================================
  // SCREEN 1: ONBOARDING PARTICIPANT NAME ENTRY SCREEN
  // ====================================================
  if (!isRegistered) {
    return (
      <div className="relative min-h-screen w-full bg-[#070204] text-white flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none font-rajdhani">
        {/* Dynamic Background Glow */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#25070e] via-[#0d0205] to-[#040102]" />
          <div className="absolute inset-0 scanlines opacity-15" />
        </div>

        {/* Header Branding */}
        <header className="relative z-10 flex flex-col items-center pt-2">
          <LaunchLogo className="w-auto h-12 sm:h-14 max-w-[220px] object-contain drop-shadow-[0_0_18px_#ff1f43]" animate={false} />
        </header>

        {/* Center Card: Name Entry Box */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full my-auto py-3">
          <div className="w-full bg-[#180409]/95 border-2 border-[#ff1f43]/80 rounded-3xl p-5 sm:p-7 shadow-[0_0_40px_rgba(255,31,67,0.5)] sci-fi-cut flex flex-col items-center text-center">
            
            <div className="w-14 h-14 rounded-full bg-[#ff1f43]/20 border-2 border-[#ff1f43] flex items-center justify-center mb-3.5 shadow-[0_0_20px_#ff1f43] animate-pulse">
              <Users size={28} className="text-[#ff1f43]" />
            </div>

            <h1 className="font-orbitron font-black text-xl sm:text-2xl text-white uppercase tracking-wider drop-shadow-[0_0_12px_#ff1f43]">
              JOIN LAUNCH SURGE
            </h1>
            
            <p className="text-xs sm:text-sm text-[#ffccd5] mt-1.5 mb-5 leading-relaxed">
              Enter your name to connect your phone to the stage reactor
            </p>

            <form onSubmit={handleRegisterSubmit} className="w-full flex flex-col gap-3.5">
              <div className="flex flex-col text-left">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#ff8095] mb-1.5">
                  YOUR FULL NAME
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  placeholder="e.g. Kwame Mensah"
                  autoFocus
                  maxLength={40}
                  className="w-full bg-[#0d0205] border-2 border-[#5a1824] focus:border-[#ff1f43] rounded-xl px-4 py-3.5 text-white text-base sm:text-lg font-orbitron placeholder-[#6b2531] outline-none shadow-panel-inset transition-all"
                />
                {nameError && (
                  <span className="text-[11px] text-[#ff4d6d] font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {nameError}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-4 px-4 sci-fi-cut font-orbitron font-black text-base sm:text-lg tracking-widest uppercase bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] hover:from-[#b01430] hover:via-[#ff3d5e] hover:to-[#b01430] active:scale-95 text-white shadow-neon-red border-2 border-white/80 cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <ArrowRight size={18} />
                <span>ENTER LAUNCH LOBBY</span>
              </button>
            </form>

            <span className="text-[10px] text-[#ff8095]/70 mt-4 tracking-wider uppercase">
              LIVE STAGE SYNCHRONIZATION
            </span>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 text-center py-1.5">
          <span className="font-orbitron text-[9px] sm:text-[10px] text-[#ff8095]/60 tracking-[0.2em] uppercase">
            TELECEL SME MONTH • INTERACTIVE LAUNCH
          </span>
        </footer>
      </div>
    );
  }

  // ====================================================
  // SCREEN 2: MAIN CONTROLLER (LOBBY & ACTIVE PLAYING)
  // ====================================================
  return (
    <div 
      onTouchStart={() => audioEngine.ensureRunning()}
      onPointerDown={() => audioEngine.ensureRunning()}
      className={`relative min-h-screen w-full text-white flex flex-col justify-between p-3.5 sm:p-5 overflow-hidden select-none font-rajdhani touch-none transition-colors duration-500 ${
        isPlaying ? 'bg-[#080204]' : 'bg-[#060203]'
      }`}
    >
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className={`absolute inset-0 bg-gradient-to-b transition-colors duration-500 ${
          isPlaying 
            ? 'from-[#24060d] via-[#0e0206] to-[#050102]' 
            : 'from-[#140306] via-[#090204] to-[#040102]'
        }`} />
        <div className={`absolute inset-0 bg-[#ff1f43]/30 transition-opacity duration-150 ${
          shakeIntensity > 0 && isPlaying ? 'opacity-100' : 'opacity-0'
        }`} />
        <div className="absolute inset-0 scanlines opacity-10" />
      </div>

      {/* ==================================================== */}
      {/* iOS SAFARI SENSOR PERMISSION ONBOARDING MODAL GATE   */}
      {/* ==================================================== */}
      {needsIOSPermission && !sensorActive && !permissionPromptDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
          <div className="bg-[#1a0409]/95 border-2 border-[#ff1f43] shadow-[0_0_50px_rgba(255,31,67,0.7)] p-6 sm:p-8 rounded-3xl flex flex-col items-center text-center max-w-sm w-full sci-fi-cut">
            
            <div className="w-16 h-16 rounded-full bg-[#ff1f43]/20 border-2 border-[#ff1f43] flex items-center justify-center mb-4 shadow-[0_0_24px_#ff1f43] animate-pulse">
              <Smartphone size={32} className="text-[#ff1f43] animate-bounce" />
            </div>

            <span className="font-orbitron font-black text-xl sm:text-2xl text-white uppercase tracking-wider drop-shadow-[0_0_12px_#ff1f43]">
              ACTIVATE MOTION SENSORS
            </span>

            <p className="font-rajdhani text-sm sm:text-base text-[#ffccd5] tracking-wide mt-2.5 leading-relaxed">
              Tap below to grant motion access. When prompted by iPhone Safari, select <strong className="text-white">"Allow"</strong> so shaking your phone charges the launch reactor!
            </p>

            <button
              onClick={unlockIOSPermissions}
              className="mt-6 w-full py-4 px-6 sci-fi-cut font-orbitron font-black text-base sm:text-lg tracking-widest uppercase bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] hover:from-[#b01430] hover:via-[#ff3d5e] hover:to-[#b01430] active:scale-95 text-white shadow-neon-red border-2 border-white/80 cursor-pointer flex items-center justify-center gap-2 transition-all animate-pulse"
            >
              <Smartphone size={20} className="text-white animate-bounce" />
              <span>ENABLE MOTION SENSORS</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* GAME START EXPLOSIVE POPUP OVERLAY                   */}
      {/* ==================================================== */}
      {gameStartOverlay && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#24060d]/95 border-2 border-[#ff1f43] shadow-neon-red-lg p-6 rounded-2xl flex flex-col items-center text-center max-w-xs animate-cyber-core">
            <div className="w-14 h-14 rounded-full bg-[#ff1f43]/20 border border-[#ff1f43] flex items-center justify-center mb-3 shadow-[0_0_20px_#ff1f43]">
              <Activity size={26} className="text-[#ff1f43] animate-pulse" />
            </div>
            <span className="font-orbitron font-black text-xl text-white uppercase tracking-wider drop-shadow-[0_0_12px_#ff1f43]">
              ACTIVATION LIVE!
            </span>
            <p className="font-rajdhani font-bold text-sm text-[#ffccd5] tracking-widest uppercase mt-2">
              SHAKE YOUR PHONE TOGETHER NOW!
            </p>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 1. CONTROLLER HEADER & STATUS BAR                    */}
      {/* ==================================================== */}
      <header className={`relative z-10 flex items-center justify-between border-b pb-2.5 shrink-0 transition-colors duration-300 ${
        isPlaying ? 'border-[#ff1f43]/60' : 'border-[#4d131d]'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded border flex items-center justify-center transition-all ${
            isPlaying 
              ? 'bg-[#3d0d17] border-[#ff1f43] shadow-[0_0_12px_#ff1f43]' 
              : 'bg-[#22070c] border-[#661827]'
          }`}>
            <Smartphone size={16} className={`transition-all ${
              isPlaying && shakeIntensity > 0 ? 'text-white animate-bounce' : (isPlaying ? 'text-[#ff1f43] animate-pulse' : 'text-[#a03d4c]')
            }`} />
          </div>
          <div className="flex flex-col">
            <span className="font-orbitron font-bold text-xs tracking-widest text-white uppercase truncate max-w-[170px] sm:max-w-[220px]">
              {playerName ? playerName : `OPERATIVE #${operativeNumber}`}
            </span>
            <span className={`text-[10px] uppercase font-semibold tracking-wider ${
              isPlaying ? 'text-[#ff4d6d] animate-pulse' : 'text-[#8c2d3c]'
            }`}>
              {isPlaying ? 'OVERCHARGE ACTIVE' : 'LOBBY STANDBY'}
            </span>
          </div>
        </div>

        {/* Live Audience Count Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
          isPlaying ? 'bg-[#20050b] border-[#ff1f43]/70' : 'bg-[#150306] border-[#521520]'
        }`}>
          <Users size={12} className={isPlaying ? 'text-[#ff1f43] animate-pulse' : 'text-[#8c2d3c]'} />
          <span className="font-orbitron font-bold text-xs text-[#ffccd5]">
            {connectedCount} LIVE
          </span>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 2. MAIN CONTROLLER MOTION DISPLAY AREA               */}
      {/* ==================================================== */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-between py-2 sm:py-3 w-full max-w-sm mx-auto select-none">

        {/* Hardware Motion Sensor Active / Permission Banner Slot (Fixed Height) */}
        <div className="h-7 flex items-center justify-center shrink-0 w-full">
          {needsIOSPermission && !sensorActive ? (
            <button
              onClick={unlockIOSPermissions}
              className="inline-flex items-center gap-2 px-4 py-1 bg-[#380e16] border border-[#ff1f43] rounded-full text-xs shadow-[0_0_15px_rgba(255,31,67,0.6)] animate-pulse cursor-pointer"
            >
              <Zap size={13} className="text-[#ff1f43]" />
              <span className="text-white font-bold tracking-wider uppercase">TAP TO ENABLE SENSORS</span>
            </button>
          ) : (
            <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs transition-all ${
              isPlaying 
                ? 'bg-[#1a0408] border border-[#ff1f43]/80 shadow-[0_0_12px_rgba(255,31,67,0.4)]' 
                : 'bg-[#140407] border border-[#2d7a3e]/60 shadow-[0_0_10px_rgba(74,222,128,0.15)]'
            }`}>
              <Activity size={12} className={isPlaying ? 'text-[#ff1f43] animate-bounce' : (sensorActive ? 'text-green-400 animate-pulse' : 'text-yellow-500')} />
              <span className={`font-bold tracking-wider uppercase ${
                isPlaying ? 'text-[#ffccd5]' : (sensorActive ? 'text-green-300' : 'text-yellow-400')
              }`}>
                {isPlaying ? 'SHAKE SENSORS LIVE • SHAKE NOW!' : (sensorActive ? 'SHAKE SENSORS SYNCHRONIZED' : 'CALIBRATING SENSORS...')}
              </span>
            </div>
          )}
        </div>

        {status === 'victory' ? (
          /* Victory / Launch Revealed Logo Screen */
          <div className="flex flex-col items-center text-center p-2 animate-logo-surge w-full my-auto">
            <div className="inline-flex items-center px-5 py-1.5 bg-[#330c14] border border-[#ff1f43] rounded-full mb-3 shadow-[0_0_15px_#ff1f43]">
              <span className="font-orbitron font-black text-[11px] tracking-[0.25em] text-white uppercase">
                WELCOME TO
              </span>
            </div>

            <div className="w-full max-w-[300px] my-3">
              <LaunchLogo className="w-full h-auto" animate={true} />
            </div>

            <p className="font-orbitron font-bold text-xs text-[#ff99aa] uppercase tracking-widest mt-2">
              LAUNCH INITIATION SUCCESSFUL!
            </p>
          </div>
        ) : (
          /* Main Interactive Display: Distinct Lobby vs Playing */
          <>
            {/* Voltage Header Display */}
            <div className="flex flex-col items-center text-center shrink-0">
              <span className={`text-[10px] font-bold tracking-widest uppercase ${
                isPlaying ? 'text-[#ff4d6d]' : 'text-[#8c3240]'
              }`}>
                {isPlaying ? 'COLLECTIVE VOLTAGE' : 'LAUNCH VOLTAGE • STANDBY'}
              </span>
              <div className={`font-orbitron font-black text-5xl sm:text-6xl tracking-wider my-0.5 transition-all ${
                isPlaying 
                  ? 'text-white text-glow-red drop-shadow-[0_0_20px_#ff1f43]' 
                  : 'text-gray-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]'
              }`}>
                {Math.floor(voltage)}%
              </div>
            </div>

            {/* Voltage Gauge Progress Bar */}
            <div className="w-full max-w-[280px] h-4 bg-[#170508] border-2 border-[#521520] rounded-full p-0.5 shadow-panel-inset relative overflow-hidden shrink-0">
              <div 
                className={`h-full rounded-full transition-all duration-150 ${
                  isPlaying 
                    ? 'bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#ffffff] shadow-[0_0_15px_#ff1f43]' 
                    : 'bg-gradient-to-r from-[#4d101a] to-[#731928]'
                }`}
                style={{ width: `${Math.min(100, Math.max(2, voltage))}%` }}
              />
            </div>

            {/* Perfectly Centered Dynamic Physical Motion Reactor Circle */}
            <div 
              onClick={handleTapSurge}
              className={`relative w-44 h-44 sm:w-52 sm:h-52 shrink-0 flex items-center justify-center my-auto transition-transform active:scale-95 select-none ${
                isPlaying ? 'cursor-pointer' : 'pointer-events-none'
              }`}
            >
              
              {/* Outer Energy Aura Rings */}
              <div className={`absolute inset-0 rounded-full border-2 transition-all duration-300 pointer-events-none ${
                isPlaying 
                  ? (shakeIntensity > 0 
                      ? 'scale-110 opacity-100 shadow-[0_0_40px_#ff1f43] border-[#ff1f43]' 
                      : 'scale-100 opacity-60 shadow-[0_0_20px_rgba(255,31,67,0.3)] border-[#ff1f43]/60 animate-pulse')
                  : 'scale-100 opacity-30 border-[#521520]'
              }`} />

              <div className={`absolute inset-3 rounded-full border transition-all duration-200 pointer-events-none ${
                isPlaying 
                  ? (shakeIntensity > 0 ? 'scale-105 opacity-90 border-[#ff4d6d]' : 'opacity-40 border-[#ff1f43]/30')
                  : 'opacity-15 border-[#3b0f17]'
              }`} />

              {/* Inner Reactor Sphere with Perfectly Centered Column Content */}
              <div className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center p-3 text-center transition-all duration-200 shrink-0 pointer-events-none ${
                isPlaying 
                  ? (shakeIntensity > 0 
                      ? 'bg-gradient-to-b from-[#52121f] to-[#1c0409] border-2 border-[#ff1f43] shadow-[0_0_30px_#ff1f43] scale-105' 
                      : 'bg-gradient-to-b from-[#330c14] to-[#140307] border-2 border-[#801b2a] shadow-[0_0_18px_rgba(255,31,67,0.35)]')
                  : 'bg-gradient-to-b from-[#20070c] to-[#0d0205] border-2 border-[#47121b]'
              }`}>
                
                {isPlaying ? (
                  /* PLAYING: Live Motion Feedback */
                  <>
                    <Smartphone size={28} className={`transition-all duration-100 ${
                      shakeIntensity > 0 ? 'text-white scale-120 animate-bounce' : 'text-[#ff1f43]'
                    }`} />
                    <span className="font-orbitron font-black text-xs sm:text-sm uppercase text-white tracking-widest mt-1.5 drop-shadow-[0_0_8px_#ff1f43] whitespace-nowrap">
                      {shakeIntensity > 0 ? 'SURGING!' : 'SHAKE PHONE!'}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[#ffccd5] font-mono font-bold mt-0.5 whitespace-nowrap">
                      {shakeCount} SURGES
                    </span>
                  </>
                ) : (
                  /* LOBBY: Standby Mode */
                  <>
                    <Radio size={24} className="text-[#8c2d3c] animate-pulse" />
                    <span className="font-orbitron font-bold text-xs uppercase text-gray-300 tracking-wider mt-1.5 whitespace-nowrap">
                      STANDBY
                    </span>
                    <span className="text-[9px] text-[#ff8095]/80 font-mono tracking-widest uppercase mt-0.5 whitespace-nowrap">
                      WAIT FOR LAUNCH
                    </span>
                  </>
                )}

              </div>
            </div>

            {/* Live Shake Pulse Surge Banner Slot (Fixed Height to Prevent Layout Shift) */}
            <div className="h-7 flex items-center justify-center shrink-0 w-full pointer-events-none my-0.5">
              <div className={`inline-flex items-center gap-1.5 px-3.5 py-0.5 bg-[#ff1f43]/40 border border-[#ff1f43] rounded-full text-xs font-orbitron font-bold text-white uppercase tracking-wider shadow-[0_0_18px_#ff1f43] transition-all duration-150 ${
                isPlaying && Date.now() - lastShakeTimestamp < 400
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-90'
              }`}>
                <Activity size={13} className="text-white animate-pulse" />
                <span>ENERGY SURGING +VOLTAGE</span>
              </div>
            </div>

            {/* User Instructions (Fixed Height to Prevent Layout Shift) */}
            <div className="h-12 flex flex-col items-center justify-center text-center px-4 max-w-xs shrink-0">
              {isPlaying ? (
                <>
                  <p className="text-xs font-bold text-white uppercase tracking-wide drop-shadow-[0_0_6px_#ff1f43]">
                    SHAKE YOUR PHONE RAPIDLY! 🔥
                  </p>
                  <p className="text-[11px] text-[#ff99aa] mt-0.5 leading-tight">
                    All {connectedCount} connected phones combine motion power to push voltage to 100%!
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                    {playerName ? `READY, ${playerName.toUpperCase()}` : 'YOU ARE CONNECTED • GET READY'}
                  </p>
                  <p className="text-[11px] text-[#ff8095] mt-0.5 leading-tight">
                    When the launch sequence begins on stage, shake your phone vigorously to generate power!
                  </p>
                </>
              )}
            </div>
          </>
        )}

      </main>

      {/* ==================================================== */}
      {/* 3. CONTROLLER FOOTER / TELEMETRY STATUS BAR          */}
      {/* ==================================================== */}
      <footer className="relative z-10 shrink-0">
        <div className={`w-full py-2.5 px-3 border sci-fi-cut flex items-center justify-center gap-2 transition-colors duration-300 ${
          isPlaying 
            ? 'bg-[#22060c]/90 border-[#ff1f43]/60 shadow-[0_0_15px_rgba(255,31,67,0.3)]' 
            : 'bg-[#140306]/80 border-[#4d131d]'
        }`}>
          <Radio size={13} className={isPlaying ? 'text-[#ff1f43] animate-pulse' : 'text-[#8c2d3c]'} />
          <span className={`font-orbitron font-bold text-[10px] sm:text-xs tracking-[0.2em] uppercase ${
            isPlaying ? 'text-[#ffccd5]' : 'text-[#ff8095]'
          }`}>
            {isPlaying ? 'SHAKE YOUR PHONE RAPIDLY TO CHARGE' : 'TELECEL SME MONTH • READY FOR LAUNCH'}
          </span>
        </div>
      </footer>
    </div>
  );
}
