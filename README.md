# ⚡ VOLTAGE SURGE

A high-intensity, 2-player cooperative physical motion game where players scan a QR code with their smartphones and shake their phones using accelerometer/gyroscope sensors to surge the voltage reactor to 100% before time runs out.

Built with **React**, **Tailwind CSS**, **HTML5 Canvas** (procedural lightning and plasma physics), **Web Audio API** (procedural electric synthesizer), and **Node.js + Socket.io** (real-time LAN sync).

---

## 🚀 Quick Start

### 1. Start the Game (Desktop Screen + LAN Server)
```bash
npm run dev
```
- **Desktop Game Screen**: [http://localhost:5173](http://localhost:5173) (or `http://localhost:3001` in production)
- **Mobile Controller**: Scanned via the on-screen QR code or opened at `http://<LAN_IP>:3001/controller` (or `https://<LAN_IP>:3443/controller`)

---

## 📱 Mobile Controller & Motion Sensors

1. Open the game on your desktop / laptop screen.
2. Scan the **QR Code** displayed on the lobby screen using your smartphone's camera (make sure your phone is connected to the same Wi-Fi network).
3. **iOS (iPhone/iPad Safari)**: Tap the **"ACTIVATE SENSORS"** prompt to grant accelerometer permission.
4. Shake your phone vigorously to charge the voltage!
5. Tap **"BOOST"** when you need an emergency +16% voltage spike.
6. *Fallback*: Tap the **"TAP TO SURGE"** button for instant touch control if sensors are restricted or for desktop testing.

---

## ⌨️ Desktop Keyboard Shortcuts (Testing & Host Controls)
- **`[Spacebar]`**: Simulate physical shake pulse (adds voltage & combo)
- **`[B]`**: Trigger BOOST (+16% instant surge)
- **`[S]`**: Start Game from Lobby
- **`[R]`**: Reset Game to Lobby

---

## 🛠️ Architecture

- **`server/server.js`**: Dual HTTP/HTTPS Express + Socket.io server with LAN auto-detection and 60Hz physics loop (voltage decay, multipliers, combo tracking).
- **`src/components/DesktopGame.jsx`**: Main desktop HUD faithfully matching the reference image layout.
- **`src/components/ReactorCanvas.jsx`**: HTML5 Canvas rendering stochastic branching electric arcs, rising plasma fluid, spark particles, and cathode bursts.
- **`src/components/MultiplierGauge.jsx`**: Radial 12-segment multiplier dial (x1 to x5).
- **`src/components/MobileController.jsx`**: Mobile web app with iOS/Android 3D accelerometer shake detection filter and haptic feedback (`navigator.vibrate`).
- **`src/utils/audioEngine.js`**: Procedural Web Audio API sound synthesizer (dynamic voltage hum, spark zaps, sub-bass boost explosions, victory fanfares).
