import React, { useEffect, useState } from 'react';
import { PLAYER_COLORS } from '../utils/gameLogic';
import './WinScreen.css';

export function WinScreen({ winner, players, onPlayAgain }) {
    const [showConfetti, setShowConfetti] = useState(false);
    const winnerPlayer = players.find(p => p.id === winner);
    const winnerColor = winnerPlayer ? PLAYER_COLORS[winnerPlayer.colorIndex] : PLAYER_COLORS[0];

    useEffect(() => {
        setShowConfetti(true);
        const timer = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    if (!winnerPlayer) return null;

    return (
        <div className="win-screen-overlay">
            {showConfetti && (
                <div className="confetti-container">
                    {Array(50).fill(null).map((_, i) => (
                        <div
                            key={i}
                            className="confetti"
                            style={{
                                '--x': `${Math.random() * 100}%`,
                                '--delay': `${Math.random() * 2}s`,
                                '--duration': `${2 + Math.random() * 2}s`,
                                '--color': PLAYER_COLORS[i % 4].primary
                            }}
                        />
                    ))}
                </div>
            )}

            <div className="win-card" style={{ '--winner-color': winnerColor.primary, '--winner-glow': winnerColor.glow }}>
                <div className="trophy-container">
                    <div className="trophy">🏆</div>
                </div>

                <h1 className="winner-title">Victory!</h1>

                <div className="winner-name-container">
                    <div className="winner-atom"></div>
                    <h2 className="winner-name">{winnerPlayer.name}</h2>
                    <div className="winner-atom"></div>
                </div>

                <p className="winner-message">Dominated the reaction!</p>

                <button onClick={onPlayAgain} className="play-again-button">
                    Play Again
                </button>
            </div>
        </div>
    );
}
