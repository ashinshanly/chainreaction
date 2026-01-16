import React, { useEffect, useRef } from 'react';
import { PhysicsRenderer } from '../utils/PhysicsEngine';
import { GRID_ROWS, GRID_COLS } from '../utils/gameLogic';
import './FlyingAtoms.css';

export function FlyingAtoms({ atoms }) {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const processedAtomsRef = useRef(new Set());

    // Initialize Engine
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Handle high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Core physics engine
        const engine = new PhysicsRenderer(canvas, GRID_ROWS, GRID_COLS);
        // Correct internal dimensions for logic mapping
        engine.resize(rect.width, rect.height);

        engine.start();
        engineRef.current = engine;

        const handleResize = () => {
            const newRect = canvas.getBoundingClientRect();
            canvas.width = newRect.width * dpr;
            canvas.height = newRect.height * dpr;
            ctx.scale(dpr, dpr);
            engine.resize(newRect.width, newRect.height);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            engine.stop();
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Sync atoms with engine
    useEffect(() => {
        if (!engineRef.current || !atoms) return;

        atoms.forEach(atom => {
            // Only spawn new atoms we haven't processed yet
            // Using atom.id from the Logic hook
            if (!processedAtomsRef.current.has(atom.id)) {
                engineRef.current.spawnExplosion(atom.from, atom.to, atom.color);
                processedAtomsRef.current.add(atom.id);

                // Cleanup old IDs to prevent memory leaks in long games
                if (processedAtomsRef.current.size > 1000) {
                    const it = processedAtomsRef.current.values();
                    processedAtomsRef.current.delete(it.next().value);
                }
            }
        });
    }, [atoms]);

    return (
        <canvas
            ref={canvasRef}
            className="flying-atoms-layer"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 20
            }}
        />
    );
}
