import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../config/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set, get, onDisconnect, serverTimestamp } from 'firebase/database';
import {
    createEmptyGrid,
    placeAtom,
    processExplosion,
    hasExplosion,
    getWinner,
    isPlayerEliminated,
    generatePlayerId,
    getNeighbors,
    PLAYER_COLORS
} from '../utils/gameLogic';

const GAME_PATH = 'chainreaction/game_test_3';

export function useGameState() {
    const [gameState, setGameState] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [playerName, setPlayerName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [explodingCells, setExplodingCells] = useState([]);
    const [connectionError, setConnectionError] = useState(null);

    // Initialize player ID from Firebase Auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setPlayerId(user.uid);
            } else {
                signInAnonymously(auth).catch((error) => {
                    console.error("Error signing in anonymously:", error);
                    setConnectionError(error.message);
                });
            }
        });

        return () => unsubscribe();
    }, []);

    // Subscribe to game state changes with error handling
    useEffect(() => {
        const gameRef = ref(db, GAME_PATH);
        let timeoutId;

        // Timeout fallback - if no response in 10 seconds, try to initialize
        timeoutId = setTimeout(async () => {
            console.warn('Firebase connection slow, attempting to initialize game state...');
            try {
                const initialState = {
                    status: 'WAITING',
                    players: [],
                    hostId: null,
                    grid: createEmptyGrid(),
                    turnIndex: 0,
                    winner: null,
                    maxPlayers: 4,
                    lastUpdate: Date.now()
                };
                await set(gameRef, initialState);
                setGameState(initialState);
            } catch (error) {
                console.error('Failed to initialize game state:', error);
                setConnectionError(error.message);
            }
        }, 10000);

        const unsubscribe = onValue(gameRef, (snapshot) => {
            clearTimeout(timeoutId);
            const data = snapshot.val();
            console.log('Firebase data received:', data);
            if (data) {
                // Normalize data and ensure grid cells have proper defaults (Firebase strips nulls)
                const rawGrid = data.grid || createEmptyGrid();
                const normalizedGrid = rawGrid.map(row =>
                    (row || []).map(cell => ({
                        owner: cell?.owner || null,
                        count: cell?.count || 0
                    }))
                );

                const normalizedState = {
                    status: data.status || 'WAITING',
                    players: data.players || [],
                    hostId: data.hostId || null,
                    grid: normalizedGrid,
                    turnIndex: data.turnIndex || 0,
                    winner: data.winner || null,
                    maxPlayers: data.maxPlayers || 4,
                    lastUpdate: data.lastUpdate || Date.now()
                };
                setGameState(normalizedState);
            } else {
                // Initialize empty game state
                const initialState = {
                    status: 'WAITING',
                    players: [],
                    hostId: null,
                    grid: createEmptyGrid(),
                    turnIndex: 0,
                    winner: null,
                    maxPlayers: 4,
                    lastUpdate: Date.now()
                };
                set(gameRef, initialState).catch(err => {
                    console.error('Failed to set initial state:', err);
                    setConnectionError(err.message);
                });
                setGameState(initialState);
            }
        }, (error) => {
            clearTimeout(timeoutId);
            console.error('Firebase onValue error:', error);
            setConnectionError(error.message);
        });

        return () => {
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, []);

    // Set up disconnect handler for player
    useEffect(() => {
        if (!playerId || !gameState?.players?.some(p => p.id === playerId)) return;

        const playerRef = ref(db, `${GAME_PATH}/players`);
        const presenceRef = ref(db, `chainreaction/presence/${playerId}`);

        // Mark player as present
        set(presenceRef, { online: true, lastSeen: Date.now() });

        // Remove player on disconnect
        const disconnectRef = onDisconnect(presenceRef);
        disconnectRef.remove();

        return () => {
            disconnectRef.cancel();
        };
    }, [playerId, gameState?.players]);

    // Join the game
    const joinGame = useCallback(async (name) => {
        if (!playerId || !name.trim()) return false;

        try {
            const gameRef = ref(db, GAME_PATH);
            // Add timeout for get operation
            const snapshotPromise = get(gameRef);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Network timeout')), 5000)
            );

            let currentState;
            try {
                const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);
                currentState = snapshot.val();
            } catch (err) {
                console.error('Connection timed out:', err);
                // If get fails/times out but we have local state, try to use that or init
                currentState = gameState || {
                    status: 'WAITING',
                    players: [],
                    hostId: null,
                    grid: createEmptyGrid(),
                    turnIndex: 0,
                    winner: null,
                    maxPlayers: 4,
                    lastUpdate: Date.now()
                };
            }

            // Handle missing state by acting as if it's new
            if (!currentState) {
                currentState = {
                    status: 'WAITING',
                    players: [],
                    hostId: null,
                    grid: createEmptyGrid(),
                    turnIndex: 0,
                    winner: null,
                    maxPlayers: 4,
                    lastUpdate: Date.now()
                };
            }

            if (currentState.status !== 'WAITING') {
                console.error('Game not in WAITING state');
                return false;
            }

            // Ensure players array exists
            const players = currentState.players || [];
            const maxPlayers = currentState.maxPlayers || 4;

            if (players.length >= maxPlayers) {
                console.error('Game is full');
                return false;
            }
            if (players.some(p => p.id === playerId)) {
                setPlayerName(name);
                return true; // Already joined
            }

            const colorIndex = players.length;
            const newPlayer = {
                id: playerId,
                name: name.trim(),
                color: PLAYER_COLORS[colorIndex].primary,
                colorIndex
            };

            const newPlayers = [...players, newPlayer];
            const newState = {
                ...currentState,
                players: newPlayers,
                hostId: currentState.hostId || playerId,
                lastUpdate: Date.now()
            };

            // Add timeout for set operation
            const setPromise = set(gameRef, newState);
            const setTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Network timeout during write')), 5000)
            );
            await Promise.race([setPromise, setTimeoutPromise]);

            setPlayerName(name);
            return true;
        } catch (error) {
            console.error('Error joining game:', error);
            return false;
        }
    }, [playerId]);

    // Leave the game
    const leaveGame = useCallback(async () => {
        if (!playerId || !gameState) return;

        const gameRef = ref(db, GAME_PATH);
        const newPlayers = gameState.players.filter(p => p.id !== playerId);

        // Reassign colors to remaining players
        const recoloredPlayers = newPlayers.map((player, index) => ({
            ...player,
            color: PLAYER_COLORS[index].primary,
            colorIndex: index
        }));

        const newHostId = recoloredPlayers.length > 0 ? recoloredPlayers[0].id : null;

        const newState = {
            ...gameState,
            players: recoloredPlayers,
            hostId: newHostId,
            lastUpdate: Date.now()
        };

        await set(gameRef, newState);
        setPlayerName('');
    }, [playerId, gameState]);

    // Start the game (host only)
    const startGame = useCallback(async () => {
        if (!playerId || !gameState) return false;
        if (gameState.hostId !== playerId) return false;
        if (gameState.players.length < 1) return false;

        const gameRef = ref(db, GAME_PATH);
        const newState = {
            ...gameState,
            status: 'PLAYING',
            grid: createEmptyGrid(),
            turnIndex: 0,
            winner: null,
            lastUpdate: Date.now()
        };

        await set(gameRef, newState);
        return true;
    }, [playerId, gameState]);

    const [flyingAtoms, setFlyingAtoms] = useState([]);

    // Process chain reactions with animation delays
    const processChainReaction = useCallback(async (grid, currentPlayerId) => {
        const gameRef = ref(db, GAME_PATH);
        let currentGrid = grid;

        while (hasExplosion(currentGrid)) {
            const { newGrid, explodedCells, hasMoreExplosions } = processExplosion(currentGrid, currentPlayerId);

            // 1. Trigger Source Explosion Animation
            setExplodingCells(explodedCells);

            // 2. Calculate Flights (Atoms moving to neighbors)
            const flights = [];
            explodedCells.forEach(cell => {
                const owner = currentGrid[cell.row][cell.col].owner; // Get color of exploding cell
                // Find color index for this owner
                const playerIndex = gameState.players.findIndex(p => p.id === owner) || 0;
                const color = PLAYER_COLORS[playerIndex]?.primary || '#fff';

                const neighbors = getNeighbors(cell.row, cell.col);
                neighbors.forEach(neighbor => {
                    flights.push({
                        id: Math.random(), // Unique anim key
                        from: { row: cell.row, col: cell.col },
                        to: { row: neighbor.row, col: neighbor.col },
                        color: color
                    });
                });
            });

            setFlyingAtoms(flights);

            // 3. Wait for Flight Animation
            // (Explosion expand: 0.1s) + (Flight: 0.3s)
            await new Promise(resolve => setTimeout(resolve, 350));

            // 4. Update Grid with results (Landed atoms)
            const snapshot = await get(gameRef);
            const currentState = snapshot.val();
            await set(gameRef, {
                ...currentState,
                grid: newGrid,
                lastUpdate: Date.now()
            });

            currentGrid = newGrid;

            // 5. Cleanup Animation State
            setExplodingCells([]);
            setFlyingAtoms([]);

            // Brief pause before next wave to let things settle
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!hasMoreExplosions) break;
        }

        return currentGrid;
    }, [gameState]);

    // Make a move
    const makeMove = useCallback(async (row, col) => {
        if (!playerId || !gameState || isProcessing) return false;
        if (gameState.status !== 'PLAYING') return false;

        const currentPlayer = gameState.players[gameState.turnIndex];
        if (currentPlayer.id !== playerId) return false;

        const cell = gameState.grid[row][col];
        if (cell.owner !== null && cell.owner !== playerId) return false;

        setIsProcessing(true);

        try {
            const gameRef = ref(db, GAME_PATH);

            // Place the atom
            let newGrid = placeAtom(gameState.grid, row, col, playerId);

            // Update Firebase immediately for placement animation
            await set(gameRef, {
                ...gameState,
                grid: newGrid,
                lastUpdate: Date.now()
            });

            // Process chain reactions
            newGrid = await processChainReaction(newGrid, playerId);

            // Check for winner (only after all players have played at least once)
            let winner = null;
            let newStatus = 'PLAYING';

            // Calculate total moves made by all players
            const movesMap = new Set();
            newGrid.forEach(row =>
                row.forEach(cell => {
                    if (cell.owner) movesMap.add(cell.owner);
                })
            );

            // Only check for winner if we are past the first round 
            // OR if all players have placed at least one atom
            const totalPlayers = gameState.players.length;
            const uniqueOwners = movesMap.size;

            // We need a better heuristic: allow win check only after turnIndex ensures everyone had a chance
            // OR if the game has been running for a bit. 
            // Simple fix: Don't check winner until everyone has made at least 1 move.
            // Tracking total turns is safer. Let's assume we add a 'totalTurns' counter to gameState.
            // For now, heuristic: unique owners must be > 1 at some point. 
            // If unique owners drops to 1 AND we have had enough turns, then win.

            // Quick fix: Only check winner if the current player is NOT the first player 
            // OR if total moves on board > players.length
            const totalAtoms = newGrid.flat().reduce((sum, cell) => sum + cell.count, 0);

            if (totalAtoms > totalPlayers) {
                winner = getWinner(newGrid, gameState.players);
                if (winner) {
                    newStatus = 'FINISHED';
                }
            }

            // Find next alive player
            let nextTurnIndex = (gameState.turnIndex + 1) % gameState.players.length;
            let attempts = 0;
            while (attempts < gameState.players.length) {
                const nextPlayer = gameState.players[nextTurnIndex];
                // In first round, all players get a turn. After that, skip eliminated players
                const hasPlayed = newGrid.flat().some(cell => cell.owner === nextPlayer.id);
                if (!hasPlayed || !isPlayerEliminated(newGrid, nextPlayer.id)) {
                    break;
                }
                nextTurnIndex = (nextTurnIndex + 1) % gameState.players.length;
                attempts++;
            }

            // Final state update
            const finalSnapshot = await get(gameRef);
            const finalState = finalSnapshot.val();
            await set(gameRef, {
                ...finalState,
                grid: newGrid,
                turnIndex: nextTurnIndex,
                winner: winner?.id || null,
                status: newStatus,
                lastUpdate: Date.now()
            });

            return true;
        } finally {
            setIsProcessing(false);
        }
    }, [playerId, gameState, isProcessing, processChainReaction]);

    // Reset game to lobby - completely fresh start
    const resetGame = useCallback(async () => {
        if (!gameState) return;

        console.log('Resetting game state in Firebase...');
        const gameRef = ref(db, GAME_PATH);

        // Wipe everything clean
        const newState = {
            status: 'WAITING',
            players: [], // Remove all players so they must rejoin
            hostId: null,
            grid: createEmptyGrid(),
            turnIndex: 0,
            winner: null,
            maxPlayers: 4,
            lastUpdate: Date.now()
        };

        try {
            await set(gameRef, newState);
            // Clear local state
            setPlayerName('');
            setPlayerId(null); // Force re-auth or re-join flow

            // Give Firebase a moment to propagate to other clients before we nuke the local session
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error('Failed to reset game:', error);
        }
    }, [gameState]);

    // Set max players (host only)
    const setMaxPlayers = useCallback(async (count) => {
        if (!gameState || !playerId) return false;
        if (gameState.hostId !== playerId) return false;
        if (gameState.status !== 'WAITING') return false;
        if (count < 2 || count > 4) return false;

        try {
            const gameRef = ref(db, GAME_PATH);
            await set(gameRef, {
                ...gameState,
                maxPlayers: count,
                lastUpdate: Date.now()
            });
            return true;
        } catch (error) {
            console.error('Error setting max players:', error);
            return false;
        }
    }, [playerId, gameState]);

    // Get current player info
    const currentPlayer = gameState?.players?.[gameState?.turnIndex];
    const myPlayer = gameState?.players?.find(p => p.id === playerId);
    const isMyTurn = currentPlayer?.id === playerId;
    const isHost = gameState?.hostId === playerId;
    const isInGame = gameState?.players?.some(p => p.id === playerId);

    return {
        gameState,
        playerId,
        playerName,
        myPlayer,
        currentPlayer,
        isMyTurn,
        isHost,
        isInGame,
        isProcessing,
        explodingCells,
        flyingAtoms,
        connectionError,
        joinGame,
        leaveGame,
        startGame,
        makeMove,
        resetGame,
        setMaxPlayers
    };
}
