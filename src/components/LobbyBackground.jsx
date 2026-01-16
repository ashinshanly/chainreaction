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

        // Mouse Interaction
        const mouse = { x: -1000, y: -1000 };
        const repulsionRadius = 250; // Radius where repulsion starts
        const repulsionStrength = 2.5; // How hard it pushes

        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleTouchMove = (e) => {
            if (e.touches.length > 0) {
                mouse.x = e.touches[0].clientX;
                mouse.y = e.touches[0].clientY;
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);

        // Particle System
        const particles = [];
        const particleCount = 20;

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 1.5;
                this.vy = (Math.random() - 0.5) * 1.5;
                this.size = Math.random() * 12 + 8;
                const colorObj = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
                this.color = colorObj.primary;
                this.mass = this.size;
                this.baseVx = this.vx;
                this.baseVy = this.vy;
            }

            update() {
                // Mouse Repulsion
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < repulsionRadius) {
                    const force = (repulsionRadius - dist) / repulsionRadius; // 0 to 1
                    const angle = Math.atan2(dy, dx);

                    // Push away
                    this.vx += Math.cos(angle) * force * repulsionStrength;
                    this.vy += Math.sin(angle) * force * repulsionStrength;
                }

                // Drag to stabilize speed
                this.vx *= 0.98;
                this.vy *= 0.98;

                // Recover speed if too slow
                if (Math.abs(this.vx) < Math.abs(this.baseVx)) this.vx += this.baseVx * 0.02;
                if (Math.abs(this.vy) < Math.abs(this.baseVy)) this.vy += this.baseVy * 0.02;

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

                const gradient = ctx.createRadialGradient(
                    this.x - this.size * 0.3,
                    this.y - this.size * 0.3,
                    this.size * 0.1,
                    this.x,
                    this.y,
                    this.size
                );
                // Opaque & Glowy Look
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.3, this.color);
                gradient.addColorStop(1, this.color);

                ctx.fillStyle = gradient;
                ctx.fill();

                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
                ctx.fill();
                ctx.shadowBlur = 0;
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
                        const angle = Math.atan2(dy, dx);
                        const sin = Math.sin(angle);
                        const cos = Math.cos(angle);

                        const vx1 = p1.vx * cos + p1.vy * sin;
                        const vy1 = p1.vy * cos - p1.vx * sin;
                        const vx2 = p2.vx * cos + p2.vy * sin;
                        const vy2 = p2.vy * cos - p2.vx * sin;

                        const v1Final = ((p1.mass - p2.mass) * vx1 + 2 * p2.mass * vx2) / (p1.mass + p2.mass);
                        const v2Final = ((p2.mass - p1.mass) * vx2 + 2 * p1.mass * vx1) / (p1.mass + p2.mass);

                        const p1vx = v1Final * cos - vy1 * sin;
                        const p1vy = vy1 * cos + v1Final * sin;
                        const p2vx = v2Final * cos - vy2 * sin;
                        const p2vy = vy2 * cos + v2Final * sin;

                        p1.vx = p1vx;
                        p1.vy = p1vy;
                        p2.vx = p2vx;
                        p2.vy = p2vy;

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

        handleResize();
        window.addEventListener('resize', handleResize);
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
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
                zIndex: 0,
                background: 'radial-gradient(circle at center, #1a1a2e 0%, #000 100%)',
                pointerEvents: 'none'
            }}
        />
    );
}
