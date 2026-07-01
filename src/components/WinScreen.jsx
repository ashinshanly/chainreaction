import React, { useEffect, useState } from 'react';
import { PLAYER_COLORS } from '../utils/gameLogic';
import './WinScreen.css';

export function WinScreen({ winner, players, onPlayAgain }) {
    const [showConfetti, setShowConfetti] = useState(true);
    const winnerPlayer = players.find(p => p.id === winner);
    const winnerColor = winnerPlayer ? PLAYER_COLORS[winnerPlayer.colorIndex] : PLAYER_COLORS[0];

    useEffect(() => {
        const timer = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    if (!winnerPlayer) return null;

    return (
        <div className="win-screen-overlay">
            {showConfetti && (
                <div className="confetti-container">
                    {Array.from({ length: 36 }).map((_, i) => (
                        <div
                            key={i}
                            className="confetti"
                            style={{
                                '--x': `${(i * 29 + 7) % 100}%`,
                                '--delay': `${(i % 9) * 0.14}s`,
                                '--duration': `${2.4 + (i % 6) * 0.18}s`,
                                '--color': PLAYER_COLORS[i % 4].primary
                            }}
                        />
                    ))}
                </div>
            )}

            <div className="win-card" style={{ '--winner-color': winnerColor.primary, '--winner-glow': winnerColor.glow }}>
                <div className="trophy-container">
                    <div className="victory-rings"><i /><i /><i /></div>
                    <svg className="trophy" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 6H4v1a4 4 0 004 4M17 6h3v1a4 4 0 01-4 4" strokeLinecap="round" />
                    </svg>
                </div>

                <span className="victory-kicker">Reaction complete</span>
                <h1 className="winner-title">Victory</h1>

                <div className="winner-name-container">
                    <div className="winner-atom"></div>
                    <h2 className="winner-name">{winnerPlayer.name}</h2>
                    <div className="winner-atom"></div>
                </div>

                <p className="winner-message">controlled the chain and claimed the board.</p>

                <button type="button" onClick={onPlayAgain} className="play-again-button">
                    Return to lobby
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
            </div>
        </div>
    );
}
