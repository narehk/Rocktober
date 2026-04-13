/**
 * Rocktober Canvas — Particle System
 * Configurable emitter for vote celebrations, winner announcements, etc.
 */

export class ParticleEmitter {
  particles = [];
  x = 0;
  y = 0;
  _dispose = null;

  /**
   * @param {import('../engine.js').Engine} engine
   * @param {object} opts
   * @param {number} opts.x - emitter x position
   * @param {number} opts.y - emitter y position
   * @param {number} [opts.count=30]
   * @param {string[]} [opts.colors] - array of hex colors
   * @param {number} [opts.speed=3] - initial velocity magnitude
   * @param {number} [opts.gravity=0.08]
   * @param {number} [opts.lifetime=60] - frames
   * @param {number} [opts.size=4] - particle size
   * @param {boolean} [opts.burst=true] - emit all at once vs stream
   */
  constructor(engine, opts = {}) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    const count = opts.count || 30;
    const particleColors = opts.colors || ['#ff2d95', '#00e5ff', '#b026ff', '#39ff14', '#ffe600'];
    const speed = opts.speed || 3;
    const gravity = opts.gravity || 0.08;
    const lifetime = opts.lifetime || 60;
    const size = opts.size || 4;

    // Create particles
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const v = speed * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - speed * 0.5, // bias upward
        life: lifetime + Math.random() * 20,
        maxLife: lifetime + 20,
        size: size * (0.5 + Math.random() * 0.5),
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        gravity,
      });
    }

    // Register with engine render loop
    this._dispose = engine.onFrame(() => {
      this.update();
      if (this.particles.length === 0 && this._dispose) {
        this._dispose();
        this._dispose = null;
      }
    });
    this._engine = engine;
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Draw particles onto the canvas context.
   * Call this in the render pass after the scene.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      // Draw as small squares for pixel aesthetic
      ctx.fillRect(
        Math.round(p.x - p.size / 2),
        Math.round(p.y - p.size / 2),
        Math.round(p.size),
        Math.round(p.size)
      );
    }
    ctx.globalAlpha = 1;
  }

  /** Stop and clean up. */
  destroy() {
    this.particles = [];
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
  }
}

/**
 * Pre-configured: vote celebration burst.
 */
export function voteParticles(engine, x, y) {
  return new ParticleEmitter(engine, {
    x, y,
    count: 25,
    colors: ['#ff2d95', '#00e5ff', '#ffd700'],
    speed: 4,
    gravity: 0.1,
    lifetime: 40,
    size: 3,
  });
}

/**
 * Pre-configured: winner golden rain.
 */
export function winnerParticles(engine, width) {
  const emitters = [];
  for (let i = 0; i < 3; i++) {
    emitters.push(new ParticleEmitter(engine, {
      x: width * (0.25 + i * 0.25),
      y: -10,
      count: 40,
      colors: ['#ffd700', '#ffe600', '#ffaa00', '#fff4cc'],
      speed: 2,
      gravity: 0.05,
      lifetime: 80,
      size: 3,
    }));
  }
  return emitters;
}
