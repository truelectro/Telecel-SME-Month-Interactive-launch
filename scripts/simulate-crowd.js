import { io } from "socket.io-client";

const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const idx = args.findIndex(a => a === "--" + name || a.startsWith("--" + name + "="));
  if (idx !== -1) {
    if (args[idx].includes("=")) return args[idx].split("=")[1];
    if (args[idx + 1] && !args[idx + 1].startsWith("--")) return args[idx + 1];
  }
  return defaultValue;
}

const SERVER_URL = getArg("url", process.env.SERVER_URL || "http://localhost:3001");
const CROWD_SIZE = parseInt(getArg("count", "150"), 10);
const AUTO_SHAKE = getArg("autoshake", "true") !== "false";
const RAMP_UP_MS = parseInt(getArg("ramp", "3500"), 10);

const GHANAIAN_NAMES = [
  "Kwame Mensah", "Ama Serwaa", "Kofi Boateng", "Akua Osei", "Yaw Appiah",
  "Abena Darko", "Kwadwo Frimpong", "Yaa Asantewaa", "Kwabena Agyeman", "Afia Poku",
  "Kweku Baah", "Esi Sutherland", "Kobina Ansah", "Efua Sutherland", "Poku Ware",
  "Adjoa Kwarteng", "Nana Yaw", "Akosua Addo", "Nii Armah", "Naa Borkor",
  "Papa Kwesi", "Maame Yaa", "Emmanuel Arthur", "Grace Quaye", "Samuel Owusu",
  "Bernice Tetteh", "David Asante", "Rita Annan", "Michael Ofori", "Sandra Danquah",
  "Joseph Adjei", "Mercy Coffie", "Daniel Tagoe", "Patricia Boakye", "Isaac Gyasi",
  "Dorothy Lamptey", "Francis Amponsah", "Evelyn Abbey", "George Sarpong", "Janet Mensah"
];

console.log("\n======================================================");
console.log("⚡ VOLTAGE SURGE CROWD SIMULATOR");
console.log("======================================================");
console.log("🎯 Target Server : " + SERVER_URL);
console.log("👥 Crowd Size    : " + CROWD_SIZE + " Concurrent Operatives");
console.log("⏱️  Ramp-up Time : " + (RAMP_UP_MS / 1000) + "s");
console.log("🤖 Auto-Shaking  : " + (AUTO_SHAKE ? "ENABLED (on game start)" : "DISABLED"));
console.log("======================================================\n");

const operatives = [];
let connectedCount = 0;
let totalShakesSent = 0;
let recentShakesSec = 0;
let currentGameState = { status: "lobby", voltage: 0, multiplier: 1, score: 0 };
let startTime = Date.now();
let isPlaying = false;

function createOperative(index) {
  const name = GHANAIAN_NAMES[index % GHANAIAN_NAMES.length] + " (#" + (index + 1) + ")";
  const socket = io(SERVER_URL, {
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    timeout: 8000,
  });

  const operative = {
    id: index + 1,
    name,
    socket,
    connected: false,
    shakes: 0,
    interval: null,
    heartbeatInterval: null,
  };

  socket.on("connect", () => {
    operative.connected = true;
    connectedCount++;
    socket.emit("join_controller", { playerName: name });
    socket.emit("sensor_status", { active: true });

    operative.heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping_heartbeat");
      }
    }, 2500 + Math.random() * 500);
  });

  socket.on("disconnect", () => {
    if (operative.connected) {
      operative.connected = false;
      connectedCount = Math.max(0, connectedCount - 1);
    }
    if (operative.interval) {
      clearInterval(operative.interval);
      operative.interval = null;
    }
  });

  socket.on("game_state_update", (state) => {
    currentGameState = { ...currentGameState, ...state };
    if (state.status === "playing" && !isPlaying) {
      isPlaying = true;
      startShaking();
    } else if (state.status !== "playing" && isPlaying) {
      isPlaying = false;
      stopShaking();
    }
  });

  socket.on("game_started", () => {
    isPlaying = true;
    startShaking();
  });

  socket.on("game_victory", () => {
    isPlaying = false;
    stopShaking();
  });

  socket.on("game_reset", () => {
    isPlaying = false;
    stopShaking();
  });

  function startShaking() {
    if (operative.interval || !AUTO_SHAKE) return;
    const shakeFrequencyMs = Math.floor(130 + Math.random() * 120);
    operative.interval = setInterval(() => {
      if (!operative.connected || currentGameState.status !== "playing") return;
      const intensity = Number((0.85 + Math.random() * 0.95).toFixed(2));
      socket.emit("shake_pulse", { intensity });
      operative.shakes++;
      totalShakesSent++;
      recentShakesSec++;
    }, shakeFrequencyMs);
  }

  function stopShaking() {
    if (operative.interval) {
      clearInterval(operative.interval);
      operative.interval = null;
    }
  }

  return operative;
}

const spawnInterval = RAMP_UP_MS / CROWD_SIZE;
let spawnedCount = 0;

const spawnTimer = setInterval(() => {
  if (spawnedCount >= CROWD_SIZE) {
    clearInterval(spawnTimer);
    console.log("\n✅ All " + CROWD_SIZE + " simulated operatives deployed to server!\n");
    return;
  }
  operatives.push(createOperative(spawnedCount));
  spawnedCount++;
}, spawnInterval);

setInterval(() => {
  const shakesPerSec = recentShakesSec;
  recentShakesSec = 0;
  const statusColor = currentGameState.status === "playing" ? "\x1b[32mPLAYING ⚡\x1b[0m" : (currentGameState.status === "victory" ? "\x1b[35mVICTORY 🏆\x1b[0m" : "\x1b[33mLOBBY ⏳\x1b[0m");
  const voltageBarLength = 25;
  const filled = Math.round((currentGameState.voltage / 100) * voltageBarLength);
  const bar = "█".repeat(Math.min(voltageBarLength, filled)) + "-".repeat(Math.max(0, voltageBarLength - filled));
  process.stdout.write("\r[" + statusColor + "] " +
    "👥 Connected: \x1b[36m" + connectedCount + "/" + CROWD_SIZE + "\x1b[0m | " +
    "⚡ Voltage: [\x1b[31m" + bar + "\x1b[0m] \x1b[1m" + Math.floor(currentGameState.voltage) + "%\x1b[0m | " +
    "🔥 Surges/sec: \x1b[33m" + shakesPerSec + "\x1b[0m | " +
    "Total: \x1b[37m" + totalShakesSent.toLocaleString() + "\x1b[0m"
  );
}, 1000);

process.on("SIGINT", () => {
  console.log("\n\n🛑 Disconnecting all simulated operatives...");
  operatives.forEach(op => {
    if (op.interval) clearInterval(op.interval);
    if (op.heartbeatInterval) clearInterval(op.heartbeatInterval);
    if (op.socket) op.socket.disconnect();
  });
  console.log("✅ Simulation terminated.\n");
  process.exit(0);
});