import React from 'react';
import './FlyingAtoms.css';

export function FlyingAtoms({ atoms }) {
    if (!atoms || atoms.length === 0) return null;

    return (
        <div className="flying-atoms-layer" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 20
        }}>
            {atoms.map(atom => (
                <div
                    key={atom.id}
                    className="flying-atom"
                    style={{
                        '--from-x': atom.from.col,
                        '--from-y': atom.from.row,
                        '--to-x': atom.to.col,
                        '--to-y': atom.to.row,
                        '--atom-color': atom.color
                    }}
                />
            ))}
        </div>
    );
}
