# ⚡ SME Surge - Telecel SME Month Launch Interactive Experience

A high-intensity, crowd-interactive launch event activation where hundreds of audience members scan a QR code with their smartphones and shake their phones using accelerometer & gyroscope sensors to collectively surge the voltage reactor to 100% for the official launch reveal!

Built with **React**, **Tailwind CSS**, **HTML5 Canvas** (procedural lightning, plasma fluid, and electric cathode physics), **Web Audio API** (procedural electrical synthesizer), and **WebRTC Peer-to-Peer + Socket.io** (real-time sync across any network worldwide).

---

## 🌐 Deploy to Vercel (Global Multi-Network Access)

This project is fully optimized for **Vercel**:
- **No Same Wi-Fi Required**: Connects seamlessly over any mobile cellular data (4G/5G), corporate Wi-Fi, hotel Wi-Fi, or home network via low-latency WebRTC DataChannels and STUN relays.
- **Built-in HTTPS**: Motion sensors (accelerometer & gyroscope) work natively on iOS Safari and Android Chrome without local SSL warnings.
- **SPA Rewrites**: Includes `vercel.json` for routing `/controller` deep links.

### Deploying Steps:
1. Import this repository into **[Vercel](https://vercel.com)**.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Deploy!

Once deployed, open your Vercel URL (e.g. `https://telecel-sme-launch.vercel.app`) on the main stage screen / projector. The QR code will automatically link phones to the live reactor hub!

---

## 🚀 Local Development

### Run Client & Server
```bash
npm run dev
```
- **Desktop Game Screen**: [http://localhost:5173](http://localhost:5173) (or `http://localhost:3001`)
- **Mobile Controller**: Scan the on-screen QR code or visit `http://localhost:5173/controller`

---

## 📱 Mobile Controller & Motion Sensors

1. Open the game on the main presentation/stage screen.
2. Audience members scan the **QR Code** on the screen using their phone's camera.
3. **iOS (Safari)**: Tap **"ACTIVATE SENSORS"** when prompted to enable accelerometer & gyroscope access.
4. When the countdown begins, everyone shakes their phones vigorously to drive the reactor to 100%!
5. Tap **"BOOST"** for emergency surges.
6. *Fallback*: Tap the **"TAP TO SURGE"** button for instant manual pulsing.

---

## ⌨️ Desktop Keyboard Shortcuts (Host Controls)
- **`[Spacebar]`**: Simulate shake pulse (or start/reset depending on state)
- **`[B]`**: Trigger BOOST surge
- **`[S]`**: Start Launch Sequence from Lobby
- **`[R]`**: Reset to Lobby

---

## 🛠️ Architecture

- **`src/utils/realtimeEngine.js`**: Unified Realtime Network engine providing WebRTC Peer-to-Peer data channels for serverless Vercel deployments and Socket.io client support for dedicated Node backends.
- **`src/components/DesktopGame.jsx`**: Main event stage HUD with real-time audience counter, voltage meter, multiplier gauge, and full-screen launch reveal animation.
- **`src/components/ReactorCanvas.jsx`**: HTML5 Canvas rendering branching electrical lightning arcs, rising plasma fluid, sparks, and glow shaders.
- **`src/components/MultiplierGauge.jsx`**: Radial 12-segment crowd multiplier dial (x1 to x5).
- **`src/components/MobileController.jsx`**: Mobile web app with motion sensor filtering, haptic feedback, and live reactor telemetry.
- **`src/utils/audioEngine.js`**: Procedural Web Audio API sound synthesizer (dynamic voltage hum, spark zaps, sub-bass boost explosions, victory fanfares).
- **`server/server.js`**: Optional dedicated Express + Socket.io server.
- **`vercel.json`**: Vercel SPA route rewrite configuration.
