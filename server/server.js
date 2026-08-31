import express from 'express';
import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import selfsigned from 'selfsigned';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Enable accelerometer & gyroscope sensor permissions policy headers
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'accelerometer=*, gyroscope=*, magnetometer=*');
  res.setHeader('Feature-Policy', 'accelerometer *; gyroscope *; magnetometer *');
  next();
});

// Serve static frontend files when built
app.use(express.static(path.join(__dirname, '../dist')));

// Helper to get local LAN IPv4 address
function getLocalLanIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const LAN_IP = getLocalLanIP();
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Create HTTP server
const httpServer = http.createServer(app);

// Generate self-signed SSL cert for HTTPS (essential for iOS Safari motion sensors)
let pems = null;
try {
  const attrs = [{ name: 'commonName', value: LAN_IP }];
  pems = selfsigned.generate(attrs, { days: 30, keySize: 2048 });
} catch (e) {
  console.warn('Could not generate self-signed cert, falling back to HTTP only:', e.message);
}

let httpsServer = null;
if (pems && pems.private && pems.cert) {
  try {
    httpsServer = https.createServer({ key: pems.private, cert: pems.cert }, app);
  } catch (err) {
    console.warn('Failed to start HTTPS server, falling back to HTTP only:', err.message);
  }
}

// Socket.io attached to HTTP server (and HTTPS if active)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

if (httpsServer) {
  io.attach(httpsServer);
}

import { Tunnel } from 'cloudflared';

let publicTunnelUrl = null;

async function setupPublicTunnel() {
  try {
    const t = Tunnel.quick(`http://localhost:${HTTP_PORT}`);
    
    t.on('url', (url) => {
      publicTunnelUrl = url;
      console.log(`🌐 Secure HTTPS Tunnel (Cloudflare):`);
      console.log(`👉 ${publicTunnelUrl}/controller`);
      console.log(`========================================\n`);

      // Notify all already-connected desktop clients that the tunnel is ready
      io.emit('tunnel_ready', { tunnelUrl: publicTunnelUrl });
    });

    t.on('connected', (con) => {
      console.log(`✅ Cloudflare edge connected (Edge IP: ${con.ip})`);
    });

    t.on('error', (err) => {
      console.warn('Cloudflare tunnel notice:', err?.message || err);
    });

    t.on('exit', () => {
      publicTunnelUrl = null;
    });
  } catch (e) {
    console.log('Cloudflare tunnel could not be established, falling back to local LAN:', e.message);
  }
}

// API route to return server network info & pairing URL
app.get('/api/info', (req, res) => {
  res.json({
    lanIp: LAN_IP,
    httpPort: HTTP_PORT,
    httpsPort: HTTPS_PORT,
    tunnelUrl: publicTunnelUrl ? `${publicTunnelUrl}/controller` : null,
    httpsAvailable: !!httpsServer,
    controllerHttpUrl: `http://${LAN_IP}:${HTTP_PORT}/controller`,
    controllerHttpsUrl: publicTunnelUrl ? `${publicTunnelUrl}/controller` : (httpsServer ? `https://${LAN_IP}:${HTTPS_PORT}/controller` : `http://${LAN_IP}:${HTTP_PORT}/controller`),
  });
});

// Fallback route for SPA
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send(`<h1>VOLTAGE SURGE Game Server</h1><p>Run <code>npm run dev</code> for development or <code>npm run build</code> for production.</p>`);
    }
  });
});

// ----------------------------------------------------
// LAUNCH EVENT ACTIVATION ENGINE (UP TO 200 PARTICIPANTS)
// ----------------------------------------------------
const EVENT_CONFIG = {
  MAX_CAPACITY: 200,
  ROUND_TIME_SECONDS: 90,
  DECAY_RATE_PER_SEC: 1.8,       // Measured decay if crowd slows down
  SHAKE_VOLTAGE_BASE: 0.18,      // Calibrated sensitivity for crowd audience
  COMBO_DECAY_TIME_MS: 2000,
  BOOST_AMOUNT: 8.0,
  INITIAL_BOOST_CHARGES: 5,
};

let participantCounter = 0;

let gameState = {
  status: 'lobby', // 'lobby' | 'countdown' | 'playing' | 'victory' | 'gameover'
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
  recentJoins: [], // list of recently connected operative names
  players: {}, // socketId -> { id, number, name, shakes, lastShakeTime, intensity, sensorActive }
  lastActiveShakeTime: Date.now(),
  lastTickTime: Date.now(),
};

function resetGame(newStatus = 'lobby') {
  gameState.status = newStatus;
  gameState.voltage = 0.0;
  gameState.score = 0;
  gameState.multiplier = 1;
  gameState.multiplierProgress = 0;
  gameState.boostCharges = EVENT_CONFIG.INITIAL_BOOST_CHARGES;
  gameState.timeRemaining = EVENT_CONFIG.ROUND_TIME_SECONDS;
  gameState.lastActiveShakeTime = Date.now();
  gameState.lastTickTime = Date.now();
  
  // Reset player counters
  for (const socketId in gameState.players) {
    gameState.players[socketId].shakes = 0;
    gameState.players[socketId].intensity = 0;
  }
}

// 60Hz Physics & Activation Loop
setInterval(() => {
  const now = Date.now();
  const dt = (now - gameState.lastTickTime) / 1000;
  gameState.lastTickTime = now;

  gameState.connectedCount = Object.keys(gameState.players).length;

  if (gameState.status === 'playing') {
    // 1. Voltage Decay: drains smoothly if the audience stops shaking
    const timeSinceShake = now - gameState.lastActiveShakeTime;
    let currentDecay = EVENT_CONFIG.DECAY_RATE_PER_SEC;
    
    if (gameState.voltage > 80) {
      currentDecay *= 1.3;
    } else if (gameState.voltage > 50) {
      currentDecay *= 1.1;
    }

    if (timeSinceShake > 350) {
      gameState.voltage = Math.max(0, gameState.voltage - (currentDecay * dt));
    }

    // 2. Multiplier combo progress
    if (timeSinceShake > EVENT_CONFIG.COMBO_DECAY_TIME_MS) {
      if (gameState.multiplier > 1) {
        gameState.multiplierProgress -= 30 * dt;
        if (gameState.multiplierProgress <= 0) {
          gameState.multiplier = Math.max(1, gameState.multiplier - 1);
          gameState.multiplierProgress = 70;
        }
      } else {
        gameState.multiplierProgress = Math.max(0, gameState.multiplierProgress - (15 * dt));
      }
    }

    // 3. Score accumulation
    if (gameState.voltage > 1) {
      const scoreGain = Math.round((gameState.voltage * 2 * gameState.multiplier) * dt * 10);
      gameState.score += scoreGain;
      if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
      }
    }

    // 4. Reveal / Maximum Overcharge Activation condition
    if (gameState.voltage >= 100) {
      gameState.voltage = 100;
      gameState.status = 'victory';
      gameState.score += Math.round(10000 * gameState.multiplier);
      io.emit('game_victory', { 
        score: gameState.score, 
        participantCount: gameState.connectedCount,
      });
    }
  }

  // Periodic liveness check: prune any player who hasn't sent a heartbeat/message in > 60s
  for (const socketId in gameState.players) {
    const p = gameState.players[socketId];
    if (p.lastSeen && (now - p.lastSeen > 60000)) {
      delete gameState.players[socketId];
      gameState.connectedCount = Object.keys(gameState.players).length;
      io.emit('participant_left', {
        operativeNumber: p.number,
        connectedCount: gameState.connectedCount,
        maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
      });
    }
  }

  // Broadcast state update (30Hz throttled for network efficiency)
  io.emit('game_state_update', {
    status: gameState.status,
    voltage: Number(gameState.voltage.toFixed(2)),
    score: gameState.score,
    highScore: gameState.highScore,
    multiplier: gameState.multiplier,
    multiplierProgress: Math.round(gameState.multiplierProgress),
    boostCharges: gameState.boostCharges,
    timeRemaining: Math.ceil(gameState.timeRemaining),
    connectedCount: gameState.connectedCount,
    maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
    recentJoins: gameState.recentJoins.slice(-5),
  });
}, 33);

// ----------------------------------------------------
// SOCKET.IO EVENT HANDLERS
// ----------------------------------------------------
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Send immediate initial sync
  socket.emit('init_sync', {
    gameState: {
      ...gameState,
      connectedCount: Object.keys(gameState.players).length,
      maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
    },
    lanIp: LAN_IP,
    httpPort: HTTP_PORT,
    httpsPort: HTTPS_PORT,
    tunnelUrl: publicTunnelUrl,
  });

  // Participant joins as mobile controller
  socket.on('join_controller', ({ playerName } = {}) => {
    participantCounter += 1;
    const operativeNumber = participantCounter;
    const displayName = playerName?.trim() || `Operative #${operativeNumber}`;
    const now = Date.now();

    gameState.players[socket.id] = {
      id: socket.id,
      number: operativeNumber,
      name: displayName,
      shakes: 0,
      lastShakeTime: 0,
      intensity: 0,
      sensorActive: false,
      lastSeen: now,
    };

    gameState.connectedCount = Object.keys(gameState.players).length;

    // Track recent joins for live desktop ticker
    gameState.recentJoins.push({
      number: operativeNumber,
      name: displayName,
      time: now,
    });
    if (gameState.recentJoins.length > 20) {
      gameState.recentJoins.shift();
    }

    socket.emit('controller_assigned', {
      operativeNumber,
      player: gameState.players[socket.id],
      connectedCount: gameState.connectedCount,
      maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
    });

    io.emit('participant_joined', {
      operativeNumber,
      name: displayName,
      connectedCount: gameState.connectedCount,
      maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
    });

    console.log(`Operative #${operativeNumber} joined (${gameState.connectedCount}/${EVENT_CONFIG.MAX_CAPACITY})`);
  });

  // Controller reports sensor status
  socket.on('sensor_status', ({ active } = {}) => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].sensorActive = active;
      gameState.players[socket.id].lastSeen = Date.now();
    }
  });

  // Physical shake impulse received (calibrated for mass crowd scaling)
  socket.on('shake_pulse', ({ intensity = 1.0 } = {}) => {
    const now = Date.now();
    let player = gameState.players[socket.id];

    if (!player) {
      participantCounter += 1;
      gameState.players[socket.id] = {
        id: socket.id,
        number: participantCounter,
        name: `Operative #${participantCounter}`,
        shakes: 0,
        lastShakeTime: 0,
        intensity: 0,
        sensorActive: true,
        lastSeen: now,
      };
      player = gameState.players[socket.id];
      gameState.connectedCount = Object.keys(gameState.players).length;
    }

    player.lastSeen = now;

    // Only process shake voltage when the host has officially initiated the game
    if (gameState.status === 'playing') {
      gameState.lastActiveShakeTime = now;

      player.shakes += 1;
      player.lastShakeTime = now;
      player.intensity = intensity;

      // LOWER SHAKE SENSITIVITY CALIBRATION:
      // With up to 200 people shaking concurrently, we scale each shake's contribution
      // so a full room of participants shaking creates a smooth, dramatic 10-25 second crescendo.
      const activeCount = Math.max(1, Object.keys(gameState.players).length);
      const clampedIntensity = Math.min(2.0, Math.max(0.5, intensity));
      
      // Dynamic crowd dampener: balances 1 tester up to 200 live attendees
      const crowdDampener = activeCount > 1 
        ? Math.max(0.08, 1.2 / Math.pow(activeCount, 0.42))
        : 1.0;

      const voltageGain = EVENT_CONFIG.SHAKE_VOLTAGE_BASE * clampedIntensity * crowdDampener * (1 + (gameState.multiplier - 1) * 0.15);
      
      gameState.voltage = Math.min(100, gameState.voltage + voltageGain);

      // Multiplier progress
      gameState.multiplierProgress += (6 * clampedIntensity * crowdDampener);
      if (gameState.multiplierProgress >= 100) {
        if (gameState.multiplier < 5) {
          gameState.multiplier += 1;
          gameState.multiplierProgress = 0;
          io.emit('multiplier_up', { multiplier: gameState.multiplier });
        } else {
          gameState.multiplierProgress = 100;
        }
      }

      // Broadcast surge event
      io.emit('surge_pulse', {
        operativeNumber: player.number || 1,
        name: player.name || 'Operative',
        intensity: clampedIntensity,
        voltage: gameState.voltage,
      });
    }
  });

  // Boost trigger
  socket.on('trigger_boost', () => {
    if (gameState.status === 'playing' && gameState.boostCharges > 0) {
      gameState.boostCharges -= 1;
      gameState.voltage = Math.min(100, gameState.voltage + EVENT_CONFIG.BOOST_AMOUNT);
      gameState.lastActiveShakeTime = Date.now();
      gameState.multiplierProgress = Math.min(100, gameState.multiplierProgress + 35);

      io.emit('boost_activated', {
        boostCharges: gameState.boostCharges,
        voltage: gameState.voltage,
      });
    }
  });

  // Start / Restart game trigger
  socket.on('start_game', () => {
    resetGame('playing');
    io.emit('game_started');
  });

  socket.on('reset_game', () => {
    resetGame('lobby');
    io.emit('game_reset');
  });

  // Heartbeat ping from mobile controller
  socket.on('ping_heartbeat', () => {
    const now = Date.now();
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].lastSeen = now;
    } else {
      participantCounter += 1;
      gameState.players[socket.id] = {
        id: socket.id,
        number: participantCounter,
        name: `Operative #${participantCounter}`,
        shakes: 0,
        lastShakeTime: 0,
        intensity: 0,
        sensorActive: false,
        lastSeen: now,
      };
      gameState.connectedCount = Object.keys(gameState.players).length;
    }
  });

  // Explicit leave from mobile controller (screen turned off or left page)
  socket.on('leave_controller', () => {
    if (gameState.players[socket.id]) {
      const p = gameState.players[socket.id];
      delete gameState.players[socket.id];
      gameState.connectedCount = Object.keys(gameState.players).length;
      io.emit('participant_left', {
        operativeNumber: p.number,
        connectedCount: gameState.connectedCount,
        maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
      });
      io.emit('game_state_update', {
        connectedCount: gameState.connectedCount,
        status: gameState.status,
        voltage: Number(gameState.voltage.toFixed(2)),
      });
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (gameState.players[socket.id]) {
      const p = gameState.players[socket.id];
      delete gameState.players[socket.id];
      gameState.connectedCount = Object.keys(gameState.players).length;
      io.emit('participant_left', {
        operativeNumber: p.number,
        connectedCount: gameState.connectedCount,
        maxCapacity: EVENT_CONFIG.MAX_CAPACITY,
      });
      io.emit('game_state_update', {
        connectedCount: gameState.connectedCount,
        status: gameState.status,
        voltage: Number(gameState.voltage.toFixed(2)),
      });
    }
    console.log(`Socket disconnected: ${socket.id} (Active: ${Object.keys(gameState.players).length})`);
  });
});

// Start Servers
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`⚡ VOLTAGE SURGE Real-time Game Server`);
  console.log(`========================================`);
  console.log(`💻 Desktop Screen : http://localhost:${HTTP_PORT}`);
  console.log(`📱 Mobile LAN HTTP: http://${LAN_IP}:${HTTP_PORT}/controller`);
  if (httpsServer) {
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`🔒 Mobile LAN HTTPS (for iOS Safari): https://${LAN_IP}:${HTTPS_PORT}/controller`);
      console.log(`========================================\n`);
    });
  } else {
    console.log(`========================================\n`);
  }

  // Automatically start public HTTPS tunnel for certified mobile sensor access
  setupPublicTunnel();
});
