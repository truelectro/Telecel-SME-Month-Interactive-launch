import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, 
  Smartphone, 
  RotateCw, 
  Flame, 
  Activity,
  Users,
  CheckCircle2
} from 'lucide-react';
import LaunchLogo from './LaunchLogo';

export default function MobileController({ socket, gameState }) {
  const [operativeNumber, setOperativeNumber] = useState(1);
  const [sensorActive, setSensorActive] = useState(false);
  const [needsIOSPermission, setNeedsIOSPermission] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [touchActive, setTouchActive] = useState(false);
  const [lastShakeTimestamp, setLastShakeTimestamp] = useState(0);

  const {
    status = 'lobby',
    voltage = 0,
    multiplier = 1,
    connectedCount = 1,
  } = gameState || {};

  const [isConnected, setIsConnected] = useState(!!socket?.connected);

  // Buffer references for high-speed motion tracking
  const accelHistoryRef = useRef([]);
  const lastShakeTimeRef = useRef(0);
  const lastRawCoordsRef = useRef({ x: 0, y: 0, z: 0, time: 0 });
  const socketRef = useRef(socket);

  useEffect(() => {
    socketRef.current = socket;
    if (socket?.connected) setIsConnected(true);
  }, [socket]);

  // Handle socket registration and connection events
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join_controller', { playerName: '' });
      if (sensorActive) {
        socket.emit('sensor_status', { active: true });
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    if (socket.connected) {
      setIsConnected(true);
      socket.emit('join_controller', { playerName: '' });
    }

    const onAssigned = ({ operativeNumber: num }) => {
      if (num) setOperativeNumber(num);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('controller_assigned', onAssigned);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('controller_assigned', onAssigned);
    };
  }, [socket, sensorActive]);

  // Send Shake Impulse to Server + Haptic Feedback
  const sendShakeImpulse = useCallback((intensity = 1.0) => {
    setShakeCount(c => c + 1);
    setShakeIntensity(intensity);
    setLastShakeTimestamp(Date.now());

    if (navigator.vibrate) {
      try { navigator.vibrate(30); } catch (e) {}
    }

    const s = socketRef.current;
    if (s) {
      s.emit('shake_pulse', { intensity });
    }

    setTimeout(() => {
      setShakeIntensity(0);
    }, 120);
  }, []);

  // Motion Analyzer - Handles both Linear Acceleration & Gravity Vector (iOS Safari + Android)
  const onRawMotion = useCallback((x, y, z) => {
    setSensorActive(true);
    const now = Date.now();
    const curX = x || 0;
    const curY = y || 0;
    const curZ = z || 0;
    const mag = Math.sqrt(curX * curX + curY * curY + curZ * curZ);

    // 1. Check instant delta jerk from previous sample
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

    // Shake Trigger Criteria: Responsive threshold for iPhone and Android
    // Detects wrist flicks, vertical pumps, and lateral shakes
    const isShake = (magRange > 2.4 || maxAxisRange > 2.4 || instantJerk > 3.2);

    if (isShake && now - lastShakeTimeRef.current > 90) {
      lastShakeTimeRef.current = now;
      const peak = Math.max(magRange, maxAxisRange, instantJerk);
      const intensity = Math.min(2.0, Math.max(0.7, peak / 3.8));
      sendShakeImpulse(intensity);
    }
  }, [sendShakeImpulse]);

  // Motion event listener dispatcher
  const handleDeviceMotionEvent = useCallback((e) => {
    const a = e.acceleration;
    const ag = e.accelerationIncludingGravity;

    if (a && (a.x !== null || a.y !== null || a.z !== null)) {
      onRawMotion(a.x || 0, a.y || 0, a.z || 0);
    } else if (ag && (ag.x !== null || ag.y !== null || ag.z !== null)) {
      // iPhone Safari returns full acceleration with gravity
      onRawMotion(ag.x || 0, ag.y || 0, ag.z || 0);
    }
  }, [onRawMotion]);

  // Gyroscope orientation listener
  const handleDeviceOrientationEvent = useCallback((e) => {
    if (e.gamma === null && e.beta === null) return;
    setSensorActive(true);
  }, []);

  // iOS Safari Permission Unlock
  const unlockIOSPermissions = async () => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        const motionRes = await DeviceMotionEvent.requestPermission();
        if (motionRes === 'granted') {
          window.addEventListener('devicemotion', handleDeviceMotionEvent, { passive: true });
          setNeedsIOSPermission(false);
          setSensorActive(true);
          if (socketRef.current) socketRef.current.emit('sensor_status', { active: true });
        }
      }

      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const orientRes = await DeviceOrientationEvent.requestPermission();
          if (orientRes === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientationEvent, { passive: true });
          }
        } catch (err) {
          // Orientation permission is optional if motion is granted
        }
      }
    } catch (e) {
      console.warn('iOS sensor permission notice:', e);
    }
  };

  // Attach Hardware Listeners on Mount (Automatic iOS & Android)
  useEffect(() => {
    const isIOS = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';

    if (isIOS) {
      setNeedsIOSPermission(true);

      // 1. Attempt immediate automatic permission prompt on load
      unlockIOSPermissions();

      // 2. Fallback: prompt immediately on the very first touch/tap anywhere on the page
      const autoPromptOnTouch = () => {
        unlockIOSPermissions();
      };

      window.addEventListener('touchstart', autoPromptOnTouch, { once: true, passive: true });
      window.addEventListener('touchend', autoPromptOnTouch, { once: true, passive: true });
      window.addEventListener('pointerdown', autoPromptOnTouch, { once: true, passive: true });
      window.addEventListener('click', autoPromptOnTouch, { once: true, passive: true });

      return () => {
        window.removeEventListener('touchstart', autoPromptOnTouch);
        window.removeEventListener('touchend', autoPromptOnTouch);
        window.removeEventListener('pointerdown', autoPromptOnTouch);
        window.removeEventListener('click', autoPromptOnTouch);
        window.removeEventListener('devicemotion', handleDeviceMotionEvent);
        window.removeEventListener('deviceorientation', handleDeviceOrientationEvent);
      };
    }

    // Android / Standard Browsers (no prompt required)
    window.addEventListener('devicemotion', handleDeviceMotionEvent, { passive: true });
    window.addEventListener('deviceorientation', handleDeviceOrientationEvent, { passive: true });
    setSensorActive(true);

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotionEvent);
      window.removeEventListener('deviceorientation', handleDeviceOrientationEvent);
    };
  }, [handleDeviceMotionEvent, handleDeviceOrientationEvent]);

  // Active liveness heartbeat (1s interval)
  useEffect(() => {
    const timer = setInterval(() => {
      if (socketRef.current) {
        socketRef.current.emit('ping_heartbeat', { time: Date.now() });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Immediate leave on page unload / navigation away, and refresh on visible
  useEffect(() => {
    const handleUnload = () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_controller');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Screen turned on / tab reopened -> verify connection and re-join
        if (socketRef.current) {
          if (!socketRef.current.connected) {
            socketRef.current.connectToHost();
          } else {
            socketRef.current.emit('join_controller', { playerName: '' });
          }
        }
      }
    };

    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Screen Tap Fallback
  const handleTapSurge = () => {
    if (needsIOSPermission) {
      unlockIOSPermissions();
    }
    setTouchActive(true);
    sendShakeImpulse(1.0);
    setTimeout(() => setTouchActive(false), 100);
  };

  return (
    <div 
      className="relative min-h-screen w-full bg-[#080204] text-white flex flex-col justify-between p-3 md:p-4 overflow-hidden select-none font-rajdhani touch-none"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#20060c] via-[#0d0205] to-[#050102]" />
        <div className={`absolute inset-0 bg-[#ff1f43]/25 transition-opacity duration-100 ${
          shakeIntensity > 0 || touchActive ? 'opacity-100' : 'opacity-0'
        }`} />
      </div>

      {/* ==================================================== */}
      {/* 1. CONTROLLER HEADER & STATUS BAR                    */}
      {/* ==================================================== */}
      <header className="relative z-10 flex items-center justify-between border-b border-[#4d131d] pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#330c14] border border-[#ff1f43] flex items-center justify-center shadow-[0_0_10px_#ff1f43]">
            <Smartphone size={16} className="text-[#ff1f43]" />
          </div>
          <div className="flex flex-col">
            <span className="font-orbitron font-bold text-xs tracking-widest text-white uppercase">
              OPERATIVE #{operativeNumber}
            </span>
            <span className="text-[10px] text-[#ff8095] uppercase">
              {status === 'playing' ? 'SYSTEM OVERCHARGE ACTIVE' : 'TELECEL LAUNCH UNIT'}
            </span>
          </div>
        </div>

        {/* Live Audience Count Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a0408] border border-[#661827] rounded-full">
          <Users size={12} className="text-[#ff1f43]" />
          <span className="font-orbitron font-bold text-xs text-[#ffccd5]">
            {connectedCount} LIVE
          </span>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 2. MAIN CONTROLLER INTERACTION AREA                  */}
      {/* ==================================================== */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-3 py-2">

        {/* Hardware Motion Sensor Active Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#140407] border border-[#4d131d] rounded-full text-xs">
          <Activity size={12} className={sensorActive ? 'text-green-400 animate-pulse' : 'text-yellow-500'} />
          <span className={sensorActive ? 'text-green-300 font-bold' : 'text-yellow-400'}>
            {sensorActive ? 'MOTION ACCELEROMETER ACTIVE' : 'TOUCH & TAP CONTROLLER READY'}
          </span>
        </div>

        {status === 'victory' ? (
          /* Victory / Launch Revealed Logo Screen */
          <div className="flex flex-col items-center text-center p-2 animate-logo-surge w-full">
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
          /* Active Gameplay Shake Interface */
          <>
            {/* Voltage Percentage */}
            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] font-bold tracking-widest text-[#ff4d6d] uppercase">
                {status === 'playing' ? 'COLLECTIVE VOLTAGE' : 'STANDBY • READY TO SHAKE'}
              </span>
              <div className="font-orbitron font-black text-5xl text-white text-glow-red tracking-wider my-0.5">
                {Math.floor(voltage)}%
              </div>
            </div>

            {/* Mini Voltage Gauge */}
            <div className="w-full max-w-[280px] h-6 bg-[#170508] border-2 border-[#661827] rounded-full p-0.5 shadow-panel-inset relative overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#ffffff] rounded-full transition-all duration-100 shadow-[0_0_15px_#ff1f43]"
                style={{ width: `${Math.min(100, Math.max(2, voltage))}%` }}
              />
            </div>

            {/* Central Shake Orb */}
            <div 
              onClick={handleTapSurge}
              className="relative w-36 h-36 flex items-center justify-center cursor-pointer active:scale-95 transition-transform my-1"
            >
              <div className={`absolute inset-0 rounded-full border-2 border-[#ff1f43] transition-transform duration-150 ${
                shakeIntensity > 0 || touchActive ? 'scale-115 opacity-100 shadow-[0_0_30px_#ff1f43]' : 'scale-100 opacity-40'
              }`} />
              <div className={`absolute inset-3 rounded-full border border-[#ff4d6d]/40 transition-transform duration-100 ${
                shakeIntensity > 0 || touchActive ? 'scale-110' : 'scale-95'
              }`} />

              <div className={`w-24 h-24 rounded-full bg-gradient-to-b from-[#380e16] to-[#1a0408] border-2 border-[#801b2a] flex flex-col items-center justify-center transition-all ${
                shakeIntensity > 0 || touchActive ? 'scale-110 border-[#ff1f43] shadow-[0_0_25px_#ff1f43] bg-[#5c1322]' : ''
              }`}>
                <RotateCw size={24} className={`text-[#ff4d6d] ${shakeIntensity > 0 || touchActive ? 'animate-spin text-white' : ''}`} />
                <span className="font-orbitron font-bold text-xs uppercase text-white tracking-widest mt-1">
                  SHAKE!
                </span>
                <span className="text-[9px] text-[#ff8095] font-mono">
                  {shakeCount} SURGES
                </span>
              </div>
            </div>

            {/* Live Shake Pulse Feedback Banner */}
            {Date.now() - lastShakeTimestamp < 300 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-[#ff1f43]/30 border border-[#ff1f43] rounded-full text-[10px] font-orbitron font-bold text-white uppercase tracking-wider animate-pulse">
                <Zap size={11} className="text-[#ff1f43]" />
                <span>SURGE CONTRIBUTING! +ENERGY</span>
              </div>
            )}

            {/* Instructions */}
            <div className="text-center px-4">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                {status === 'playing' ? 'Shake your phone vigorously!' : 'You are connected! Get ready.'}
              </p>
              <p className="text-[11px] text-[#ff99aa]">
                {status === 'playing'
                  ? `All ${connectedCount} connected phones combine power to hit 100%!`
                  : 'Waiting for host to initiate launch sequence on stage...'}
              </p>
            </div>
          </>
        )}

      </main>

      {/* ==================================================== */}
      {/* 3. CONTROLLER FOOTER & TAP TO CHARGE BUTTON          */}
      {/* ==================================================== */}
      <footer className="relative z-10 flex flex-col gap-2">
        <button
          onClick={handleTapSurge}
          className={`w-full py-3.5 px-4 sci-fi-cut font-orbitron font-black text-base tracking-widest uppercase transition-all duration-150 flex items-center justify-center gap-2 ${
            status === 'playing'
              ? 'bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] active:scale-95 text-white shadow-neon-red border border-white/40 cursor-pointer'
              : 'bg-[#2b0810] border border-[#ff1f43]/50 text-[#ffccd5] cursor-pointer'
          }`}
        >
          <Zap size={18} className={status === 'playing' ? 'animate-bounce text-white' : 'text-[#ff1f43]'} />
          <span>{status === 'playing' ? 'TAP OR SHAKE TO SURGE! ⚡' : 'CONNECTED • READY TO SHAKE ⚡'}</span>
        </button>
      </footer>
    </div>
  );
}
