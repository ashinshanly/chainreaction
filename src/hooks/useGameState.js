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

        // Timeout fallback
        timeoutId = setTimeout(async () => {
            console.warn('Firebase connection slow, attempting to initialize game state...');
            try {
                const initialState = {
                    status: 'WAITING',
                    players: [],
                    hostId: null,
                    hostJoinedAt: null,
                    grid: createEmptyGrid(),
                    turnIndex: 0,
                    winner: null,
                    maxPlayers: 4,
                    movesMade: 0,
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
                    hostJoinedAt: data.hostJoinedAt || ((data.players && data.players.length > 0) ? (data.lastUpdate || Date.now()) : null),
                    grid: normalizedGrid,
                    turnIndex: data.turnIndex || 0,
                    winner: data.winner || null,
                    maxPlayers: data.maxPlayers || 4,
                    movesMade: data.movesMade || 0,
                    lastUpdate: data.lastUpdate || Date.now()
                };
                setGameState(normalizedState);
            } else {
                const initialState = {
                    status: 'WAITING',
                    players: [],
                    hostId: null,
                    hostJoinedAt: null,
                    grid: createEmptyGrid(),
                    turnIndex: 0,
                    winner: null,
                    maxPlayers: 4,
                    movesMade: 0,
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

        set(presenceRef, { online: true, lastSeen: Date.now() });

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
                currentState = gameState || {
                    status: 'WAITING',
                    players: [],
                    hostId: null,
                    grid: createEmptyGrid(),
                    turnIndex: 0,
                    winner: null,
                    maxPlayers: 4,
                    movesMade: 0,
                    lastUpdate: Date.now()
                };
            }

            if (!currentState) {
                currentState = {
                    status: 'WAITING',
                    players: [],
                    hostId: null,
                    grid: createEmptyGrid(),
                    turnIndex: 0,
                    winner: null,
                    maxPlayers: 4,
                    movesMade: 0,
                    lastUpdate: Date.now()
                };
            }

            if (currentState.status !== 'WAITING') {
                console.error('Game not in WAITING state');
                return false;
            }

            const players = currentState.players || [];
            const maxPlayers = currentState.maxPlayers || 4;

            if (players.length >= maxPlayers) {
                console.error('Game is full');
                return false;
            }
            if (players.some(p => p.id === playerId)) {
                setPlayerName(name);
                return true;
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
                hostJoinedAt: currentState.hostJoinedAt || (players.length === 0 ? Date.now() : null),
                lastUpdate: Date.now()
            };

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
            hostJoinedAt: recoloredPlayers.length > 0 ? gameState.hostJoinedAt : null,
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
            movesMade: 0,
            lastUpdate: Date.now()
        };

        await set(gameRef, newState);
        return true;
    }, [playerId, gameState]);

    const [flyingAtoms, setFlyingAtoms] = useState([]);

    // Process chain reactions with animation delays and instant win check
    const processChainReaction = useCallback(async (grid, currentPlayerId, currentMovesMade) => {
        const gameRef = ref(db, GAME_PATH);
        let currentGrid = grid;

        while (hasExplosion(currentGrid)) {
            const { newGrid, explodedCells, hasMoreExplosions } = processExplosion(currentGrid, currentPlayerId);

            // 1. Trigger Source Explosion Animation
            setExplodingCells(explodedCells);

            // 2. Calculate Flights
            const flights = [];
            explodedCells.forEach(cell => {
                const owner = currentGrid[cell.row][cell.col].owner;
                const playerIndex = gameState.players.findIndex(p => p.id === owner);
                const safeIndex = playerIndex >= 0 ? playerIndex : 0;
                const color = PLAYER_COLORS[safeIndex]?.primary || '#fff';

                const neighbors = getNeighbors(cell.row, cell.col);
                neighbors.forEach(neighbor => {
                    flights.push({
                        id: Math.random(),
                        from: { row: cell.row, col: cell.col },
                        to: { row: neighbor.row, col: neighbor.col },
                        color: color
                    });
                });
            });

            setFlyingAtoms(flights);

            // 3. Wait for Flight Animation
            await new Promise(resolve => setTimeout(resolve, 400));

            // 4. Update Grid and Check for Winner Immediately
            const snapshot = await get(gameRef);
            const currentState = snapshot.val();

            const potentialWinner = getWinner(newGrid, gameState.players);
            const canCheckWin = (currentMovesMade || 0) >= gameState.players.length;

            const updates = {
                ...currentState,
                grid: newGrid,
                lastUpdate: Date.now()
            };

            let winnerFound = false;
            if (canCheckWin && potentialWinner) {
                updates.winner = potentialWinner.id;
                updates.status = 'FINISHED';
                updates.movesMade = currentMovesMade;
                winnerFound = true;
            }

            await set(gameRef, updates);

            currentGrid = newGrid;

            // 5. Cleanup Animation State
            setExplodingCells([]);
            setFlyingAtoms([]);

            if (winnerFound) {
                return currentGrid; // Stop processing further explosions if someone won
            }

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

            // Increment moves count
            const movesMade = (gameState.movesMade || 0) + 1;

            // Update Firebase immediately
            await set(gameRef, {
                ...gameState,
                grid: newGrid,
                // Do not update movesMade here yet? 
                // Actually it's safer to update it here so processChainReaction has consistent state if it reads/writes
                // But we pass it explicitly.
                // Let's rely on processChainReaction or final step to persist it?
                // Actually, if we don't persist it, and the user refreshes mid-animation...
                // Better to persist.
                movesMade: movesMade,
                lastUpdate: Date.now()
            });

            // Process chain reactions
            newGrid = await processChainReaction(newGrid, playerId, movesMade);

            // Check final state to see if it ended during chain reaction
            const finalSnapshot = await get(gameRef);
            let finalState = finalSnapshot.val();

            if (finalState.status === 'FINISHED') {
                // Already finished, do nothing
                return true;
            }

            // Fallback win check (in case no explosion happened, but somehow we won? Unlikely but consistent)
            // Or just normal turn switch
            let winner = null;
            let newStatus = 'PLAYING';

            if (movesMade >= gameState.players.length) {
                winner = getWinner(newGrid, gameState.players);
                if (winner) {
                    newStatus = 'FINISHED';
                }
            }

            let nextTurnIndex = gameState.turnIndex;

            if (newStatus !== 'FINISHED') {
                // Find next alive player
                nextTurnIndex = (gameState.turnIndex + 1) % gameState.players.length;
                let attempts = 0;
                while (attempts < gameState.players.length) {
                    const nextPlayer = gameState.players[nextTurnIndex];
                    const hasPlayed = newGrid.flat().some(cell => cell.owner === nextPlayer.id);
                    // Standard check: is eliminated?
                    if (!isPlayerEliminated(newGrid, nextPlayer.id)) {
                        // But also check if they have played yet? 
                        // No, if they haven't played, they have row/col atoms? No, empty grid.
                        // But we want to let them play if it's round 1.
                        // isPlayerEliminated returns TRUE if they have 0 atoms.
                        // BUT in round 1, everyone has 0 atoms.
                        // So isPlayerEliminated is bad for round 1.

                        // Fix: if we are in round 1 (movesMade < players.length), simply rotate.
                        // If movesMade >= players.length, then elimination logic applies.
                        break;
                    }

                    // If we are in round 1, we shouldn't skip anyone. 
                    // isPlayerEliminated returns true for empty board.
                    // We must allow them to play.
                    // The 'movesMade' helps here. If total moves < maxPlayers, assume everyone is alive.
                    if (movesMade < gameState.players.length) {
                        break;
                    }

                    nextTurnIndex = (nextTurnIndex + 1) % gameState.players.length;
                    attempts++;
                }
            }

            await set(gameRef, {
                ...finalState,
                grid: newGrid,
                turnIndex: nextTurnIndex,
                winner: winner?.id || null, // Will prefer existing winner if set
                status: newStatus,
                movesMade: movesMade,
                lastUpdate: Date.now()
            });

            return true;
        } finally {
            setIsProcessing(false);
        }
    }, [playerId, gameState, isProcessing, processChainReaction]);

    // Reset game
    const resetGame = useCallback(async () => {
        if (!gameState) return;

        console.log('Resetting game state in Firebase...');
        const gameRef = ref(db, GAME_PATH);

        const newState = {
            status: 'WAITING',
            players: [],
            hostId: null,
            hostJoinedAt: null,
            grid: createEmptyGrid(),
            turnIndex: 0,
            winner: null,
            maxPlayers: 4,
            movesMade: 0,
            lastUpdate: Date.now()
        };

        try {
            await set(gameRef, newState);
            setPlayerName('');
            setPlayerId(null);
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error('Failed to reset game:', error);
        }
    }, [gameState]);

    // Set max players
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
