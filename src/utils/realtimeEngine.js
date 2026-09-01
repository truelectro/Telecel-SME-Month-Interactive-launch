import { Peer } from 'peerjs';
import { io } from 'socket.io-client';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.services.mozilla.com' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelay',
    credential: 'openrelay',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelay',
    credential: 'openrelay',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelay',
    credential: 'openrelay',
  },
];

const EVENT_CONFIG = {
  MAX_CAPACITY: 250,
  ROUND_TIME_SECONDS: 90,
  DECAY_RATE_PER_SEC: 4.5,       // Hardened high-energy decay
  SHAKE_VOLTAGE_BASE: 0.45,     // Hardened per-shake power
  COMBO_DECAY_TIME_MS: 400,
  BOOST_AMOUNT: 3.5,
  INITIAL_BOOST_CHARGES: 3,
};

/**
 * Authoritative Client-Side Game Host Engine (used when running on Vercel or Serverless)
 */
class BrowserHostEngine {
  constructor(roomCode, onBroadcast, onLocalEvent) {
    this.roomCode = roomCode;
    this.onBroadcast = onBroadcast;
    this.onLocalEvent = onLocalEvent;
    this.participantCounter = 0;

    this.gameState = {
      status: 'lobby',
      voltage: 0.0,
      score: 0,
      highScore: 50000,
      multiplier: 1,
      multiplierProgress: 0,
      boostCharges: EVENT_CONFIG.INITIAL_BOOST_CHARGES,
      timeRemaining: EVENT_CONFIG.ROUND_TIME_SECONDS,
      recentSurges: [],
      connectedCount: 0,
      maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
      recentJoins: [],
      players: {},
      lastActiveShakeTime: Date.now(),
      lastTickTime: Date.now(),
    };

    this.physicsInterval = null;
    this.lastPruneTime = Date.now();
    this.startPhysicsLoop();
  }

  resetGame(newStatus = 'lobby') {
    this.gameState.status = newStatus;
    this.gameState.voltage = 0.0;
    this.gameState.score = 0;
    this.gameState.multiplier = 1;
    this.gameState.multiplierProgress = 0;
    this.gameState.boostCharges = EVENT_CONFIG.INITIAL_BOOST_CHARGES;
    this.gameState.timeRemaining = EVENT_CONFIG.ROUND_TIME_SECONDS;
    this.gameState.lastActiveShakeTime = Date.now();
    this.gameState.lastTickTime = Date.now();

    for (const id in this.gameState.players) {
      this.gameState.players[id].shakes = 0;
      this.gameState.players[id].intensity = 0;
    }
  }

  startPhysicsLoop() {
    this.physicsInterval = setInterval(() => {
      const now = Date.now();
      const dt = (now - this.gameState.lastTickTime) / 1000;
      this.gameState.lastTickTime = now;

      const totalOperatives = Object.keys(this.gameState.players).length;
      this.gameState.connectedCount = totalOperatives;

      // Real-time active vs idle participant tracking (window: 1800ms)
      let activeShakers = 0;
      for (const id in this.gameState.players) {
        const p = this.gameState.players[id];
        if (p.lastShakeTime && (now - p.lastShakeTime < 1800)) {
          activeShakers += 1;
        }
      }
      const idleCount = Math.max(0, totalOperatives - activeShakers);
      const activeRatio = totalOperatives > 0 ? (activeShakers / totalOperatives) : 1.0;

      if (this.gameState.status === 'playing') {
        // Dynamic Progressive Voltage Decay (Increases with voltage for dramatic climax tension)
        const timeSinceShake = now - this.gameState.lastActiveShakeTime;
        let currentDecay = EVENT_CONFIG.DECAY_RATE_PER_SEC;

        if (this.gameState.voltage > 85) {
          currentDecay *= 2.0; // Climax tension drain (9.0%/s)
        } else if (this.gameState.voltage > 70) {
          currentDecay *= 1.5;
        } else if (this.gameState.voltage > 45) {
          currentDecay *= 1.25;
        }

        // IDLE PARTICIPANT RESISTANCE PENALTY:
        if (totalOperatives >= 2 && idleCount > 0) {
          const idlePenalty = 1.0 + ((1.0 - activeRatio) * 1.2);
          currentDecay *= idlePenalty;
        }

        if (timeSinceShake > 400) {
          this.gameState.voltage = Math.max(0, this.gameState.voltage - (currentDecay * dt));
        }

        // Score accumulation
        if (this.gameState.voltage > 1) {
          const scoreGain = Math.round((this.gameState.voltage * 2) * dt * 10);
          this.gameState.score += scoreGain;
          if (this.gameState.score > this.gameState.highScore) {
            this.gameState.highScore = this.gameState.score;
          }
        }

        // Victory condition (100% overcharge)
        if (this.gameState.voltage >= 100) {
          this.gameState.voltage = 100;
          this.gameState.status = 'victory';
          this.gameState.score += Math.round(10000 * this.gameState.multiplier);
          this.broadcast('game_victory', {
            score: this.gameState.score,
            participantCount: this.gameState.connectedCount,
          });
        }
      }

      // Prune inactive/disconnected players every 3s (60s threshold to accommodate mobile background throttling)
      if (now - this.lastPruneTime > 3000) {
        this.lastPruneTime = now;
        let countChanged = false;
        for (const id in this.gameState.players) {
          const p = this.gameState.players[id];
          if (p.lastSeen && (now - p.lastSeen > 60000)) {
            delete this.gameState.players[id];
            countChanged = true;
          }
        }
        if (countChanged) {
          this.gameState.connectedCount = Object.keys(this.gameState.players).length;
          this.broadcast('game_state_update', {
            connectedCount: this.gameState.connectedCount,
            status: this.gameState.status,
            voltage: Number(this.gameState.voltage.toFixed(2)),
          });
        }
      }

      // Broadcast state update (30Hz)
      const payload = {
        status: this.gameState.status,
        voltage: Number(this.gameState.voltage.toFixed(2)),
        score: this.gameState.score,
        highScore: this.gameState.highScore,
        multiplier: this.gameState.multiplier,
        multiplierProgress: Math.round(this.gameState.multiplierProgress),
        boostCharges: this.gameState.boostCharges,
        timeRemaining: Math.ceil(this.gameState.timeRemaining),
        connectedCount: this.gameState.connectedCount,
        activeShakers,
        idleCount,
        activeRatio: Number(activeRatio.toFixed(2)),
        maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
        recentJoins: this.gameState.recentJoins.slice(-5),
      };

      this.broadcast('game_state_update', payload);
    }, 33);
  }

  handlePlayerJoin(senderId, playerName = '') {
    this.participantCounter += 1;
    const operativeNumber = this.participantCounter;
    const displayName = playerName?.trim() || `Operative #${operativeNumber}`;
    const now = Date.now();

    this.gameState.players[senderId] = {
      id: senderId,
      number: operativeNumber,
      name: displayName,
      shakes: 0,
      lastShakeTime: 0,
      intensity: 0,
      sensorActive: false,
      lastSeen: now,
    };

    this.gameState.connectedCount = Object.keys(this.gameState.players).length;

    this.gameState.recentJoins.push({
      number: operativeNumber,
      name: displayName,
      time: now,
    });
    if (this.gameState.recentJoins.length > 20) {
      this.gameState.recentJoins.shift();
    }

    const assignedData = {
      operativeNumber,
      player: this.gameState.players[senderId],
      connectedCount: this.gameState.connectedCount,
      maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
    };

    this.sendToPeer(senderId, 'controller_assigned', assignedData);

    this.broadcast('participant_joined', {
      operativeNumber,
      name: displayName,
      connectedCount: this.gameState.connectedCount,
      maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
    });

    return assignedData;
  }

  handlePlayerHeartbeat(senderId) {
    const now = Date.now();
    if (this.gameState.players[senderId]) {
      this.gameState.players[senderId].lastSeen = now;
    } else {
      this.handlePlayerJoin(senderId, '');
    }
  }

  handlePlayerLeave(senderId) {
    if (this.gameState.players[senderId]) {
      const p = this.gameState.players[senderId];
      delete this.gameState.players[senderId];
      this.gameState.connectedCount = Object.keys(this.gameState.players).length;

      this.broadcast('participant_left', {
        operativeNumber: p.number,
        connectedCount: this.gameState.connectedCount,
        maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
      });

      this.broadcast('game_state_update', {
        connectedCount: this.gameState.connectedCount,
        status: this.gameState.status,
        voltage: Number(this.gameState.voltage.toFixed(2)),
      });
    }
  }

  handleStartGame() {
    if (this.gameState.status === 'playing' || this.gameState.status === 'countdown') return;
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.gameState.status = 'countdown';
    this.gameState.countdownValue = 3;
    this.gameState.voltage = 0.0;
    this.gameState.timeRemaining = EVENT_CONFIG.ROUND_TIME_SECONDS;
    this.gameState.lastActiveShakeTime = Date.now();

    this.broadcast('countdown_started', { count: 3 });
    this.broadcast('game_state_update', {
      status: 'countdown',
      countdownValue: 3,
      voltage: 0,
      connectedCount: this.gameState.connectedCount,
    });

    let currentCount = 3;
    this.countdownTimer = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        this.gameState.countdownValue = currentCount;
        this.broadcast('countdown_tick', { count: currentCount });
        this.broadcast('game_state_update', {
          status: 'countdown',
          countdownValue: currentCount,
          voltage: 0,
          connectedCount: this.gameState.connectedCount,
        });
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.gameState.countdownValue = 0;
        this.resetGame('playing');
        this.broadcast('countdown_tick', { count: 'LAUNCH!' });
        this.broadcast('game_started');
        this.broadcast('game_state_update', {
          status: 'playing',
          voltage: 0,
          connectedCount: this.gameState.connectedCount,
        });
      }
    }, 1000);
  }

  handleResetGame() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.resetGame('lobby');
    this.broadcast('game_reset');
    this.broadcast('game_state_update', {
      status: 'lobby',
      voltage: 0,
      connectedCount: this.gameState.connectedCount,
    });
  }

  handleShakePulse(senderId, intensity = 1.0, playerName = '') {
    if (!this.gameState.players[senderId]) {
      this.handlePlayerJoin(senderId, playerName || '');
    }
    const player = this.gameState.players[senderId];
    if (player && playerName && (!player.name || player.name.startsWith('Operative #'))) {
      player.name = playerName.trim();
    }
    const now = Date.now();

    if (player) {
      player.lastSeen = now;
    }

    // Only process shake voltage when the host has officially initiated the game
    if (this.gameState.status === 'playing') {
      this.gameState.lastActiveShakeTime = now;

      if (player) {
        player.shakes += 1;
        player.lastShakeTime = now;
        player.intensity = intensity;
      }

      const totalPlayers = Math.max(1, Object.keys(this.gameState.players).length);
      const clampedIntensity = Math.min(2.2, Math.max(0.6, intensity));

      // Progressive electromagnetic resistance curve
      const currentVolt = Math.min(100, Math.max(0, this.gameState.voltage));
      let resistanceFactor = 1.0;
      if (currentVolt > 85) {
        resistanceFactor = 0.25; // 25% throughput (climax wall)
      } else if (currentVolt > 65) {
        resistanceFactor = 0.45; // 45% throughput
      } else if (currentVolt > 40) {
        resistanceFactor = 0.65; // 65% throughput
      }

      // Generation Efficiency Drag from Inactive Phones (applies with 2+ players)
      let participationFactor = 1.0;
      if (totalPlayers >= 2) {
        let activeNow = 0;
        for (const pid in this.gameState.players) {
          if (this.gameState.players[pid].lastShakeTime && (now - this.gameState.players[pid].lastShakeTime < 1800)) {
            activeNow += 1;
          }
        }
        const ratio = Math.max(0.3, activeNow / totalPlayers);
        participationFactor = Math.pow(ratio, 0.45);
      }

      const basePerShake = (EVENT_CONFIG.SHAKE_VOLTAGE_BASE * participationFactor) / Math.pow(totalPlayers, 0.82);
      const voltageGain = basePerShake * clampedIntensity * resistanceFactor;
      this.gameState.voltage = Math.min(100, this.gameState.voltage + voltageGain);

      this.broadcast('surge_pulse', {
        operativeNumber: player?.number || 1,
        name: player?.name || 'Operative',
        intensity: clampedIntensity,
        voltage: this.gameState.voltage,
      });
    }
  }

  handleTriggerBoost() {
    if (this.gameState.status === 'playing' && this.gameState.boostCharges > 0) {
      this.gameState.boostCharges -= 1;
      this.gameState.voltage = Math.min(100, this.gameState.voltage + EVENT_CONFIG.BOOST_AMOUNT);
      this.gameState.lastActiveShakeTime = Date.now();

      this.broadcast('boost_activated', {
        boostCharges: this.gameState.boostCharges,
        voltage: this.gameState.voltage,
      });
    }
  }

  broadcast(event, data = {}) {
    if (this.onBroadcast) {
      this.onBroadcast(event, data);
    }
    if (this.onLocalEvent) {
      this.onLocalEvent(event, data);
    }
  }

  sendToPeer(peerId, event, data = {}) {
    if (this.onBroadcast) {
      this.onBroadcast(event, data, peerId);
    }
  }

  destroy() {
    if (this.physicsInterval) {
      clearInterval(this.physicsInterval);
      this.physicsInterval = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}

/**
 * Unified Realtime Network Adapter
 * Seamlessly manages Socket.io for dedicated server / Cloudflare tunnel / LAN and WebRTC as fallback.
 */
export class RealtimeNetwork {
  constructor(options = {}) {
    this.options = options;
    this.isController = options.isController || false;
    this.roomCode = options.roomCode || 'telecel-launch';
    this.listeners = new Map();
    this.connections = new Map();
    this.peer = null;
    this.clientConn = null;
    this.socket = null;
    this.connected = false;
    this.id = null;
    this.transport = 'socket.io'; // Default to Socket.io for unlimited scale
    this.hostEngine = null;
    this.reconnectTimer = null;
    this.socketFailed = false;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emitLocal(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((cb) => {
        try { cb(data); } catch (err) { console.error(`Error in event ${event}:`, err); }
      });
    }
  }

  emit(event, data) {
    if (this.socket && this.transport === 'socket.io') {
      this.socket.emit(event, data);
      return;
    }

    // WebRTC Fallback Mode
    if (this.isController) {
      if (this.clientConn && this.clientConn.open) {
        this.clientConn.send({ event, data });
      }
    } else {
      this.handleHostAction(event, data);
    }
  }

  handleHostAction(event, data) {
    if (!this.hostEngine) return;
    if (event === 'shake_pulse') {
      this.hostEngine.handleShakePulse(this.id || 'host', data?.intensity || 1.0, data?.playerName || '');
    } else if (event === 'trigger_boost') {
      this.hostEngine.handleTriggerBoost();
    } else if (event === 'start_game') {
      this.hostEngine.handleStartGame();
    } else if (event === 'reset_game') {
      this.hostEngine.handleResetGame();
    }
  }

  init() {
    const queryParams = new URLSearchParams(window.location.search);
    const forceMode = queryParams.get('mode'); // 'webrtc' | 'socket'

    if (forceMode === 'webrtc') {
      this.initWebRTC();
      return;
    }

    const customSocketUrl = this.options.socketUrl || import.meta.env.VITE_SOCKET_URL;
    const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

    // On pure Vercel deployments without backend socket server, initialize WebRTC PeerJS directly
    if (isVercel && !customSocketUrl && forceMode !== 'socket') {
      console.log('⚡ Vercel environment detected: Initializing direct WebRTC PeerJS...');
      this.initWebRTC();
      return;
    }

    // Determine target Socket.io URL
    let socketUrl = customSocketUrl;
    if (!socketUrl) {
      if (typeof window !== 'undefined') {
        if (window.location.port === '5173') {
          socketUrl = `http://${window.location.hostname}:3001`;
        } else {
          socketUrl = window.location.origin;
        }
      } else {
        socketUrl = 'http://localhost:3001';
      }
    }

    this.initSocketIO(socketUrl);

    // Setup global visibility & device wake reconnection triggers
    if (typeof window !== 'undefined') {
      const handleDeviceWake = () => {
        this.reconnect();
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') handleDeviceWake();
      });
      window.addEventListener('pageshow', handleDeviceWake);
      window.addEventListener('focus', handleDeviceWake);
      window.addEventListener('online', handleDeviceWake);
    }
  }

  reconnect() {
    if (this.transport === 'socket.io' && this.socket) {
      if (!this.socket.connected) {
        console.log('⚡ Device awake: Reconnecting Socket.io connection...');
        try {
          this.socket.connect();
        } catch (e) {}
      }
    } else if (this.transport === 'webrtc') {
      if (!this.connected && this.isController) {
        this.connectToHost();
      }
    }
  }

  initSocketIO(url) {
    this.transport = 'socket.io';
    console.log(`Connecting via Socket.io to ${url}...`);

    try {
      this.socket = io(url, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 400,
        reconnectionDelayMax: 2000,
        timeout: 20000,
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log(`✅ Socket.io connected (ID: ${this.socket.id})`);
        this.connected = true;
        this.socketFailed = false;
        this.id = this.socket.id;
        this.emitLocal('connect', { id: this.socket.id });

        if (this.isController) {
          let savedName = '';
          try { savedName = sessionStorage.getItem('operative_name') || ''; } catch (e) {}
          this.socket.emit('join_controller', { playerName: savedName });
        } else {
          this.socket.emit('join_display');
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.warn(`Socket.io disconnected: ${reason}`);
        this.connected = false;
        this.emitLocal('disconnect');
        if (reason === 'io server disconnect') {
          this.socket.connect();
        }
      });

      this.socket.on('connect_error', (err) => {
        console.warn('Socket.io connection notice:', err?.message || err);
      });

      // Forward all socket events to local listeners
      const events = [
        'init_sync', 'game_state_update', 'controller_assigned',
        'participant_joined', 'participant_left', 'surge_pulse',
        'boost_activated', 'multiplier_up', 'game_victory',
        'game_over', 'game_started', 'game_reset', 'tunnel_ready',
        'countdown_started', 'countdown_tick'
      ];

      events.forEach(evt => {
        this.socket.on(evt, (data) => {
          this.connected = true;
          this.emitLocal(evt, data);
        });
      });
    } catch (e) {
      console.error('Socket.io init exception:', e);
      this.initWebRTC();
    }
  }

  initWebRTC() {
    this.transport = 'webrtc';
    
    // Clean up any existing peer before re-creating
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }

    const peerId = this.isController ? undefined : this.roomCode;
    console.log(`Initializing WebRTC Peer (${this.isController ? 'Client' : `Host: ${this.roomCode}`})...`);

    try {
      this.peer = new Peer(peerId, {
        config: {
          iceServers: ICE_SERVERS,
          iceCandidatePoolSize: 10,
        },
        debug: 0, // suppress internal broker noise
      });

      this.peer.on('open', (id) => {
        this.id = id;
        console.log(`✅ WebRTC Peer opened with ID: ${id}`);

        if (this.isController) {
          this.connectToHost();
        } else {
          // We are Desktop Host
          this.connected = true;
          this.emitLocal('connect', { id });
          this.setupHostEngine();
        }
      });

      this.peer.on('error', (err) => {
        if (err?.type === 'unavailable-id' && !this.isController) {
          const altId = `telecel-${Math.floor(Math.random() * 8999 + 1000)}`;
          console.log(`Host ID busy on broker, switching to ${altId}...`);
          this.roomCode = altId;
          try { sessionStorage.setItem('telecel_host_room', altId); } catch (e) {}
          this.emitLocal('room_code_changed', { roomCode: altId });
          this.emitLocal('init_sync', {
            gameState: this.hostEngine ? this.hostEngine.gameState : undefined,
            roomCode: altId,
          });

          // Destroy old peer cleanly before retrying
          if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
          }
          setTimeout(() => this.initWebRTC(), 150);
          return;
        }

        if (this.isController) {
          this.scheduleClientReconnect();
        }
      });

      this.peer.on('disconnected', () => {
        if (this.peer && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      });
    } catch (e) {
      console.error('WebRTC initialization failed:', e);
    }
  }

  setupHostEngine() {
    this.hostEngine = new BrowserHostEngine(
      this.roomCode,
      (event, data, targetPeerId) => {
        const msg = { event, data };
        if (targetPeerId && this.connections.has(targetPeerId)) {
          const conn = this.connections.get(targetPeerId);
          if (conn && conn.open) conn.send(msg);
        } else {
          this.connections.forEach((conn) => {
            if (conn && conn.open) conn.send(msg);
          });
        }
      },
      (event, data) => {
        this.emitLocal(event, data);
      }
    );

    this.emitLocal('init_sync', {
      gameState: this.hostEngine.gameState,
      roomCode: this.roomCode,
    });

    this.peer.on('connection', (conn) => {
      const connId = conn.peer;
      this.connections.set(connId, conn);

      conn.on('open', () => {
        console.log(`✅ Participant WebRTC data channel opened: ${connId}`);
        // Immediately register joined participant in game state
        this.hostEngine.handlePlayerJoin(connId, '');

        // Send immediate game state sync
        conn.send({
          event: 'init_sync',
          data: {
            gameState: this.hostEngine.gameState,
            roomCode: this.roomCode,
          },
        });
      });

      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        const { event, data } = msg;

        if (event === 'join_controller') {
          this.hostEngine.handlePlayerJoin(connId, data?.playerName);
        } else if (event === 'ping_heartbeat') {
          this.hostEngine.handlePlayerHeartbeat(connId);
        } else if (event === 'leave_controller') {
          this.hostEngine.handlePlayerLeave(connId);
          if (this.connections.has(connId)) {
            try { this.connections.get(connId).close(); } catch (e) {}
            this.connections.delete(connId);
          }
        } else if (event === 'shake_pulse') {
          this.hostEngine.handleShakePulse(connId, data?.intensity, data?.playerName || '');
        } else if (event === 'trigger_boost') {
          this.hostEngine.handleTriggerBoost();
        } else if (event === 'sensor_status') {
          if (this.hostEngine.gameState.players[connId]) {
            this.hostEngine.gameState.players[connId].sensorActive = data?.active;
            this.hostEngine.gameState.players[connId].lastSeen = Date.now();
          }
        }
      });

      conn.on('close', () => {
        this.connections.delete(connId);
        this.hostEngine.handlePlayerLeave(connId);
      });

      conn.on('error', (err) => {
        this.connections.delete(connId);
        this.hostEngine.handlePlayerLeave(connId);
      });
    });
  }

  connectToHost() {
    if (!this.peer || this.peer.destroyed) return;
    if (this.clientConn && this.clientConn.open) return;

    console.log(`Connecting to Host Room: ${this.roomCode}...`);

    try {
      // NOTE: Do NOT use reliable: true with PeerJS on iOS Safari/WebKit as it stalls the DataChannel handshake.
      // serialization: 'json' provides ultra-fast, 100% reliable messaging across iOS and desktop.
      this.clientConn = this.peer.connect(this.roomCode, {
        serialization: 'json',
      });

      // Watchdog: If data connection does not open within 4.5s, trigger reconnect
      const connTimeout = setTimeout(() => {
        if (this.clientConn && !this.clientConn.open && !this.connected) {
          console.warn('WebRTC DataChannel handshake timed out, scheduling retry...');
          try { this.clientConn.close(); } catch (e) {}
          this.scheduleClientReconnect();
        }
      }, 4500);

      this.clientConn.on('open', () => {
        clearTimeout(connTimeout);
        console.log(`✅ WebRTC connected to Host: ${this.roomCode}`);
        this.connected = true;
        this.emitLocal('connect', { id: this.peer.id });
        this.clientConn.send({
          event: 'join_controller',
          data: { playerName: '' },
        });
      });

      this.clientConn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        this.connected = true;
        const { event, data } = msg;
        this.emitLocal(event, data);
      });

      this.clientConn.on('close', () => {
        clearTimeout(connTimeout);
        this.connected = false;
        this.emitLocal('disconnect');
        this.scheduleClientReconnect();
      });

      this.clientConn.on('error', (err) => {
        clearTimeout(connTimeout);
        console.warn('DataConnection notice:', err);
        this.connected = false;
        this.emitLocal('disconnect');
        this.scheduleClientReconnect();
      });
    } catch (err) {
      console.warn('Connect to host exception:', err);
      this.scheduleClientReconnect();
    }
  }

  scheduleClientReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.connected && this.isController) {
        this.connectToHost();
      }
    }, 2500);
  }

  destroy() {
    if (this.hostEngine) this.hostEngine.destroy();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.clientConn) this.clientConn.close();
    this.connections.forEach(conn => conn.close());
    if (this.peer) this.peer.destroy();
    if (this.socket) this.socket.disconnect();
  }
}
