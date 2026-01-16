import React, { useEffect, useRef } from 'react';
import { PLAYER_COLORS } from '../utils/gameLogic';

export function LobbyBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = window.innerWidth;
        let height = window.innerHeight;
        let animationFrameId;

        // Particle System
        const particles = [];
        const particleCount = 15;
        const connectionDistance = 150;

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
                this.size = Math.random() * 15 + 10; // Radius: 10-25
                // Pick a random player color
                const colorObj = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
                this.color = colorObj.primary;
                this.mass = this.size; // Simple mass approximation
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Wall Collisions
                if (this.x - this.size < 0) {
                    this.x = this.size;
                    this.vx *= -1;
                }
                if (this.x + this.size > width) {
                    this.x = width - this.size;
                    this.vx *= -1;
                }
                if (this.y - this.size < 0) {
                    this.y = this.size;
                    this.vy *= -1;
                }
                if (this.y + this.size > height) {
                    this.y = height - this.size;
                    this.vy *= -1;
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

                // 3D Sphere Gradient
                const gradient = ctx.createRadialGradient(
                    this.x - this.size * 0.3,
                    this.y - this.size * 0.3,
                    this.size * 0.1,
                    this.x,
                    this.y,
                    this.size
                );
                gradient.addColorStop(0, '#fff');
                gradient.addColorStop(0.3, this.color);
                gradient.addColorStop(1, '#000');

                ctx.fillStyle = gradient;
                ctx.fill();

                // Simple Glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
                ctx.fill();
                ctx.shadowBlur = 0; // Reset
            }
        }

        // Initialize
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        const checkCollisions = () => {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const p1 = particles[i];
                    const p2 = particles[j];

                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < p1.size + p2.size) {
                        // Elastic Collision Logic
                        const angle = Math.atan2(dy, dx);
                        const sin = Math.sin(angle);
                        const cos = Math.cos(angle);

                        // Rotate velocity
                        const vx1 = p1.vx * cos + p1.vy * sin;
                        const vy1 = p1.vy * cos - p1.vx * sin;
                        const vx2 = p2.vx * cos + p2.vy * sin;
                        const vy2 = p2.vy * cos - p2.vx * sin;

                        // Swap 1D velocity
                        // (Assume equal mass or size-based mass)
                        const v1Final = ((p1.mass - p2.mass) * vx1 + 2 * p2.mass * vx2) / (p1.mass + p2.mass);
                        const v2Final = ((p2.mass - p1.mass) * vx2 + 2 * p1.mass * vx1) / (p1.mass + p2.mass);

                        // Rotate back
                        const p1vx = v1Final * cos - vy1 * sin;
                        const p1vy = vy1 * cos + v1Final * sin;
                        const p2vx = v2Final * cos - vy2 * sin;
                        const p2vy = vy2 * cos + v2Final * sin;

                        p1.vx = p1vx;
                        p1.vy = p1vy;
                        p2.vx = p2vx;
                        p2.vy = p2vy;

                        // Separate particles to prevent sticking
                        const overlap = (p1.size + p2.size - distance) / 2;
                        p1.x -= overlap * cos;
                        p1.y -= overlap * sin;
                        p2.x += overlap * cos;
                        p2.y += overlap * sin;
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            checkCollisions();

            particles.forEach(p => {
                p.update();
                p.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        handleResize(); // Initial size
        window.addEventListener('resize', handleResize);
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0, // Behind content
                background: 'radial-gradient(circle at center, #1a1a2e 0%, #000 100%)',
                pointerEvents: 'none'
            }}
        />
    );
}
