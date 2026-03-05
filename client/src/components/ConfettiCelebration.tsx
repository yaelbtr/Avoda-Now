import { useEffect, useRef } from "react";

// ── Particle definition ───────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: "rect" | "circle" | "star";
  opacity: number;
  gravity: number;
  drag: number;
}

// Vibrant palette that pops on dark backgrounds
const COLORS = [
  "#60a5fa", // blue-400
  "#a78bfa", // violet-400
  "#f472b6", // pink-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#fb923c", // orange-400
  "#f87171", // red-400
  "#ffffff",  // white
];

function createParticle(cx: number, cy: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 4 + Math.random() * 10;
  const shapes: Particle["shape"][] = ["rect", "circle", "star"];
  return {
    x: cx,
    y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 6, // initial upward bias
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 5 + Math.random() * 7,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.3,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    opacity: 1,
    gravity: 0.25 + Math.random() * 0.15,
    drag: 0.98,
  };
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const spikes = 5;
  const outerRadius = r;
  const innerRadius = r * 0.45;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(x, y - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(x, y - outerRadius);
  ctx.closePath();
  ctx.fill();
}

interface ConfettiCelebrationProps {
  /** Number of particles to emit. Default: 160 */
  count?: number;
  /** Duration in ms before the canvas unmounts. Default: 3500 */
  duration?: number;
}

/**
 * Full-screen canvas confetti burst.
 * Renders on top of everything (z-index 9999), then self-destructs.
 */
export default function ConfettiCelebration({
  count = 160,
  duration = 3500,
}: ConfettiCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to viewport
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn burst from center-top area
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.35;
    const particles: Particle[] = Array.from({ length: count }, () =>
      createParticle(cx, cy)
    );

    let animId: number;
    let startTime: number | null = null;

    const tick = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = 0;
      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive++;

        // Physics
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Fade out after 60% of duration
        if (elapsed > duration * 0.6) {
          p.opacity -= 0.018;
        }

        // Draw
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(ctx, 0, 0, p.size / 2);
        }

        ctx.restore();
      }

      if (alive > 0 && elapsed < duration + 500) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [count, duration]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
