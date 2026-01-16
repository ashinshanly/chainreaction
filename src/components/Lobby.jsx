import React, { useState } from 'react';
import { PLAYER_COLORS } from '../utils/gameLogic';
import { LobbyBackground } from './LobbyBackground';
import './Lobby.css';

export function Lobby({
    gameState,
    playerId,
    playerName,
    isHost,
    isInGame,
    onJoin,
    onLeave,
    onStart,
    onSetMaxPlayers,
    connectionError
}) {
    const [nameInput, setNameInput] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const [showRules, setShowRules] = useState(false);

    const maxPlayers = gameState?.maxPlayers || 4;
    const players = gameState?.players || [];
    const joinedCount = players.length;

    const handleJoin = async () => {
        if (!nameInput.trim()) {
            setError('Please enter your name');
            return;
        }
        if (nameInput.trim().length > 12) {
            setError('Name must be 12 characters or less');
            return;
        }

        setIsJoining(true);
        setError('');

        try {
            const success = await onJoin(nameInput.trim());
            if (!success) {
                setError('Failed to join. Game may be full or already started.');
            }
        } catch (e) {
            console.error('Join error:', e);
            setError(e.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsJoining(false);
        }
    };

    const handleStart = async () => {
        if (players.length < 2) {
            setError('Need at least 2 players to start');
            return;
        }
        await onStart();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleJoin();
        }
    };

    const handlePlayerCountChange = (count) => {
        if (isHost && onSetMaxPlayers) {
            onSetMaxPlayers(count);
        }
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!'); // Could replace with a toast for better UX
    };

    return (
        <div className="lobby-container">
            <LobbyBackground />
            <div className="lobby-card">
                {/* Header */}
                <div className="lobby-header">
                    <div className="logo-container">
                        <div className="atom atom-1"></div>
                        <div className="atom atom-2"></div>
                        <div className="atom atom-3"></div>
                    </div>
                    <h1 className="lobby-title">Chain Reaction</h1>
                    <p className="lobby-subtitle">Multiplayer Strategy Game</p>
                </div>

                {/* Main Content Area */}
                {!isInGame ? (
                    // JOIN VIEW
                    <div className="join-section">
                        <div className="input-container">
                            <input
                                type="text"
                                placeholder="Enter your nickname"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                maxLength={12}
                                className="name-input"
                                disabled={isJoining}
                                autoFocus
                            />
                            <span className="char-count">{nameInput.length}/12</span>
                        </div>

                        {error && <div className="error-banner">{error}</div>}
                        {connectionError && <div className="error-banner">Auth: {connectionError}</div>}

                        <button
                            onClick={handleJoin}
                            disabled={isJoining || joinedCount >= maxPlayers || !playerId}
                            className="join-button"
                        >
                            {!playerId ? 'Connecting...' : (isJoining ? 'Joining...' : 'Join Game')}
                        </button>

                        {joinedCount >= maxPlayers && (
                            <p className="error-banner" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', borderColor: 'transparent' }}>
                                Lobby is full ({maxPlayers}/{maxPlayers})
                            </p>
                        )}
                    </div>
                ) : (
                    // LOBBY VIEW (JOINED)
                    <div className="joined-section">
                        {/* Player List */}
                        <div className="players-section">
                            <div className="section-header">
                                <span>Players</span>
                                <span>{joinedCount}/{maxPlayers}</span>
                            </div>

                            <div className="players-grid">
                                {players.map((player, index) => {
                                    const isMe = player.id === playerId;
                                    const playerColor = PLAYER_COLORS[index]?.primary || '#ccc';

                                    return (
                                        <div
                                            key={player.id}
                                            className={`player-card ${isMe ? 'is-me' : ''}`}
                                            style={{ '--player-color': playerColor }}
                                        >
                                            <div className="player-avatar">
                                                <div className="player-orb"></div>
                                            </div>
                                            <div className="player-info">
                                                <span className="player-name">
                                                    {isMe ? 'You' : player.name}
                                                </span>
                                                <span className="player-status">
                                                    {index === 0 ? 'Wait...' : 'Ready'}
                                                </span>
                                            </div>
                                            {player.id === gameState.hostId && (
                                                <span className="host-badge">HOST</span>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Empty Slots */}
                                {Array(maxPlayers - joinedCount).fill(null).map((_, i) => (
                                    <div key={`empty-${i}`} className="player-card empty">
                                        <div className="player-avatar">
                                            <div className="player-orb" style={{ background: 'transparent', border: '2px dotted rgba(255,255,255,0.2)' }}></div>
                                        </div>
                                        <div className="player-info">
                                            <span className="player-name" style={{ opacity: 0.5 }}>Empty</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Host Controls */}
                        {isHost && (
                            <div className="host-controls">
                                <div className="control-group">
                                    <span className="control-label">Max Players</span>
                                    <div className="player-count-buttons">
                                        {[2, 3, 4].map(count => (
                                            <button
                                                key={count}
                                                className={`count-btn ${maxPlayers === count ? 'active' : ''}`}
                                                onClick={() => handlePlayerCountChange(count)}
                                                disabled={joinedCount > count}
                                            >
                                                {count}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleStart}
                                    disabled={joinedCount < 2}
                                    className="start-button"
                                >
                                    {joinedCount < 2 ? 'Need 2+ Players' : 'Start Game'}
                                </button>
                            </div>
                        )}

                        {/* Waiting Message for Non-Host */}
                        {!isHost && (
                            <div className="error-banner" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', borderColor: 'transparent' }}>
                                Waiting for host to start...
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="lobby-footer">
                    <button className="icon-button" onClick={() => setShowRules(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        How to Play
                    </button>

                    <button className="icon-button" onClick={copyInviteLink}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Invite
                    </button>

                    {isInGame && (
                        <button className="icon-button danger" onClick={onLeave}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </button>
                    )}
                </div>

                {/* Rules Overlay */}
                {showRules && (
                    <div className="rules-overlay">
                        <div className="rules-header">
                            <span>How to Play</span>
                            <button className="close-btn" onClick={() => setShowRules(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <ul className="rules-list">
                            <li>
                                <div className="rule-icon">🎯</div>
                                <span>Place atoms on empty cells or cells you already own.</span>
                            </li>
                            <li>
                                <div className="rule-icon">💥</div>
                                <span>Cells explode when they reach critical mass (Number of neighbours).</span>
                            </li>
                            <li>
                                <div className="rule-icon">⚡</div>
                                <span>Explosions claim neighboring cells for you.</span>
                            </li>
                            <li>
                                <div className="rule-icon">🏆</div>
                                <span>Eliminate all opponents to win the game!</span>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
