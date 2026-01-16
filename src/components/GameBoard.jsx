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
}) {
    const { grid, players, turnIndex } = gameState;
    const currentPlayer = players[turnIndex];

    // Create a map of player ID to color index
    const playerColorMap = {};
    players.forEach(player => {
        playerColorMap[player.id] = player.colorIndex;
    });

    // Enhance grid with color information
    const enhancedGrid = grid.map(row =>
        row.map(cell => ({
            ...cell,
            colorIndex: cell.owner ? playerColorMap[cell.owner] : null
        }))
    );

    const [showResetConfirm, setShowResetConfirm] = React.useState(false);

    const isExploding = (row, col) => {
        return explodingCells.some(c => c.row === row && c.col === col);
    };

    const canPlaceAt = (row, col) => {
        const cell = grid[row][col];
        return cell.owner === null || cell.owner === playerId;
    };

    return (
        <div className="game-board-container">
            {/* Top HUD: Minimalist & Sleek */}
            <div className="game-hud">
                <div className="hud-players">
                    {players.map((player, index) => {
                        // Check if eliminated (only after game has really started)
                        const movesMade = gameState.movesMade || 0;
                        const isEliminated = movesMade >= players.length && isPlayerEliminated(grid, player.id);

                        return (
                            <div
                                key={player.id}
                                className={`hud-player ${player.id === currentPlayer.id ? 'active' : ''} ${isEliminated ? 'eliminated' : ''}`}
                                style={{
                                    '--p-color': PLAYER_COLORS[index].primary,
                                    '--p-glow': PLAYER_COLORS[index].glow
                                }}
                            >
                                <div className="hud-orb"></div>
                                <span className="hud-name">
                                    {player.name}
                                    {isEliminated && <small> (Out)</small>}
                                    {player.id === playerId && <small> (You)</small>}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="hud-controls">
                    {showResetConfirm ? (
                        <div className="reset-confirm">
                            <span>End Game?</span>
                            <button
                                className="confirm-btn yes"
                                onClick={() => {
                                    onEndGame();
                                    setShowResetConfirm(false);
                                }}
                            >
                                ✓
                            </button>
                            <button
                                className="confirm-btn no"
                                onClick={() => setShowResetConfirm(false)}
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button
                            className="hud-end-btn"
                            onClick={() => setShowResetConfirm(true)}
                            title="End Game"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M10 2h4M12 2v10" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="btn-label">Reset</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="game-grid-wrapper">
                <div
                    className="game-grid"
                    style={{
                        '--grid-cols': GRID_COLS,
                        '--grid-rows': GRID_ROWS
                    }}
                >
                    {enhancedGrid.map((row, rowIndex) => (
                        row.map((cell, colIndex) => (
                            <Cell
                                key={`${rowIndex}-${colIndex}`}
                                row={rowIndex}
                                col={colIndex}
                                cell={cell}
                                isExploding={isExploding(rowIndex, colIndex)}
                                isMyTurn={isMyTurn && !isProcessing}
                                canPlace={canPlaceAt(rowIndex, colIndex)}
                                onClick={onCellClick}
                            />
                        ))
                    ))}
                    <FlyingAtoms atoms={flyingAtoms} />
                </div>
            </div>

            {/* Subtle Status Bar */}
            <div className="game-status-bar">
                {isMyTurn && !isProcessing ? (
                    <span className="your-turn-msg">Your Turn</span>
                ) : (
                    <span className="waiting-msg">
                        {isProcessing ? 'Thinking...' : `${currentPlayer.name}'s turn`}
                    </span>
                )}
            </div>
        </div>
    );
}
