import { Peer } from 'peerjs';
import { io } from 'socket.io-client';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

const EVENT_CONFIG = {
  MAX_CAPACITY: 200,
  ROUND_TIME_SECONDS: 90,
  DECAY_RATE_PER_SEC: 1.8,
  SHAKE_VOLTAGE_BASE: 0.18,
  COMBO_DECAY_TIME_MS: 2000,
  BOOST_AMOUNT: 8.0,
  INITIAL_BOOST_CHARGES: 5,
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

    this.lastPruneTime = Date.now();
    this.startLoop();
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

  startLoop() {
    this.interval = setInterval(() => {
      const now = Date.now();
      const dt = (now - this.gameState.lastTickTime) / 1000;
      this.gameState.lastTickTime = now;

      this.gameState.connectedCount = Object.keys(this.gameState.players).length;

      if (this.gameState.status === 'playing') {
        // Voltage Decay
        const timeSinceShake = now - this.gameState.lastActiveShakeTime;
        let currentDecay = EVENT_CONFIG.DECAY_RATE_PER_SEC;

        if (this.gameState.voltage > 80) {
          currentDecay *= 1.3;
        } else if (this.gameState.voltage > 50) {
          currentDecay *= 1.1;
        }

        if (timeSinceShake > 350) {
          this.gameState.voltage = Math.max(0, this.gameState.voltage - (currentDecay * dt));
        }

        // Multiplier combo progress
        if (timeSinceShake > EVENT_CONFIG.COMBO_DECAY_TIME_MS) {
          if (this.gameState.multiplier > 1) {
            this.gameState.multiplierProgress -= 30 * dt;
            if (this.gameState.multiplierProgress <= 0) {
              this.gameState.multiplier = Math.max(1, this.gameState.multiplier - 1);
              this.gameState.multiplierProgress = 70;
            }
          } else {
            this.gameState.multiplierProgress = Math.max(0, this.gameState.multiplierProgress - (15 * dt));
          }
        }

        // Score accumulation
        if (this.gameState.voltage > 1) {
          const scoreGain = Math.round((this.gameState.voltage * 2 * this.gameState.multiplier) * dt * 10);
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

      // Prune inactive/disconnected players (e.g. screen turned off, tab closed) every 1s
      if (now - this.lastPruneTime > 1000) {
        this.lastPruneTime = now;
        let countChanged = false;
        for (const id in this.gameState.players) {
          const p = this.gameState.players[id];
          if (now - (p.lastSeen || 0) > 5000) {
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

    this.gameState.players[senderId] = {
      id: senderId,
      number: operativeNumber,
      name: displayName,
      shakes: 0,
      lastShakeTime: 0,
      intensity: 0,
      sensorActive: false,
      lastSeen: Date.now(),
    };

    this.gameState.connectedCount = Object.keys(this.gameState.players).length;

    this.gameState.recentJoins.push({
      number: operativeNumber,
      name: displayName,
      time: Date.now(),
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
    if (this.gameState.players[senderId]) {
      this.gameState.players[senderId].lastSeen = Date.now();
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
    this.resetGame('playing');
    this.broadcast('game_started');
    this.broadcast('game_state_update', {
      status: 'playing',
      voltage: 0,
      connectedCount: this.gameState.connectedCount,
    });
  }

  handleResetGame() {
    this.resetGame('lobby');
    this.broadcast('game_reset');
    this.broadcast('game_state_update', {
      status: 'lobby',
      voltage: 0,
      connectedCount: this.gameState.connectedCount,
    });
  }

  handleShakePulse(senderId, intensity = 1.0) {
    if (!this.gameState.players[senderId]) {
      this.handlePlayerJoin(senderId, '');
    }
    const player = this.gameState.players[senderId];
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

      const activeCount = Math.max(1, Object.keys(this.gameState.players).length);
      const clampedIntensity = Math.min(2.0, Math.max(0.5, intensity));

      const crowdDampener = activeCount > 1
        ? Math.max(0.08, 1.2 / Math.pow(activeCount, 0.42))
        : 1.0;

      const voltageGain = EVENT_CONFIG.SHAKE_VOLTAGE_BASE * clampedIntensity * crowdDampener * (1 + (this.gameState.multiplier - 1) * 0.15);
      this.gameState.voltage = Math.min(100, this.gameState.voltage + voltageGain);

      this.gameState.multiplierProgress += (6 * clampedIntensity * crowdDampener);
      if (this.gameState.multiplierProgress >= 100) {
        if (this.gameState.multiplier < 5) {
          this.gameState.multiplier += 1;
          this.gameState.multiplierProgress = 0;
          this.broadcast('multiplier_up', { multiplier: this.gameState.multiplier });
        } else {
          this.gameState.multiplierProgress = 100;
        }
      }

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
      this.gameState.multiplierProgress = Math.min(100, this.gameState.multiplierProgress + 35);

      this.broadcast('boost_activated', {
        boostCharges: this.gameState.boostCharges,
        voltage: this.gameState.voltage,
      });
    }
  }

  handleStartGame() {
    this.resetGame('playing');
    this.broadcast('game_started');
  }

  handleResetGame() {
    this.resetGame('lobby');
    this.broadcast('game_reset');
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
    if (this.interval) clearInterval(this.interval);
  }
}

/**
 * Unified Realtime Network Adapter
 * Seamlessly manages WebRTC (PeerJS) for Vercel/Serverless and Socket.io for Dedicated servers.
 */
export class RealtimeNetwork {
  constructor(options = {}) {
    this.options = options;
    this.isController = options.isController || false;
    this.roomCode = options.roomCode || 'telecel-launch';
    this.listeners = new Map();
    this.connections = new Map(); // id -> DataConnection (host only)
    this.peer = null;
    this.clientConn = null; // DataConnection to host (client only)
    this.socket = null;
    this.connected = false;
    this.id = null;
    this.transport = 'webrtc'; // 'webrtc' | 'socket.io'
    this.hostEngine = null;
    this.reconnectTimer = null;
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
    if (this.transport === 'socket.io' && this.socket) {
      this.socket.emit(event, data);
      return;
    }

    // WebRTC Mode
    if (this.isController) {
      // Mobile controller sends to Desktop Host
      if (this.clientConn && this.clientConn.open) {
        this.clientConn.send({ event, data });
      }
    } else {
      // Desktop Host processes event directly or sends to all peers
      this.handleHostAction(event, data);
    }
  }

  handleHostAction(event, data) {
    if (!this.hostEngine) return;
    if (event === 'shake_pulse') {
      this.hostEngine.handleShakePulse(this.id || 'host', data?.intensity || 1.0);
    } else if (event === 'trigger_boost') {
      this.hostEngine.handleTriggerBoost();
    } else if (event === 'start_game') {
      this.hostEngine.handleStartGame();
    } else if (event === 'reset_game') {
      this.hostEngine.handleResetGame();
    }
  }

  init() {
    const customSocketUrl = this.options.socketUrl || import.meta.env.VITE_SOCKET_URL;
    const queryParams = new URLSearchParams(window.location.search);
    const forceSocket = queryParams.get('mode') === 'socket' || !!customSocketUrl;

    // If local dev on port 5173 without explicit WebRTC flag and custom socket is provided, or forced socket:
    if (forceSocket) {
      this.initSocketIO(customSocketUrl || `http://${window.location.hostname}:3001`);
      return;
    }

    // Default for Vercel / Cloud: WebRTC Peer-to-Peer!
    this.initWebRTC();
  }

  initSocketIO(url) {
    this.transport = 'socket.io';
    console.log(`Connecting via Socket.io to ${url}...`);

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 50,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.id = this.socket.id;
      this.emitLocal('connect', { id: this.socket.id });
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.emitLocal('disconnect');
    });

    // Forward any socket events to local listeners
    const events = [
      'init_sync', 'game_state_update', 'controller_assigned',
      'participant_joined', 'participant_left', 'surge_pulse',
      'boost_activated', 'multiplier_up', 'game_victory',
      'game_over', 'game_started', 'game_reset', 'tunnel_ready'
    ];

    events.forEach(evt => {
      this.socket.on(evt, (data) => this.emitLocal(evt, data));
    });
  }

  initWebRTC() {
    this.transport = 'webrtc';
    const peerId = this.isController ? undefined : this.roomCode;
    console.log(`Initializing WebRTC Peer (${this.isController ? 'Client' : `Host: ${this.roomCode}`})...`);

    try {
      this.peer = new Peer(peerId, {
        config: {
          iceServers: ICE_SERVERS,
        },
        debug: 1,
      });

      this.peer.on('open', (id) => {
        this.id = id;
        console.log(`Peer opened with ID: ${id}`);

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
        console.warn('Peer error:', err?.type || err);

        // If ID taken (e.g. host reloaded or room exists), fallback cleanly
        if (err.type === 'unavailable-id' && !this.isController) {
          console.log('Room ID taken, reconnecting with unique suffix...');
          const altId = `${this.roomCode}-${Math.floor(Math.random() * 8999 + 1000)}`;
          this.roomCode = altId;
          this.initWebRTC();
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
        // Broadcast over WebRTC data channels
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
        // Notify local Desktop Game UI
        this.emitLocal(event, data);
      }
    );

    // Initial sync
    this.emitLocal('init_sync', {
      gameState: this.hostEngine.gameState,
      roomCode: this.roomCode,
    });

    // Accept incoming mobile controller connections
    this.peer.on('connection', (conn) => {
      const connId = conn.peer;
      this.connections.set(connId, conn);

      conn.on('open', () => {
        console.log(`Participant WebRTC connected: ${connId}`);
        // Send immediate init sync to new peer
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
          this.hostEngine.handleShakePulse(connId, data?.intensity);
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
        console.log(`Participant disconnected: ${connId}`);
        this.connections.delete(connId);
        this.hostEngine.handlePlayerLeave(connId);
      });

      conn.on('error', (err) => {
        console.warn(`Connection error with ${connId}:`, err);
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
      this.clientConn = this.peer.connect(this.roomCode, {
        reliable: true,
      });

      this.clientConn.on('open', () => {
        console.log(`✅ WebRTC connected to Host: ${this.roomCode}`);
        this.connected = true;
        this.emitLocal('connect', { id: this.peer.id });

        // Automatically register controller
        this.emit('join_controller', { playerName: '' });
      });

      this.clientConn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        const { event, data } = msg;
        this.emitLocal(event, data);
      });

      this.clientConn.on('close', () => {
        console.log('Disconnected from Host');
        this.connected = false;
        this.emitLocal('disconnect');
        this.scheduleClientReconnect();
      });

      this.clientConn.on('error', (err) => {
        console.warn('Host connection error:', err);
        this.connected = false;
        this.emitLocal('disconnect');
        this.scheduleClientReconnect();
      });
    } catch (err) {
      console.warn('Error connecting to host:', err);
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
