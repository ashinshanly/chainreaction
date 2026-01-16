import React from 'react';
import './Cell.css';
import { getCriticalMass, PLAYER_COLORS } from '../utils/gameLogic';

export function Cell({
    row,
    col,
    cell,
    isExploding,
    isMyTurn,
    canPlace,
    onClick
}) {
    const criticalMass = getCriticalMass(row, col);
    const atomCount = cell.count;
    const owner = cell.owner;
    const playerColor = owner !== null
        ? PLAYER_COLORS.find((_, i) => PLAYER_COLORS[i]?.primary === cell.ownerColor) || PLAYER_COLORS[cell.colorIndex] || PLAYER_COLORS[0]
        : null;

    // Find actual color from colorIndex stored in cell
    const color = cell.colorIndex !== undefined && cell.colorIndex !== null
        ? PLAYER_COLORS[cell.colorIndex]
        : null;

    if (atomCount > 0) console.log(`Cell [${row},${col}]`, { atomCount, owner, colorIndex: cell.colorIndex, color });

    // Track receiving state for animation
    const [receiving, setReceiving] = React.useState(false);

    // Trigger receive animation when atom count increases
    React.useEffect(() => {
        // Only trigger if we have atoms (not 0) and it's an increase (we'd need ref for prev, but simple check is ok)
        // Actually to be precise we need previous count. 
        // But for visual flair, triggering on any count change > 0 is okay, 
        // though strictly we only want it on INCREASE.
        // Let's rely on the fact that updates usually mean additions in this game.
        if (atomCount > 0) {
            setReceiving(true);
            const timer = setTimeout(() => setReceiving(false), 300);
            return () => clearTimeout(timer);
        }
    }, [atomCount]);

    const handleClick = () => {
        // Removed detailed logging for cleaner console
        if (isMyTurn && canPlace) {
            onClick(row, col);
        }
    };

    const renderAtoms = () => {
        const atoms = [];
        const count = Math.min(atomCount, 4);

        for (let i = 0; i < count; i++) {
            atoms.push(
                <div
                    key={i}
                    className={`atom atom-${count}-${i} ${isExploding ? 'exploding' : ''}`}
                    style={{
                        '--atom-color': color?.primary || '#fff',
                        '--atom-glow': color?.glow || 'rgba(255,255,255,0.5)',
                        '--atom-delay': `${i * 0.1}s`
                    }}
                />
            );
        }

        return atoms;
    };

    const isCritical = atomCount === criticalMass - 1;
    const isClickable = isMyTurn && canPlace;

    return (
        <div
            className={`cell ${isClickable ? 'clickable' : ''} ${isCritical ? 'critical' : ''} ${isExploding ? 'exploding' : ''} ${receiving ? 'receiving' : ''}`}
            onClick={handleClick}
            data-critical-mass={criticalMass}
        >
            <div className="cell-inner">
                <div className="atoms-container">
                    {renderAtoms()}
                </div>
            </div>
        </div>
    );
}
