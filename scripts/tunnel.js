import { spawn } from 'child_process';

console.log('⚡ Starting public HTTPS tunnel for VOLTAGE SURGE (port 3001)...');

// Try using localtunnel or cloudflared
const tunnel = spawn('npx', ['localtunnel', '--port', '3001'], {
  stdio: 'inherit',
  shell: true,
});

tunnel.on('error', (err) => {
  console.error('Failed to start tunnel:', err.message);
});

tunnel.on('exit', (code) => {
  console.log(`Tunnel process exited with code ${code}`);
});
