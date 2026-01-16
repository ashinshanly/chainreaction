import React from 'react';
import { useGameState } from './hooks/useGameState';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { WinScreen } from './components/WinScreen';
import './App.css';

function App() {
  const {
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
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: 'rgba(68, 136, 255, 0.3)',
              border: '1px solid rgba(68, 136, 255, 0.5)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
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
        <div className="bg-particles">
          {Array(20).fill(null).map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                '--x': `${Math.random() * 100}%`,
                '--y': `${Math.random() * 100}%`,
                '--size': `${2 + Math.random() * 4}px`,
                '--duration': `${10 + Math.random() * 20}s`,
                '--delay': `${Math.random() * 10}s`
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
            playerName={playerName}
            isHost={isHost}
            isInGame={isInGame}
            onJoin={joinGame}
            onLeave={leaveGame}
            onStart={startGame}
            onSetMaxPlayers={setMaxPlayers}
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
