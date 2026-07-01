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
    const color = cell.colorIndex !== undefined && cell.colorIndex !== null
        ? PLAYER_COLORS[cell.colorIndex]
        : null;

    const [receiving, setReceiving] = React.useState(false);
    const previousCount = React.useRef(atomCount);

    React.useEffect(() => {
        if (atomCount > previousCount.current) {
            setReceiving(true);
            const timer = setTimeout(() => setReceiving(false), 360);
            previousCount.current = atomCount;
            return () => clearTimeout(timer);
        }
        previousCount.current = atomCount;
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
                    className={`atom-group atom-${count}-${i} ${isExploding ? 'exploding' : ''}`}
                    style={{
                        '--atom-delay': `${i * 0.1}s`
                    }}
                >
                    <div
                        className="atom"
                        style={{
                            '--atom-color': color?.primary || '#fff',
                            '--atom-glow': color?.glow || 'rgba(255,255,255,0.5)'
                        }}
                    />
                </div>
            );
        }

        return atoms;
    };

    const isCritical = atomCount === criticalMass - 1;
    const isClickable = isMyTurn && canPlace;

    return (
        <button
            type="button"
            className={`cell ${isClickable ? 'clickable' : ''} ${isCritical ? 'critical' : ''} ${isExploding ? 'exploding' : ''} ${receiving ? 'receiving' : ''}`}
            onClick={handleClick}
            disabled={!isClickable}
            data-critical-mass={criticalMass}
            data-owned={owner !== null}
            style={{
                '--cell-color': color?.primary || 'rgba(255, 255, 255, 0.3)',
                '--cell-glow': color?.glow || 'rgba(255, 255, 255, 0.08)'
            }}
            aria-label={`Row ${row + 1}, column ${col + 1}. ${atomCount ? `${atomCount} of ${criticalMass} atoms` : 'Empty'}${isClickable ? '. Place atom' : ''}`}
        >
            <div className="cell-inner">
                <div className="atoms-container" data-atom-count={atomCount}>
                    {renderAtoms()}
                </div>
                <div className="charge-meter" aria-hidden="true">
                    {Array.from({ length: criticalMass }).map((_, index) => (
                        <span key={index} className={index < atomCount ? 'filled' : ''} />
                    ))}
                </div>
            </div>
        </button>
    );
}
