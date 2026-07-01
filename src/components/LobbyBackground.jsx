import React, { useEffect, useRef } from 'react';
import { PLAYER_COLORS } from '../utils/gameLogic';

function createParticle(width, height) {
    const size = Math.random() * 12 + 8;
    const vx = (Math.random() - 0.5) * 1.5;
    const vy = (Math.random() - 0.5) * 1.5;
    return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx,
        vy,
        size,
        color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)].primary,
        mass: size,
        baseVx: vx,
        baseVy: vy
    };
}

function updateParticle(particle, mouse, width, height) {
    const dx = particle.x - mouse.x;
    const dy = particle.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const repulsionRadius = 250;

    if (dist < repulsionRadius) {
        const force = (repulsionRadius - dist) / repulsionRadius;
        const angle = Math.atan2(dy, dx);
        particle.vx += Math.cos(angle) * force * 2.5;
        particle.vy += Math.sin(angle) * force * 2.5;
    }

    particle.vx *= 0.98;
    particle.vy *= 0.98;
    if (Math.abs(particle.vx) < Math.abs(particle.baseVx)) particle.vx += particle.baseVx * 0.02;
    if (Math.abs(particle.vy) < Math.abs(particle.baseVy)) particle.vy += particle.baseVy * 0.02;
    particle.x += particle.vx;
    particle.y += particle.vy;

    if (particle.x - particle.size < 0 || particle.x + particle.size > width) {
        particle.x = Math.max(particle.size, Math.min(width - particle.size, particle.x));
        particle.vx *= -1;
    }
    if (particle.y - particle.size < 0 || particle.y + particle.size > height) {
        particle.y = Math.max(particle.size, Math.min(height - particle.size, particle.y));
        particle.vy *= -1;
    }
}

function drawParticle(ctx, particle) {
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
        particle.x - particle.size * 0.3,
        particle.y - particle.size * 0.3,
        particle.size * 0.1,
        particle.x,
        particle.y,
        particle.size
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, particle.color);
    gradient.addColorStop(1, particle.color);
    ctx.shadowBlur = 15;
    ctx.shadowColor = particle.color;
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
}

export function LobbyBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = window.innerWidth;
        let height = window.innerHeight;
        let animationFrameId;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Mouse Interaction
        const mouse = { x: -1000, y: -1000 };
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

        if (!reducedMotion) {
            window.addEventListener('mousemove', handleMouseMove, { passive: true });
            window.addEventListener('touchmove', handleTouchMove, { passive: true });
        }

        // Particle System
        const particles = [];
        const particleCount = reducedMotion ? 12 : Math.min(22, Math.max(14, Math.round(window.innerWidth / 70)));

        // Initialize
        for (let i = 0; i < particleCount; i++) {
            particles.push(createParticle(width, height));
        }

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
                updateParticle(p, mouse, width, height);
                drawParticle(ctx, p);
            });

            if (!reducedMotion) animationFrameId = requestAnimationFrame(animate);
        };

        const handleVisibility = () => {
            if (document.hidden) {
                cancelAnimationFrame(animationFrameId);
            } else if (!reducedMotion) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        document.addEventListener('visibilitychange', handleVisibility);
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('visibilitychange', handleVisibility);
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
