import React from 'react';
import { Cell } from './Cell';
import { FlyingAtoms } from './FlyingAtoms';
import { PLAYER_COLORS, GRID_ROWS, GRID_COLS, isPlayerEliminated } from '../utils/gameLogic';
import './GameBoard.css';

export function GameBoard({
    gameState,
    playerId,
    isMyTurn,
    isProcessing,
    explodingCells,
    flyingAtoms,
    onCellClick,
    onEndGame,
    isSpectator,
}) {
    const { grid, players, turnIndex } = gameState;
    const currentPlayer = players[turnIndex] || players[0];
    const [showResetConfirm, setShowResetConfirm] = React.useState(false);

    const playerColorMap = Object.fromEntries(players.map(player => [player.id, player.colorIndex]));
    const enhancedGrid = grid.map(row => row.map(cell => ({
        ...cell,
        colorIndex: cell.owner ? playerColorMap[cell.owner] : null
    })));

    const currentColor = PLAYER_COLORS[currentPlayer?.colorIndex ?? turnIndex] || PLAYER_COLORS[0];
    const movesMade = gameState.movesMade || 0;
    const round = Math.floor(movesMade / Math.max(players.length, 1)) + 1;
    const boardLocked = isProcessing || explodingCells.length > 0;
    const atomTotals = players.reduce((totals, player) => {
        totals[player.id] = grid.flat().reduce(
            (sum, cell) => sum + (cell.owner === player.id ? cell.count : 0),
            0
        );
        return totals;
    }, {});

    const isExploding = (row, col) => explodingCells.some(cell => cell.row === row && cell.col === col);
    const canPlaceAt = (row, col) => {
        const cell = grid[row][col];
        return cell.owner === null || cell.owner === playerId;
    };

    const statusLabel = isSpectator
        ? `Spectating ${currentPlayer?.name || 'the game'}`
        : boardLocked
            ? 'Reaction in progress'
            : isMyTurn
                ? 'Your move'
                : `${currentPlayer?.name || 'Opponent'} is playing`;

    return (
        <main
            className={`game-board-container ${isMyTurn && !boardLocked ? 'is-my-turn' : ''}`}
            style={{ '--turn-color': currentColor.primary, '--turn-glow': currentColor.glow }}
        >
            <header className="game-hud">
                <div className="hud-brand" aria-label="Chain Reaction">
                    <span className="hud-brand-mark"><i /><i /><i /></span>
                    <span>Chain <strong>Reaction</strong></span>
                </div>

                <div className="round-pill">
                    <span>Round</span>
                    <strong>{round.toString().padStart(2, '0')}</strong>
                </div>

                <div className="hud-controls">
                    {showResetConfirm ? (
                        <div className="reset-confirm" role="group" aria-label="Confirm game reset">
                            <span>End match?</span>
                            <button type="button" className="confirm-btn yes" onClick={() => {
                                onEndGame();
                                setShowResetConfirm(false);
                            }}>End</button>
                            <button type="button" className="confirm-btn no" onClick={() => setShowResetConfirm(false)}>Keep</button>
                        </div>
                    ) : (
                        <button type="button" className="hud-end-btn" onClick={() => setShowResetConfirm(true)} aria-label="End match">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M10 2h4M12 2v10" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>End</span>
                        </button>
                    )}
                </div>
            </header>

            <section className="turn-banner" aria-live="polite">
                <div className="turn-copy">
                    <span className="turn-kicker">{isSpectator ? 'Live match' : boardLocked ? 'Chain reaction' : 'Current turn'}</span>
                    <div className="turn-title-row">
                        <span className={`turn-orb ${boardLocked ? 'processing' : ''}`} />
                        <h1>{statusLabel}</h1>
                    </div>
                </div>
                <p>{isMyTurn && !boardLocked ? 'Choose an empty cell or reinforce your color.' : boardLocked ? 'Watch the energy travel across the board.' : 'Your cells are safe until your next move.'}</p>
            </section>

            <section className="game-stage">
                <div className="hud-players" aria-label="Players">
                    {players.map((player) => {
                        const color = PLAYER_COLORS[player.colorIndex] || PLAYER_COLORS[0];
                        const isEliminated = movesMade >= players.length && isPlayerEliminated(grid, player.id);
                        const isActive = player.id === currentPlayer?.id;

                        return (
                            <div
                                key={player.id}
                                className={`hud-player ${isActive ? 'active' : ''} ${isEliminated ? 'eliminated' : ''}`}
                                style={{ '--p-color': color.primary, '--p-glow': color.glow }}
                            >
                                <span className="hud-orb" />
                                <span className="hud-player-copy">
                                    <span className="hud-name">{player.id === playerId ? 'You' : player.name}</span>
                                    <small>{isEliminated ? 'Eliminated' : `${atomTotals[player.id]} atoms`}</small>
                                </span>
                                {isActive && !isEliminated && <span className="active-label">Playing</span>}
                            </div>
                        );
                    })}
                </div>

                <div className="game-grid-wrapper">
                    <div className="board-aura" aria-hidden="true" />
                    <div className="game-grid" style={{ '--grid-cols': GRID_COLS, '--grid-rows': GRID_ROWS }}>
                        {enhancedGrid.flatMap((row, rowIndex) => row.map((cell, colIndex) => (
                            <Cell
                                key={`${rowIndex}-${colIndex}`}
                                row={rowIndex}
                                col={colIndex}
                                cell={cell}
                                isExploding={isExploding(rowIndex, colIndex)}
                                isMyTurn={isMyTurn && !boardLocked && !isSpectator}
                                canPlace={canPlaceAt(rowIndex, colIndex)}
                                onClick={onCellClick}
                            />
                        )))}
                        <FlyingAtoms atoms={flyingAtoms} />
                    </div>
                </div>
            </section>

            <footer className="game-status-bar">
                <span className="status-dot" />
                <span>{statusLabel}</span>
                {!isSpectator && <kbd>Tap a cell</kbd>}
            </footer>
        </main>
    );
}
