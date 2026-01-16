// Grid dimensions
export const GRID_ROWS = 9;
export const GRID_COLS = 6;

// Player colors with neon glow
export const PLAYER_COLORS = [
    { primary: '#ff4444', glow: 'rgba(255, 68, 68, 0.6)', name: 'Red' },
    { primary: '#44ff44', glow: 'rgba(68, 255, 68, 0.6)', name: 'Green' },
    { primary: '#4488ff', glow: 'rgba(68, 136, 255, 0.6)', name: 'Blue' },
    { primary: '#ff8844', glow: 'rgba(255, 136, 68, 0.6)', name: 'Orange' }
];

/**
 * Calculate critical mass for a cell based on its position
 * Corners: 2, Edges: 3, Center: 4
 */
export function getCriticalMass(row, col) {
    const isTop = row === 0;
    const isBottom = row === GRID_ROWS - 1;
    const isLeft = col === 0;
    const isRight = col === GRID_COLS - 1;

    const edgeCount = [isTop, isBottom, isLeft, isRight].filter(Boolean).length;

    if (edgeCount === 2) return 2; // Corner
    if (edgeCount === 1) return 3; // Edge
    return 4; // Center
}

/**
 * Get neighboring cell coordinates
 */
export function getNeighbors(row, col) {
    const neighbors = [];
    if (row > 0) neighbors.push({ row: row - 1, col });
    if (row < GRID_ROWS - 1) neighbors.push({ row: row + 1, col });
    if (col > 0) neighbors.push({ row, col: col - 1 });
    if (col < GRID_COLS - 1) neighbors.push({ row, col: col + 1 });
    return neighbors;
}

/**
 * Create initial empty grid
 */
export function createEmptyGrid() {
    return Array(GRID_ROWS).fill(null).map(() =>
        Array(GRID_COLS).fill(null).map(() => ({ owner: null, count: 0 }))
    );
}

/**
 * Deep clone the grid
 */
export function cloneGrid(grid) {
    return grid.map(row => row.map(cell => ({ ...cell })));
}

/**
 * Check if a player is eliminated (has no atoms on the board)
 */
export function isPlayerEliminated(grid, playerId) {
    for (let row of grid) {
        for (let cell of row) {
            if (cell.owner === playerId && cell.count > 0) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Count alive players (players with at least one atom)
 */
export function countAlivePlayers(grid, players) {
    return players.filter(player => !isPlayerEliminated(grid, player.id)).length;
}

/**
 * Get the winner if only one player remains
 */
export function getWinner(grid, players) {
    const alivePlayers = players.filter(player => !isPlayerEliminated(grid, player.id));
    if (alivePlayers.length === 1) {
        return alivePlayers[0];
    }
    return null;
}

/**
 * Check if a move is valid
 * - Cell must be empty or owned by the current player
 */
export function isValidMove(grid, row, col, playerId) {
    const cell = grid[row][col];
    return cell.owner === null || cell.owner === playerId;
}

/**
 * Process a single explosion step (chain reaction)
 * Returns { newGrid, explodedCells, hasMoreExplosions }
 */
export function processExplosion(grid, currentPlayerId) {
    const newGrid = cloneGrid(grid);
    const explodedCells = [];
    let hasMoreExplosions = false;

    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const cell = newGrid[row][col];
            const criticalMass = getCriticalMass(row, col);

            if (cell.count >= criticalMass) {
                explodedCells.push({ row, col });
                const neighbors = getNeighbors(row, col);

                // Explode: remove atoms from current cell
                newGrid[row][col] = { owner: null, count: 0 };

                // Add atoms to neighbors and convert them
                for (const neighbor of neighbors) {
                    const neighborCell = newGrid[neighbor.row][neighbor.col];
                    newGrid[neighbor.row][neighbor.col] = {
                        owner: currentPlayerId,
                        count: neighborCell.count + 1
                    };

                    // Check if neighbor will explode
                    if (newGrid[neighbor.row][neighbor.col].count >= getCriticalMass(neighbor.row, neighbor.col)) {
                        hasMoreExplosions = true;
                    }
                }
            }
        }
    }

    return { newGrid, explodedCells, hasMoreExplosions };
}

/**
 * Place an atom on the grid
 * Returns the new grid state (before explosions)
 */
export function placeAtom(grid, row, col, playerId) {
    const newGrid = cloneGrid(grid);
    const cell = newGrid[row][col];

    newGrid[row][col] = {
        owner: playerId,
        count: cell.count + 1
    };

    return newGrid;
}

/**
 * Check if any cell will explode
 */
export function hasExplosion(grid) {
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const cell = grid[row][col];
            if (cell.count >= getCriticalMass(row, col)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Generate a unique player ID
 */
export function generatePlayerId() {
    return Math.random().toString(36).substr(2, 9);
}
