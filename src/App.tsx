import React, { useState, useCallback, useEffect } from 'react';
import { ChessBoard } from './components/ChessBoard';
import { GameInfo } from './components/GameInfo';
import { GameRulesLegend } from './components/GameRulesLegend';
import { GameState, Position, Move } from './types/chess';
import {
  createInitialGameState,
  makeMove,
  shrinkBoard,
  respawnPiece,
  checkGameOver,
  getComputerMove,
  processGameMechanics,
  processPostMoveEffects
} from './utils/gameLogic';
import { generateShrinkBlocks } from './utils/shrinkLogic';
import { getAllPossibleMoves, getLegalMoves, isInCheck } from './utils/chessLogic';
import { getPowerUpDescription, collectPowerUp, usePowerUp } from './utils/powerupLogic';
import { useGameTimer } from './hooks/useGameTimer';
import { RotateCcw, Play, Zap, Shield, Bolt, Target, ArrowRight } from 'lucide-react';

function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [eventMessages, setEventMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [showRulesLegend, setShowRulesLegend] = useState(false);
  const [showPowerupInstructions, setShowPowerupInstructions] = useState<string | null>(null);
  const [lastShownMessages, setLastShownMessages] = useState<Set<string>>(new Set());

  const triggerScreenShake = useCallback(() => {
    setIsScreenShaking(true);
    setTimeout(() => setIsScreenShaking(false), 500);
  }, []);

  const showEventMessage = useCallback((message: string) => {
    // Prevent duplicate messages from spamming
    if (lastShownMessages.has(message)) {
      return;
    }
    
    setLastShownMessages(prev => new Set([...prev, message]));
    setMessageQueue(prev => [...prev, message]);
    
    // Clear message from spam prevention after 5 seconds
    setTimeout(() => {
      setLastShownMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(message);
        return newSet;
      });
    }, 5000);
  }, [lastShownMessages]);

  // Process message queue to show one message at a time
  useEffect(() => {
    if (!currentMessage && messageQueue.length > 0) {
      const nextMessage = messageQueue[0];
      setCurrentMessage(nextMessage);
      setMessageQueue(prev => prev.slice(1));
      
      // Remove message after 2 seconds
      setTimeout(() => {
        setCurrentMessage(null);
      }, 2000);
    }
  }, [currentMessage, messageQueue]);

  const handleShrink = useCallback(() => {
    setGameState((prevState: GameState) => {
      // Only shrink every 20 turns
      if (prevState.turnCount % 20 === 0 && prevState.turnCount > 0) {
        return shrinkBoard(prevState);
      }
      return prevState;
    });
  }, []);

  const handleRespawn = useCallback(() => {
    setGameState((prevState: GameState) => {
      // Only respawn every 15 turns
      if (prevState.turnCount % 15 === 0 && prevState.turnCount > 0) {
        return respawnPiece(prevState);
      }
      return prevState;
    });
  }, []);

  const handleTimerTick = useCallback(() => {
    // Remove time-based processing - everything is now turn-based
  }, []);

  const handleShrinkAndRespawn = useCallback((gameState: GameState) => {
    let newState = gameState;
    
    // Check for shrinking every 20 turns
    if (newState.turnCount % 20 === 0 && newState.turnCount > 0) {
      newState = shrinkBoard(newState);
    }
    
    // Check for respawning every 15 turns
    if (newState.turnCount % 15 === 0 && newState.turnCount > 0) {
      newState = respawnPiece(newState);
    }
    
    return newState;
  }, []);

  // Removed time-based timer - everything is now turn-based

  // Computer move logic
  useEffect(() => {
    if (gameState.currentPlayer === 'black' && gameState.gamePhase === 'playing') {
      const timer = setTimeout(() => {
        const computerMove = getComputerMove(gameState);
        if (computerMove) {
          const newGameState = makeMove(gameState, computerMove);
          const checkedGameState = checkGameOver(newGameState);
          
          // Process turn-based mechanics after computer move
          const processedState = processGameMechanics(checkedGameState);
          
          // Process post-move effects using dedicated hooks
          const { newGameState: finalState, events } = processPostMoveEffects(processedState, triggerScreenShake);
          
          // Show event messages
          events.forEach(event => showEventMessage(event));
          
          // Show turn message
          showEventMessage("YOUR TURN!");
          
          setGameState(finalState);
        } else {
          // If no valid move, switch to white player to prevent getting stuck
          console.log('No valid computer move, switching to white player');
          setGameState(prevState => ({
            ...prevState,
            currentPlayer: 'white'
          }));
        }
      }, 1500); // Increased timeout to 1.5 seconds

      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handleSquareClick = useCallback((position: Position) => {
    console.log('Square clicked:', position, 'Current player:', gameState.currentPlayer, 'Game phase:', gameState.gamePhase);
    if (gameState.gamePhase !== 'playing' || gameState.currentPlayer !== 'white') return;

    const piece = gameState.board[position.row][position.col];

    // If no square selected, select this square if it has a white piece
    if (!selectedSquare) {
      if (piece && piece.color === 'white') {
        setSelectedSquare(position);
        const moves = getLegalMoves(gameState.board, 'white', gameState.shrunkSquares)
          .filter(move => move.from.row === position.row && move.from.col === position.col)
          .map(move => move.to);
        setValidMoves(moves);
      }
      return;
    }

    // If clicking the same square, deselect
    if (selectedSquare.row === position.row && selectedSquare.col === position.col) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // If clicking a valid move square, make the move
    const isValidMoveSquare = validMoves.some(
      move => move.row === position.row && move.col === position.col
    );

    console.log('Valid moves:', validMoves, 'Is valid move:', isValidMoveSquare);

    if (isValidMoveSquare) {
      const selectedPiece = gameState.board[selectedSquare.row][selectedSquare.col];
      if (selectedPiece) {
        // Check if moving to a powerup square
        const powerUpOnSquare = gameState.powerUps.find(
          p => p.position.row === position.row && p.position.col === position.col
        );

        const move: Move = {
          from: selectedSquare,
          to: position,
          piece: selectedPiece,
          captured: piece || undefined
        };

        let newGameState = makeMove(gameState, move);
        
        // Collect powerup if present
        if (powerUpOnSquare) {
          newGameState = collectPowerUp(newGameState, position, 'white');
          const description = getPowerUpDescription(powerUpOnSquare.type);
          showEventMessage(description);
          setShowPowerupInstructions(description);
          
          // Auto-hide powerup instructions after 4 seconds
          setTimeout(() => setShowPowerupInstructions(null), 4000);
        }
        
        const checkedGameState = checkGameOver(newGameState);
        
        // Process turn-based mechanics after each move
        const processedState = processGameMechanics(checkedGameState);
        
        // Process post-move effects using dedicated hooks
        const { newGameState: finalState, events } = processPostMoveEffects(processedState, triggerScreenShake);
        
        // Show event messages
        events.forEach(event => showEventMessage(event));
        
        setGameState(finalState);
      }
      setSelectedSquare(null);
      setValidMoves([]);
    } else {
      // Select new square if it has a white piece
      if (piece && piece.color === 'white') {
        setSelectedSquare(position);
        const moves = getLegalMoves(gameState.board, 'white', gameState.shrunkSquares)
          .filter(move => move.from.row === position.row && move.from.col === position.col)
          .map(move => move.to);
        setValidMoves(moves);
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    }
  }, [gameState, selectedSquare, validMoves]);

  const resetGame = () => {
    setGameState(createInitialGameState());
    setSelectedSquare(null);
    setValidMoves([]);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 ${isScreenShaking ? 'screen-shake' : ''}`}>
      {/* Single Event Message Overlay */}
      {currentMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-6xl md:text-8xl font-black text-white text-center event-message drop-shadow-2xl animate-pulse">
            <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 bg-clip-text text-transparent">
              {currentMessage}
            </div>
          </div>
        </div>
      )}

      {/* Powerup Instructions Overlay */}
      {showPowerupInstructions && (
        <div className="fixed top-4 right-4 z-40 max-w-sm">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white p-4 rounded-lg shadow-2xl border-2 border-yellow-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">Powerup Acquired!</h3>
              <button
                onClick={() => setShowPowerupInstructions(null)}
                className="text-white hover:text-yellow-200 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-sm">{showPowerupInstructions}</p>
            <p className="text-xs mt-2 opacity-80">
              Use the "Use" button in your powerup panel to activate it.
            </p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 bg-gradient-to-r from-yellow-400 to-purple-400 bg-clip-text text-transparent">
            Battle Royale Chess
          </h1>
          <p className="text-gray-300 text-lg">
            Survive the shrinking board and outlast your opponent!
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center">
          <div className="flex flex-col items-center">
            <ChessBoard
              gameState={gameState}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              onSquareClick={handleSquareClick}
            />
            
            <div className="mt-6 flex gap-4">
              <button
                onClick={resetGame}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <RotateCcw className="w-5 h-5" />
                New Game
              </button>
              
              <button
                onClick={() => setShowRulesLegend(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <Zap className="w-5 h-5" />
                Rules & Legend
              </button>
              
              {gameState.currentPlayer === 'black' && (
                <button
                  onClick={() => {
                    console.log('Force switching to white player');
                    setGameState(prevState => {
                      // Reset selection and valid moves when forcing turn
                      setSelectedSquare(null);
                      setValidMoves([]);
                      return {
                        ...prevState,
                        currentPlayer: 'white'
                      };
                    });
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <Play className="w-5 h-5" />
                  Force My Turn
                </button>
              )}
              
              <button
                onClick={() => {
                  console.log('Force generating shrink blocks for testing');
                  setGameState(prevState => {
                    const newShrinkBlocks = generateShrinkBlocks(prevState);
                    return {
                      ...prevState,
                      shrinkBlocks: newShrinkBlocks
                    };
                  });
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <Zap className="w-5 h-5" />
                Test Danger Zones
              </button>
              
              {gameState.gamePhase === 'gameOver' && (
                <button
                  onClick={resetGame}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <Play className="w-5 h-5" />
                  Play Again
                </button>
              )}
            </div>

          </div>

          <div className="w-full max-w-sm">
            <GameInfo gameState={gameState} />
            
            {/* Check Status Display */}
            {gameState.gamePhase === 'playing' && (
              <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
                <h3 className="font-bold text-gray-800 mb-3">Game Status</h3>
                <div className="space-y-2">
                  {isInCheck(gameState.board, 'white', gameState.shrunkSquares) && (
                    <div className="text-red-600 font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                      You are in CHECK!
                    </div>
                  )}
                  {isInCheck(gameState.board, 'black', gameState.shrunkSquares) && (
                    <div className="text-blue-600 font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                      Computer is in CHECK!
                    </div>
                  )}
                  {!isInCheck(gameState.board, 'white', gameState.shrunkSquares) && 
                   !isInCheck(gameState.board, 'black', gameState.shrunkSquares) && (
                    <div className="text-green-600 font-semibold">
                      No checks - Safe to move
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Powerup Display */}
            {gameState.gamePhase === 'playing' && gameState.playerPowerUps.get('white') && (
              <div className="mt-6 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg shadow-lg p-4 border-2 border-yellow-400">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Your Powerup
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const powerup = gameState.playerPowerUps.get('white');
                    if (!powerup) return null;
                    
                    const getPowerupIcon = (type: string) => {
                      switch (type) {
                        case 'shield': return <Shield className="w-6 h-6 text-blue-600" />;
                        case 'teleport': return <Bolt className="w-6 h-6 text-purple-600" />;
                        case 'trap': return <Target className="w-6 h-6 text-red-600" />;
                        case 'extraMove': return <ArrowRight className="w-6 h-6 text-green-600" />;
                        default: return <Zap className="w-6 h-6 text-yellow-600" />;
                      }
                    };
                    
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getPowerupIcon(powerup.type)}
                          <div>
                            <div className="font-semibold text-gray-800 capitalize">
                              {powerup.type}
                            </div>
                            <div className="text-sm text-gray-600">
                              {getPowerUpDescription(powerup.type)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newGameState = usePowerUp(gameState, 'white', powerup.type);
                            setGameState(newGameState);
                            showEventMessage(`${powerup.type.toUpperCase()} ACTIVATED!`);
                          }}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
                        >
                          Use
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Game Rules Legend Modal */}
        <GameRulesLegend 
          isOpen={showRulesLegend} 
          onClose={() => setShowRulesLegend(false)} 
        />
      </div>
    </div>
  );
}

export default App;