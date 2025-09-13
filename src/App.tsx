import React, { useState, useCallback, useEffect } from 'react';
import { ChessBoard } from './components/ChessBoard';
import { GameInfo } from './components/GameInfo';
import { GameState, Position, Move } from './types/chess';
import { 
  createInitialGameState, 
  makeMove, 
  shrinkBoard, 
  respawnPiece, 
  checkGameOver,
  getComputerMove,
  processGameMechanics
} from './utils/gameLogic';
import { generateShrinkBlocks } from './utils/shrinkLogic';
import { getAllPossibleMoves } from './utils/chessLogic';
import { useGameTimer } from './hooks/useGameTimer';
import { RotateCcw, Play, Zap } from 'lucide-react';

function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);

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
          
          // Check for shrinking and respawning
          let finalState = processedState;
          
          // Check for shrinking every 20 turns
          if (finalState.turnCount % 20 === 0 && finalState.turnCount > 0) {
            finalState = shrinkBoard(finalState);
          }
          
          // Check for respawning every 15 turns
          if (finalState.turnCount % 15 === 0 && finalState.turnCount > 0) {
            finalState = respawnPiece(finalState);
          }
          
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
        const moves = getAllPossibleMoves(gameState.board, 'white', gameState.shrunkSquares)
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
        const move: Move = {
          from: selectedSquare,
          to: position,
          piece: selectedPiece,
          captured: piece || undefined
        };

        const newGameState = makeMove(gameState, move);
        const checkedGameState = checkGameOver(newGameState);
        
        // Process turn-based mechanics after each move
        const processedState = processGameMechanics(checkedGameState);
        
        // Check for shrinking and respawning
        let finalState = processedState;
        
        // Check for shrinking every 20 turns
        if (finalState.turnCount % 20 === 0 && finalState.turnCount > 0) {
          finalState = shrinkBoard(finalState);
        }
        
        // Check for respawning every 15 turns
        if (finalState.turnCount % 15 === 0 && finalState.turnCount > 0) {
          finalState = respawnPiece(finalState);
        }
        
        setGameState(finalState);
      }
      setSelectedSquare(null);
      setValidMoves([]);
    } else {
      // Select new square if it has a white piece
      if (piece && piece.color === 'white') {
        setSelectedSquare(position);
        const moves = getAllPossibleMoves(gameState.board, 'white', gameState.shrunkSquares)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
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
            
            <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">Game Rules</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Standard chess movement rules apply</li>
                <li>• Board shrinks every 20 turns (2x2 blocks)</li>
                <li>• Captured pieces respawn every 15 turns</li>
                <li>• Power-ups appear every 20 turns</li>
                <li>• Win by eliminating the enemy king</li>
                <li>• Red squares are dangerous zones</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;