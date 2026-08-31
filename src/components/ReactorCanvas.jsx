import React, { useRef, useEffect } from 'react';

function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
}

export default function ReactorCanvas({ voltage = 0, isOverloaded = false, isSurging = false }) {
  const canvasRef = useRef(null);
  const voltageRef = useRef(voltage);
  const smoothVoltageRef = useRef(voltage);

  useEffect(() => {
    voltageRef.current = voltage;
  }, [voltage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId;

    // Spark particles system
    const sparks = [];
    const maxSparks = 45;

    for (let i = 0; i < maxSparks; i++) {
      sparks.push({
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 4 - 1,
        size: Math.random() * 2.5 + 1,
        alpha: Math.random(),
        life: Math.random() * 50,
      });
    }

    // Lightning bolt generator
    function generateLightningPath(x1, y1, x2, y2, displace, iterations) {
      if (iterations <= 0) {
        return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
      }

      const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displace;
      const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * (displace * 0.3);

      const left = generateLightningPath(x1, y1, midX, midY, displace * 0.55, iterations - 1);
      const right = generateLightningPath(midX, midY, x2, y2, displace * 0.55, iterations - 1);

      return left.concat(right.slice(1));
    }

    let time = 0;

    const render = () => {
      try {
        time += 0.04;
        const width = canvas.width;
        const height = canvas.height;

        // Smooth physical liquid lerp dampening (60fps continuous glide)
        const target = Math.min(100, Math.max(0, voltageRef.current));
        smoothVoltageRef.current += (target - smoothVoltageRef.current) * 0.14;

        ctx.clearRect(0, 0, width, height);

        // Reactor Chamber Boundaries (Taller & Imposing)
        const chamberX = width * 0.08;
        const chamberWidth = width * 0.84;
        const chamberTop = height * 0.01;
        const chamberHeight = height * 0.97;
        const chamberBottom = chamberTop + chamberHeight;
        const cornerRadius = 26;

        // Current Liquid Fill Height (from smooth lerped value)
        const currentFill = Math.min(100, Math.max(0, smoothVoltageRef.current)) / 100;
        const liquidHeight = chamberHeight * currentFill;
        const liquidTop = chamberBottom - liquidHeight;

        // ----------------------------------------------------
        // 1. Chamber Background & Back Glow
        // ----------------------------------------------------
        ctx.save();
        ctx.beginPath();
        drawRoundedRect(ctx, chamberX, chamberTop, chamberWidth, chamberHeight, cornerRadius);
        ctx.clip();

      // Deep dark cavity
      const cavityGrad = ctx.createLinearGradient(chamberX, 0, chamberX + chamberWidth, 0);
      cavityGrad.addColorStop(0, '#100305');
      cavityGrad.addColorStop(0.5, '#22070c');
      cavityGrad.addColorStop(1, '#100305');
      ctx.fillStyle = cavityGrad;
      ctx.fillRect(chamberX, chamberTop, chamberWidth, chamberHeight);

      // ----------------------------------------------------
      // 2. Rising Crimson Plasma Fluid
      // ----------------------------------------------------
      if (currentFill > 0.005) {
        const plasmaGrad = ctx.createLinearGradient(0, liquidTop, 0, chamberBottom);
        plasmaGrad.addColorStop(0, '#ff3b59');
        plasmaGrad.addColorStop(0.2, '#ff1a40');
        plasmaGrad.addColorStop(0.7, '#ab0c24');
        plasmaGrad.addColorStop(1, '#520510');

        ctx.fillStyle = plasmaGrad;
        ctx.fillRect(chamberX, liquidTop, chamberWidth, liquidHeight);

        // Meniscus surface wave
        ctx.beginPath();
        ctx.moveTo(chamberX, liquidTop);
        for (let x = chamberX; x <= chamberX + chamberWidth; x += 4) {
          const wave = Math.sin((x * 0.08) + (time * 4)) * (1.5 + currentFill * 2);
          ctx.lineTo(x, liquidTop + wave);
        }
        ctx.lineTo(chamberX + chamberWidth, chamberBottom);
        ctx.lineTo(chamberX, chamberBottom);
        ctx.closePath();
        ctx.fillStyle = plasmaGrad;
        ctx.fill();

        // Intense Meniscus Glow Line
        ctx.beginPath();
        ctx.moveTo(chamberX, liquidTop);
        for (let x = chamberX; x <= chamberX + chamberWidth; x += 4) {
          const wave = Math.sin((x * 0.08) + (time * 4)) * (1.5 + currentFill * 2);
          ctx.lineTo(x, liquidTop + wave);
        }
        ctx.strokeStyle = '#fff5f7';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#ff2b4c';
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // ----------------------------------------------------
      // 3. Central Stochastic Lightning Arcs
      // ----------------------------------------------------
      const centerX = width / 2;
      const topCathodeY = chamberTop + 10;
      const targetY = currentFill > 0.05 ? liquidTop : chamberBottom - 10;

      if (targetY > topCathodeY + 15) {
        // Main Core Lightning Bolt
        const mainDisplace = 24 + Math.sin(time * 6) * 8;
        const mainBolt = generateLightningPath(centerX, topCathodeY, centerX + (Math.random() - 0.5) * 8, targetY, mainDisplace, 4);

        // Draw Outer Red Lightning Glow
        ctx.beginPath();
        mainBolt.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.strokeStyle = 'rgba(255, 31, 67, 0.85)';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#ff1f43';
        ctx.shadowBlur = 25;
        ctx.stroke();

        // Draw Inner White-Hot Lightning Core
        ctx.beginPath();
        mainBolt.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.8;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Secondary Branching Lightning
        if (Math.random() > 0.35) {
          const branchIdx = Math.floor(Math.random() * (mainBolt.length - 2)) + 1;
          const branchStart = mainBolt[branchIdx];
          const branchEnd = {
            x: branchStart.x + (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 25),
            y: branchStart.y + 15 + Math.random() * 25,
          };
          const branch = generateLightningPath(branchStart.x, branchStart.y, branchEnd.x, branchEnd.y, 10, 3);

          ctx.beginPath();
          branch.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.strokeStyle = 'rgba(255, 120, 150, 0.9)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        // Plasma Burst / Starburst at Top Cathode & Liquid Meniscus
        [topCathodeY, targetY].forEach((burstY, bIdx) => {
          const flareRadius = 14 + Math.sin(time * 8 + bIdx) * 4 + (currentFill * 8);
          const flareGrad = ctx.createRadialGradient(centerX, burstY, 1, centerX, burstY, flareRadius * 2);
          flareGrad.addColorStop(0, '#ffffff');
          flareGrad.addColorStop(0.3, '#ff4d6d');
          flareGrad.addColorStop(1, 'rgba(255, 31, 67, 0)');

          ctx.fillStyle = flareGrad;
          ctx.beginPath();
          ctx.arc(centerX, burstY, flareRadius * 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // ----------------------------------------------------
      // 4. Embers & Rising Spark Particles
      // ----------------------------------------------------
      sparks.forEach(p => {
        p.life -= 1;
        p.x += p.vx;
        p.y += p.vy;

        if (p.life <= 0 || p.y < chamberTop || p.x < chamberX || p.x > chamberX + chamberWidth) {
          p.life = 40 + Math.random() * 40;
          p.x = centerX + (Math.random() - 0.5) * (chamberWidth * 0.7);
          p.y = targetY + (Math.random() * 10 - 5);
          p.vx = (Math.random() - 0.5) * 2.5;
          p.vy = -Math.random() * 3.5 - 1;
          p.alpha = Math.random() * 0.9 + 0.1;
        }

        ctx.fillStyle = `rgba(255, ${Math.floor(180 + Math.random() * 75)}, 200, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // ----------------------------------------------------
      // 5. Glass Reflection & Specular Sheen
      // ----------------------------------------------------
      // Left Specular Highlight
      const leftHighlight = ctx.createLinearGradient(chamberX, 0, chamberX + 25, 0);
      leftHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      leftHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
      leftHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = leftHighlight;
      ctx.fillRect(chamberX, chamberTop, 25, chamberHeight);

      // Right Dark Edge
      const rightEdge = ctx.createLinearGradient(chamberX + chamberWidth - 20, 0, chamberX + chamberWidth, 0);
      rightEdge.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rightEdge.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
      ctx.fillStyle = rightEdge;
      ctx.fillRect(chamberX + chamberWidth - 20, chamberTop, 20, chamberHeight);

      ctx.restore(); // End chamber clip

      // ----------------------------------------------------
      // 6. Outer Glass Border & Neon Reactor Ring Glow
      // ----------------------------------------------------
      ctx.save();
      ctx.beginPath();
      drawRoundedRect(ctx, chamberX, chamberTop, chamberWidth, chamberHeight, cornerRadius);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#6b1a28';
      ctx.stroke();

      // Overcharge / Boost flash pulse
      if (isSurging || isOverloaded) {
        ctx.strokeStyle = '#ff3355';
        ctx.shadowColor = '#ff1f43';
        ctx.shadowBlur = 30;
        ctx.stroke();
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    } catch (err) {
      console.warn('ReactorCanvas animation frame notice:', err);
      animationFrameId = requestAnimationFrame(render);
    }
  };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [voltage, isOverloaded, isSurging]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={460}
        height={860}
        className="w-full h-full object-contain drop-shadow-[0_0_38px_rgba(255,31,67,0.6)]"
      />
    </div>
  );
}
