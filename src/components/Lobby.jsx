import React, { useState, useEffect } from 'react';
import { PLAYER_COLORS } from '../utils/gameLogic';
import { LobbyBackground } from './LobbyBackground';
import './Lobby.css';

export function Lobby({
    gameState,
    playerId,
    isHost,
    isInGame,
    onJoin,
    onLeave,
    onStart,
    onSetMaxPlayers,
    onReset,
    connectionError
}) {
    const [nameInput, setNameInput] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const [showRules, setShowRules] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [inviteCopied, setInviteCopied] = useState(false);

    // Lobby Timeout Logic (5 Minutes)
    useEffect(() => {
        if (!gameState?.hostJoinedAt) {
            setTimeLeft(null);
            return;
        }

        const TIMEOUT_MS = 5 * 60 * 1000; // 5 Minutes

        const updateTimer = () => {
            const elapsed = Date.now() - gameState.hostJoinedAt;
            const remaining = TIMEOUT_MS - elapsed;

            if (remaining <= 0) {
                if (gameState.hostJoinedAt && onReset) {
                    onReset();
                }
            } else {
                setTimeLeft(remaining);
            }
        };

        const interval = setInterval(updateTimer, 1000);
        updateTimer();

        return () => clearInterval(interval);
    }, [gameState?.hostJoinedAt, onReset]);

    const formatTime = (ms) => {
        if (ms === null || ms < 0) return '';
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

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

    const copyInviteLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setInviteCopied(true);
            window.setTimeout(() => setInviteCopied(false), 1800);
        } catch {
            setError('Could not copy the invite link. Copy it from the address bar.');
        }
    };

    return (
        <div className="lobby-container">
            <LobbyBackground />
            <div className="lobby-card">
                <div className="lobby-header">
                    <div className="logo-container">
                        <div className="logo-core"></div>
                        <div className="logo-orbit orbit-one"><i /></div>
                        <div className="logo-orbit orbit-two"><i /></div>
                    </div>
                    <div className="lobby-eyebrow"><span /> Live multiplayer</div>
                    <h1 className="lobby-title">Chain <span>Reaction</span></h1>
                    <p className="lobby-subtitle">Build energy. Trigger chaos. Own the board.</p>
                    {timeLeft !== null && (
                        <div className={`lobby-timer ${timeLeft < 60000 ? 'urgent' : ''}`}>
                            <span>Lobby closes in</span><strong>{formatTime(timeLeft)}</strong>
                        </div>
                    )}
                </div>

                {!isInGame ? (
                    <div className="join-section">
                        <div className="join-intro">
                            <span>Enter the arena</span>
                            <small>{joinedCount}/{maxPlayers} players connected</small>
                        </div>
                        <div className="input-container">
                            <label htmlFor="player-name">Nickname</label>
                            <input
                                id="player-name"
                                type="text"
                                placeholder="What should we call you?"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                onKeyDown={handleKeyPress}
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
                            type="button"
                            onClick={handleJoin}
                            disabled={isJoining || joinedCount >= maxPlayers || !playerId}
                            className="join-button"
                        >
                            <span>{!playerId ? 'Connecting…' : (isJoining ? 'Joining…' : 'Join the game')}</span>
                            {playerId && !isJoining && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </button>

                        {joinedCount >= maxPlayers && (
                            <p className="notice-banner">
                                Lobby is full ({maxPlayers}/{maxPlayers})
                            </p>
                        )}

                        <div className="quick-rules" aria-label="Game highlights">
                            <span><i>01</i> Place</span>
                            <span><i>02</i> Charge</span>
                            <span><i>03</i> Detonate</span>
                        </div>
                    </div>
                ) : (
                    <div className="joined-section">
                        <div className="players-section">
                            <div className="section-header">
                                <span>Players ready</span>
                                <strong>{joinedCount}<i>/</i>{maxPlayers}</strong>
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
                                                    {player.id === gameState.hostId ? 'Match host' : 'Ready to react'}
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
                                            <div className="player-orb empty-orb"></div>
                                        </div>
                                        <div className="player-info">
                                            <span className="player-name empty-name">Waiting…</span>
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
                                                type="button"
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
                                    type="button"
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
                            <div className="notice-banner waiting-host">
                                <span className="waiting-pulse" /> Waiting for the host to launch
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="lobby-footer">
                    <button type="button" className="icon-button" onClick={() => setShowRules(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        How to Play
                    </button>

                    <button type="button" className={`icon-button ${inviteCopied ? 'success' : ''}`} onClick={copyInviteLink}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        {inviteCopied ? 'Copied!' : 'Invite'}
                    </button>

                    {isInGame && (
                        <button type="button" className="icon-button danger" onClick={onLeave} aria-label="Leave lobby">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </button>
                    )}
                </div>

                {/* Rules Overlay */}
                {showRules && (
                    <div className="rules-overlay" role="dialog" aria-modal="true" aria-labelledby="rules-title">
                        <div className="rules-header">
                            <div><small>The essentials</small><span id="rules-title">How to play</span></div>
                            <button type="button" className="close-btn" onClick={() => setShowRules(false)} aria-label="Close rules">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <ul className="rules-list">
                            <li>
                                <div className="rule-icon">01</div>
                                <span><strong>Claim a cell</strong>Place atoms on empty cells or cells you already own.</span>
                            </li>
                            <li>
                                <div className="rule-icon">02</div>
                                <span><strong>Reach critical mass</strong>Every cell has a limit based on its neighbors.</span>
                            </li>
                            <li>
                                <div className="rule-icon">03</div>
                                <span><strong>Start a chain</strong>Explosions spread your color into neighboring cells.</span>
                            </li>
                            <li>
                                <div className="rule-icon">04</div>
                                <span><strong>Own the board</strong>Eliminate every opponent to win the match.</span>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
