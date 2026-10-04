import React, { useEffect, useRef } from 'react';

/**
 * Liquid Glass Aurora Canvas.
 * Creates an organic, undulating liquid mesh with vibrant violet/cyan/electric blue color blending
 * and mouse-reactive fluid inertia.
 */
export const LiquidBackdrop: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = Math.floor(window.innerWidth / 2));
    let height = (canvas.height = Math.floor(window.innerHeight / 2));

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handlePointerMove = (e: PointerEvent) => {
      targetMouseX = e.clientX / 2;
      targetMouseY = e.clientY / 2;
    };
    window.addEventListener('pointermove', handlePointerMove);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = Math.floor(window.innerWidth / 2);
      height = canvas.height = Math.floor(window.innerHeight / 2);
    };
    window.addEventListener('resize', handleResize);

    // Multi-color vibrant orbs
    const orbs = [
      { x: width * 0.22, y: height * 0.26, radius: 260, vx: 0.6, vy: 0.4, colorDark: '#6366f1', colorLight: '#818cf8' },
      { x: width * 0.82, y: height * 0.32, radius: 280, vx: -0.5, vy: 0.7, colorDark: '#06b6d4', colorLight: '#38bdf8' },
      { x: width * 0.52, y: height * 0.75, radius: 300, vx: 0.7, vy: -0.5, colorDark: '#3b82f6', colorLight: '#60a5fa' },
      { x: width * 0.88, y: height * 0.82, radius: 240, vx: -0.4, vy: -0.6, colorDark: '#ec4899', colorLight: '#f472b6' },
      { x: width * 0.16, y: height * 0.84, radius: 250, vx: 0.5, vy: 0.5, colorDark: '#8b5cf6', colorLight: '#a78bfa' },
    ];

    let animId = 0;
    let isVisible = true;
    const handleVis = () => {
      isVisible = !document.hidden;
      if (isVisible) renderLoop();
    };
    document.addEventListener('visibilitychange', handleVis);

    let isDark = document.documentElement.dataset.theme !== 'light';
    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.dataset.theme !== 'light';
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    let time = 0;
    const renderLoop = () => {
      if (!isVisible) return;
      animId = requestAnimationFrame(renderLoop);
      time += 0.009;

      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = isDark ? 'screen' : 'multiply';

      orbs.forEach((orb, i) => {
        const ox = orb.x + Math.sin(time + i * 1.4) * 120 + (mouseX - width / 2) * (0.09 * (i + 1));
        const oy = orb.y + Math.cos(time + i * 1.7) * 95 + (mouseY - height / 2) * (0.09 * (i + 1));

        const grad = ctx.createRadialGradient(ox, oy, 10, ox, oy, orb.radius);
        const col = isDark ? orb.colorDark : orb.colorLight;

        grad.addColorStop(0, isDark ? `${col}cc` : `${col}77`);
        grad.addColorStop(0.28, isDark ? `${col}77` : `${col}44`);
        grad.addColorStop(0.65, isDark ? `${col}22` : `${col}12`);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    };

    renderLoop();

    return () => {
      isVisible = false;
      themeObserver.disconnect();
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="liquid-aurora-canvas" aria-hidden="true" />
      <div className="liquid-noise-overlay" aria-hidden="true" />
    </>
  );
};
