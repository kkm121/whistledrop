import React, { useEffect, useRef } from 'react';

export const LiquidBackdrop: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const orbs = [
      { x: width * 0.2, y: height * 0.3, r: 280, dx: 0.3, dy: 0.25, color: 'rgba(99, 102, 241, 0.12)' },
      { x: width * 0.8, y: height * 0.4, r: 340, dx: -0.25, dy: 0.3, color: 'rgba(168, 85, 247, 0.10)' },
      { x: width * 0.5, y: height * 0.8, r: 300, dx: 0.2, dy: -0.2, color: 'rgba(14, 165, 233, 0.09)' },
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      orbs.forEach((orb) => {
        orb.x += orb.dx;
        orb.y += orb.dy;
        if (orb.x - orb.r < 0 || orb.x + orb.r > width) orb.dx *= -1;
        if (orb.y - orb.r < 0 || orb.y + orb.r > height) orb.dy *= -1;

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="liquid-backdrop-container" aria-hidden="true">
      <canvas ref={canvasRef} className="liquid-canvas" />
      <div className="liquid-noise-overlay" />
      <div className="liquid-grid-overlay" />
    </div>
  );
};
