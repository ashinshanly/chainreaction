import React, { useMemo } from 'react';
import { useGameState } from './hooks/useGameState';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { WinScreen } from './components/WinScreen';
import './App.css';

function App() {
  const ambientParticles = useMemo(() => Array.from({ length: 18 }, (_, index) => ({
    id: index,
    x: `${(index * 37 + 11) % 100}%`,
    y: `${(index * 61 + 7) % 100}%`,
    size: `${2 + (index % 4)}px`,
    duration: `${14 + (index % 7) * 2}s`,
    delay: `${-(index % 9) * 1.7}s`
  })), []);

  const {
    gameState,
    playerId,
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
  } = useGameState();

  if (!gameState) {
    return (
      <div className="app loading">
        <div className="loader">
          <div className="loader-atom"></div>
          <div className="loader-atom"></div>
          <div className="loader-atom"></div>
        </div>
        <p>{connectionError ? `Connection error: ${connectionError}` : 'Connecting to game server...'}</p>
        {connectionError && (
            <button
              type="button"
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Retry Connection
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <div className="background-effects">
        <div className="bg-gradient"></div>
        <div className="bg-grid"></div>
        <div className="bg-particles">
          {ambientParticles.map((particle) => (
            <div
              key={particle.id}
              className="particle"
              style={{
                '--x': particle.x,
                '--y': particle.y,
                '--size': particle.size,
                '--duration': particle.duration,
                '--delay': particle.delay
              }}
            />
          ))}
        </div>
      </div>

      <div className="app-content">
        {gameState.status === 'WAITING' && (
          <Lobby
            gameState={gameState}
            playerId={playerId}
            isHost={isHost}
            isInGame={isInGame}
            onJoin={joinGame}
            onLeave={leaveGame}
            onStart={startGame}
            onSetMaxPlayers={setMaxPlayers}
            onReset={resetGame}
            connectionError={connectionError}
          />
        )}

        {gameState.status === 'PLAYING' && (
          <GameBoard
            gameState={gameState}
            playerId={playerId}
            isMyTurn={isMyTurn}
            isProcessing={isProcessing}
            explodingCells={explodingCells}
            flyingAtoms={flyingAtoms}
            onCellClick={makeMove}
            onEndGame={resetGame}
            isHost={isHost}
            isSpectator={!isInGame}
          />
        )}

        {gameState.status === 'FINISHED' && (
          <WinScreen
            winner={gameState.winner}
            players={gameState.players}
            onPlayAgain={resetGame}
          />
        )}
      </div>
    </div>
  );
}

export default App;
