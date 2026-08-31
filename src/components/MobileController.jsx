import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Smartphone, 
  RotateCw, 
  Flame, 
  Radio, 
  Activity,
  Users
} from 'lucide-react';
import LaunchLogo from './LaunchLogo';

export default function MobileController({ socket, gameState }) {
  const [operativeNumber, setOperativeNumber] = useState(1);
  const [sensorActive, setSensorActive] = useState(false);
  const [needsIOSPermission, setNeedsIOSPermission] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [isBoosting, setIsBoosting] = useState(false);
  const [touchActive, setTouchActive] = useState(false);

  const {
    status = 'lobby',
    voltage = 0,
    multiplier = 1,
    boostCharges = 5,
    timeRemaining = 90,
    connectedCount = 1,
    maxCapacity = 200,
  } = gameState || {};

  const [isConnected, setIsConnected] = useState(!!socket?.connected);

  // Windowed History Buffers for frequency-independent shake detection (120Hz Pixel, 60Hz iPhone)
  const accelHistoryRef = useRef([]); // array of { x, y, z, mag, time }
  const orientHistoryRef = useRef([]); // array of { gamma, beta, time }
  const lastShakeTimeRef = useRef(0);
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
  }, [socket]);

  // Send Shake Impulse to Server + Haptic Feedback
  const sendShakeImpulse = (intensity = 1.0) => {
    setShakeCount(c => c + 1);
    setShakeIntensity(intensity);

    if (navigator.vibrate) {
      try { navigator.vibrate(35); } catch (e) {}
    }

    const s = socketRef.current;
    if (s && s.connected) {
      s.emit('shake_pulse', { intensity });
    }

    setTimeout(() => {
      setShakeIntensity(0);
    }, 120);
  };

  // LOWER SENSITIVITY Sliding 160ms Window Acceleration Analyzer
  const onRawAccel = (x, y, z) => {
    setSensorActive(true);
    const now = Date.now();
    const curX = x || 0;
    const curY = y || 0;
    const curZ = z || 0;
    const mag = Math.sqrt(curX * curX + curY * curY + curZ * curZ);

    const history = accelHistoryRef.current;
    history.push({ x: curX, y: curY, z: curZ, mag, time: now });

    // Prune entries older than 160ms
    while (history.length > 0 && now - history[0].time > 160) {
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

    // CALIBRATED LOWER SENSITIVITY:
    // Requires a firm, energetic shake stroke (magRange > 5.0 or maxAxisRange > 4.6)
    // Filters out idle jitter and table bumps
    if ((magRange > 5.0 || maxAxisRange > 4.6) && now - lastShakeTimeRef.current > 130) {
      lastShakeTimeRef.current = now;
      const peak = Math.max(magRange, maxAxisRange);
      const intensity = Math.min(2.0, Math.max(0.8, peak / 4.5));
      sendShakeImpulse(intensity);
    }
  };

  // Sliding 160ms Window Gyroscope Analyzer (Lower Sensitivity)
  const onRawOrient = (gamma, beta) => {
    if (gamma === null || beta === null) return;
    setSensorActive(true);
    const now = Date.now();

    const history = orientHistoryRef.current;
    history.push({ gamma, beta, time: now });

    while (history.length > 0 && now - history[0].time > 160) {
      history.shift();
    }

    if (history.length < 2) return;

    let minG = Infinity, maxG = -Infinity;
    let minB = Infinity, maxB = -Infinity;

    for (let i = 0; i < history.length; i++) {
      const s = history[i];
      if (s.gamma < minG) minG = s.gamma;
      if (s.gamma > maxG) maxG = s.gamma;
      if (s.beta < minB) minB = s.beta;
      if (s.beta > maxB) maxB = s.beta;
    }

    const gRange = maxG - minG;
    const bRange = maxB - minB;

    // Firm wrist flick / rotation > 12 degrees across 160ms
    if ((gRange > 12.0 || bRange > 12.0) && now - lastShakeTimeRef.current > 130) {
      lastShakeTimeRef.current = now;
      const peak = Math.max(gRange, bRange);
      const intensity = Math.min(2.0, Math.max(0.8, peak / 14.0));
      sendShakeImpulse(intensity);
    }
  };

  // Attach Hardware Listeners
  useEffect(() => {
    const isIOS = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';

    if (isIOS) {
      setNeedsIOSPermission(true);
      return;
    }

    let genericSensor = null;

    const handleMotion = (e) => {
      const a = e.acceleration;
      const ag = e.accelerationIncludingGravity;
      
      if (a && (a.x !== null || a.y !== null || a.z !== null)) {
        onRawAccel(a.x || 0, a.y || 0, a.z || 0);
      } else if (ag && (ag.x !== null || ag.y !== null || ag.z !== null)) {
        const x = ag.x || 0;
        const y = ag.y || 0;
        const z = ag.z || 0;
        const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
        if (az >= ax && az >= ay) {
          onRawAccel(x, y, z > 0 ? z - 9.8 : z + 9.8);
        } else if (ay >= ax) {
          onRawAccel(x, y > 0 ? y - 9.8 : y + 9.8, z);
        } else {
          onRawAccel(x > 0 ? x - 9.8 : x + 9.8, y, z);
        }
      }
    };

    const handleOrient = (e) => {
      onRawOrient(e.gamma, e.beta);
    };

    window.addEventListener('devicemotion', handleMotion, { passive: true });
    window.addEventListener('deviceorientation', handleOrient, { passive: true });

    if ('LinearAccelerationSensor' in window) {
      try {
        genericSensor = new window.LinearAccelerationSensor({ frequency: 60 });
        genericSensor.addEventListener('reading', () => {
          onRawAccel(genericSensor.x, genericSensor.y, genericSensor.z);
        });
        genericSensor.start();
        setSensorActive(true);
      } catch (err) {}
    }

    setSensorActive(true);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrient);
      if (genericSensor) {
        try { genericSensor.stop(); } catch (e) {}
      }
    };
  }, []);

  // iOS Permission Unlock
  const unlockIOSPermissions = async () => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        const motionRes = await DeviceMotionEvent.requestPermission();
        if (motionRes === 'granted') {
          window.addEventListener('devicemotion', (e) => {
            const a = e.acceleration;
            if (a && (a.x !== null || a.y !== null || a.z !== null)) {
              onRawAccel(a.x || 0, a.y || 0, a.z || 0);
            }
          }, { passive: true });
        }
      }
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const orientRes = await DeviceOrientationEvent.requestPermission();
        if (orientRes === 'granted') {
          window.addEventListener('deviceorientation', (e) => {
            onRawOrient(e.gamma, e.beta);
          }, { passive: true });
        }
      }
      setNeedsIOSPermission(false);
      setSensorActive(true);
      if (socketRef.current) socketRef.current.emit('sensor_status', { active: true });
    } catch (e) {
      console.warn('iOS sensor permission denied:', e);
    }
  };

  // Boost Trigger
  const handleBoost = () => {
    if (boostCharges > 0 && status === 'playing') {
      setIsBoosting(true);
      if (navigator.vibrate) {
        try { navigator.vibrate([60, 30, 80, 30, 150]); } catch (e) {}
      }
      const s = socketRef.current;
      if (s && s.connected) {
        s.emit('trigger_boost');
      }
      setTimeout(() => setIsBoosting(false), 500);
    }
  };

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
        <div className={`absolute inset-0 bg-[#ff1f43]/20 transition-opacity duration-150 ${
          shakeIntensity > 0 || touchActive ? 'opacity-100' : 'opacity-0'
        }`} />
        <div className="absolute inset-0 scanlines opacity-40" />
      </div>

      {/* ==================================================== */}
      {/* 1. HEADER & SENSOR STATUS                            */}
      {/* ==================================================== */}
      <header className="relative z-10 flex items-center justify-between border-b border-[#4d131d] pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#330c14] border border-[#ff1f43] flex items-center justify-center shadow-[0_0_10px_#ff1f43]">
            <Zap size={18} className="text-[#ff1f43]" />
          </div>
          <div className="flex flex-col">
            <span className="font-orbitron font-black text-sm text-white tracking-wider">
              LAUNCH SURGE
            </span>
            <span className="text-[10px] font-bold text-[#ff4d6d] uppercase tracking-widest">
              OPERATIVE #{operativeNumber}
            </span>
          </div>
        </div>

        {/* Multiplier Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#22070c] border border-[#6b1a28] rounded-full">
          <Flame size={14} className="text-[#ff1f43]" />
          <span className="font-orbitron font-black text-sm text-white">
            {multiplier}X
          </span>
        </div>
      </header>

      {/* iOS Safari Tap-To-Unlock Banner */}
      {needsIOSPermission && (
        <div 
          onClick={unlockIOSPermissions}
          className="relative z-20 my-2 bg-[#2b0a11] border-2 border-[#ff1f43] p-3.5 rounded-xl shadow-neon-red flex flex-col items-center text-center cursor-pointer active:scale-95 transition-transform animate-pulse"
        >
          <Smartphone size={28} className="text-[#ff4d6d] mb-1" />
          <h3 className="font-orbitron font-bold text-xs text-white uppercase">
            TAP HERE TO ENABLE MOTION SHAKE
          </h3>
          <p className="text-[11px] text-[#ffb3c0] mt-0.5">
            Required once by iPhone Safari to activate sensors.
          </p>
        </div>
      )}

      {/* Live Crowd & Sensor Status */}
      <div className="relative z-10 flex items-center justify-between bg-[#140407] border border-[#3b0e16] px-3 py-1.5 rounded-lg text-[11px]">
        <div className="flex items-center gap-1.5 text-gray-300">
          <Users size={12} className="text-[#ff1f43] animate-pulse" />
          <span className="font-semibold text-[#ff99aa]">
            {connectedCount} Connected Audience
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-300">
          <Activity size={12} className={sensorActive ? 'text-green-400 animate-pulse' : 'text-yellow-500'} />
          <span>Sensors: {sensorActive ? 'Active ⚡' : 'Listening...'}</span>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. MAIN REACTOR STATUS & SHAKE ORB                   */}
      {/* ==================================================== */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center my-2 gap-2.5">
        
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
              {status === 'playing' && (
                <span className="text-xs font-semibold text-[#ff8095] uppercase tracking-wide">
                  {timeRemaining}s REMAINING
                </span>
              )}
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
                shakeIntensity > 0 || touchActive ? 'scale-110 opacity-100 shadow-[0_0_25px_#ff1f43]' : 'scale-100 opacity-40'
              }`} />
              <div className={`absolute inset-3 rounded-full border border-[#ff4d6d]/40 transition-transform duration-100 ${
                shakeIntensity > 0 || touchActive ? 'scale-105' : 'scale-95'
              }`} />

              <div className={`w-24 h-24 rounded-full bg-gradient-to-b from-[#380e16] to-[#1a0408] border-2 border-[#801b2a] flex flex-col items-center justify-center transition-all ${
                shakeIntensity > 0 || touchActive ? 'scale-105 border-[#ff1f43] shadow-[0_0_20px_#ff1f43]' : ''
              }`}>
                <RotateCw size={24} className={`text-[#ff4d6d] ${shakeIntensity > 0 || touchActive ? 'animate-spin' : ''}`} />
                <span className="font-orbitron font-bold text-xs uppercase text-white tracking-widest mt-1">
                  SHAKE!
                </span>
                <span className="text-[9px] text-[#ff8095] font-mono">
                  {shakeCount} SURGES
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-center px-4">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                Shake your phone firmly!
              </p>
              <p className="text-[11px] text-[#ff99aa]">
                All {connectedCount} connected phones combine power to hit 100%!
              </p>
            </div>
          </>
        )}

      </main>

      {/* ==================================================== */}
      {/* 3. CONTROLLER FOOTER & BOOST BUTTON                  */}
      {/* ==================================================== */}
      <footer className="relative z-10 flex flex-col gap-2">
        <button
          onClick={handleBoost}
          disabled={boostCharges <= 0 || status !== 'playing'}
          className={`w-full py-3.5 px-4 sci-fi-cut font-orbitron font-black text-base tracking-widest uppercase transition-all duration-150 flex items-center justify-center gap-2 ${
            boostCharges > 0 && status === 'playing'
              ? 'bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] active:scale-95 text-white shadow-neon-red border border-white/40 cursor-pointer'
              : 'bg-[#1c060b] text-[#521721] border border-[#2e0b11] cursor-not-allowed opacity-50'
          } ${isBoosting ? 'scale-105 brightness-150' : ''}`}
        >
          <Zap size={18} className={boostCharges > 0 && status === 'playing' ? 'animate-bounce' : ''} />
          <span>BOOST SURGE ({boostCharges})</span>
        </button>
      </footer>
    </div>
  );
}
