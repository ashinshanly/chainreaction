import gsap from 'gsap';

// Constants for physics visual tuning
const SPARK_COUNT = 5;
const PARTICLES_GRAVITY = 0.5;
const SQUASH_FACTOR = 0.3; // How much it narrows during flight

export class PhysicsRenderer {
    constructor(canvas, rows, cols) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.rows = rows;
        this.cols = cols;
        this.width = canvas.width;
        this.height = canvas.height;

        // Lists of specialized particles
        this.atoms = []; // The main flying orbs
        this.sparks = []; // Impact debris

        // Animation loop ID
        this.rafId = null;
        this.lastTime = 0;

        // Cell dimensions for coordinate mapping
        this.cellWidth = this.width / this.cols;
        this.cellHeight = this.height / this.rows;

        // Bind draw loop
        this.tick = this.tick.bind(this);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.cellWidth = width / this.cols;
        this.cellHeight = height / this.rows;
    }

    // Convert grid (row, col) to pixel center (x, y)
    getPixelPos(row, col) {
        return {
            x: col * this.cellWidth + this.cellWidth / 2,
            y: row * this.cellHeight + this.cellHeight / 2
        };
    }

    start() {
        if (!this.rafId) {
            this.lastTime = performance.now();
            this.rafId = requestAnimationFrame(this.tick);
        }
    }

    stop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    tick(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000; // in seconds
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();

        this.rafId = requestAnimationFrame(this.tick);
    }

    spawnExplosion(from, to, color, delay = 0) {
        const startPos = this.getPixelPos(from.row, from.col);
        const endPos = this.getPixelPos(to.row, to.col);

        const atom = {
            x: startPos.x,
            y: startPos.y,
            z: 0, // Height for the arc
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            color: color,
            alpha: 1,
            dead: false,
            // Custom properties for GSAP to animate
            progress: 0
        };

        // Total animation duration
        const duration = 0.5; // Seconds

        // 1. Anticipation (Back.easeIn equivalent done manually or via timeline)
        // 2. Flight
        // 3. Impact (Elastic.easeOut)

        const tl = gsap.timeline({
            delay: delay,
            onComplete: () => {
                // Spawn sparks exactly when it lands
                this.spawnSparks(endPos.x, endPos.y, color);
                atom.dead = true;
            }
        });

        // Instant Launch & Arc (No anticipation)
        tl.to(atom, {
            duration: 0.35, // Faster flight (was 0.5 total)
            ease: "power2.inOut",
            x: endPos.x,
            y: endPos.y,
            onUpdate: function () {
                const p = this.progress();
                // Arc logic: Parabolic Z height
                // Max height at middle of flight (Reduced height for tighter feel)
                atom.z = Math.sin(p * Math.PI) * 30;

                // Squash and stretch based on velocity
                const dx = endPos.x - startPos.x;
                const dy = endPos.y - startPos.y;
                atom.rotation = Math.atan2(dy, dx);

                // Stretch along velocity (approximate)
                if (p > 0.1 && p < 0.9) {
                    atom.scaleX = 1.2;
                    atom.scaleY = 1.2; // Keep it rounder/larger for visibility
                } else {
                    atom.scaleX = 1;
                    atom.scaleY = 1;
                }
            }
        });

        this.atoms.push(atom);
    }

    spawnSparks(x, y, color) {
        for (let i = 0; i < SPARK_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 100; // px per second

            this.sparks.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0, // 1 second max life
                color: color,
                decay: 2.0 + Math.random() // Decay rate
            });
        }
    }

    update(dt) {
        // Atoms are updated via GSAP internally, we just filter dead ones
        this.atoms = this.atoms.filter(a => !a.dead);

        // Update sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.life -= s.decay * dt;

            if (s.life <= 0) {
                this.sparks.splice(i, 1);
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Atoms
        this.atoms.forEach(atom => {
            this.ctx.save();
            this.ctx.translate(atom.x, atom.y - atom.z); // Apply Z as Y-offset
            this.ctx.rotate(atom.rotation);
            this.ctx.scale(atom.scaleX, atom.scaleY);

            this.ctx.beginPath();
            const r = 10; // Slightly larger for visibility
            this.ctx.arc(0, 0, r, 0, Math.PI * 2);

            // Opaque & Glowy Look (Matching CSS)
            const grad = this.ctx.createRadialGradient(
                -r * 0.3, -r * 0.3, r * 0.1,
                0, 0, r
            );
            // We can't easily use color-mix in canvas, so we approximate
            grad.addColorStop(0, '#ffffff'); // Center highlight
            grad.addColorStop(0.3, atom.color); // Bright core
            grad.addColorStop(1, atom.color); // Solid Edge (not black)

            this.ctx.fillStyle = grad;
            this.ctx.fill();

            // Strong Glow
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = atom.color;
            this.ctx.fill(); // Re-fill to apply shadow strongly

            this.ctx.restore();
        });

        // Draw Sparks
        this.sparks.forEach(spark => {
            this.ctx.save();
            this.ctx.globalAlpha = spark.life;
            this.ctx.translate(spark.x, spark.y);

            this.ctx.beginPath();
            this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = spark.color;
            this.ctx.fill();
            this.ctx.restore();
        });
    }
}
