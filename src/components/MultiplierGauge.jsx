import React from 'react';

export default function MultiplierGauge({ multiplier = 1, progress = 0 }) {
  const totalSegments = 12;
  // Calculate active segments based on multiplier and progress
  // Mult 1: 0-2 segments, Mult 2: 3-5, Mult 3: 6-8, Mult 4: 9-11, Mult 5: 12 segments
  const baseSegments = (multiplier - 1) * 2.4;
  const bonusSegments = (progress / 100) * 2.4;
  const activeSegments = Math.min(totalSegments, Math.floor(baseSegments + bonusSegments));

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* SVG Radial Segments */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {Array.from({ length: totalSegments }).map((_, i) => {
            const angle = (i / totalSegments) * 2 * Math.PI;
            const startAngle = angle + 0.05;
            const endAngle = angle + (2 * Math.PI / totalSegments) - 0.08;

            const rInner = 36;
            const rOuter = 45;

            const x1 = 50 + rInner * Math.cos(startAngle);
            const y1 = 50 + rInner * Math.sin(startAngle);
            const x2 = 50 + rOuter * Math.cos(startAngle);
            const y2 = 50 + rOuter * Math.sin(startAngle);
            const x3 = 50 + rOuter * Math.cos(endAngle);
            const y3 = 50 + rOuter * Math.sin(endAngle);
            const x4 = 50 + rInner * Math.cos(endAngle);
            const y4 = 50 + rInner * Math.sin(endAngle);

            const path = `M ${x1} ${y1} L ${x2} ${y2} A ${rOuter} ${rOuter} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${rInner} ${rInner} 0 0 0 ${x1} ${y1} Z`;

            const isActive = i < activeSegments;

            return (
              <path
                key={i}
                d={path}
                fill={isActive ? '#ff1f43' : '#330c13'}
                className={`transition-colors duration-150 ${
                  isActive ? 'drop-shadow-[0_0_8px_rgba(255,31,67,0.9)]' : ''
                }`}
              />
            );
          })}
        </svg>

        {/* Center Multiplier Text */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="font-orbitron font-extrabold text-2xl tracking-wider text-white drop-shadow-[0_0_12px_rgba(255,31,67,1)]">
            x{multiplier}
          </span>
        </div>
      </div>
    </div>
  );
}
