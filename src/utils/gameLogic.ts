import { GameState, ChessPiece, PieceColor, Position, Move } from '../types/chess';
import { getAllPossibleMoves, evaluatePosition, positionKey } from './chessLogic';
import { generateShrinkBlocks, applyShrinkBlocks } from './shrinkLogic';
import { createRespawnQueue, processRespawnQueue } from './respawnLogic';
import { processPieceTransformations, updatePieceMovementCounters, resetMovementCounter } from './transformationLogic';
import { spawnPowerUps, updatePowerUps, collectPowerUp, applyPowerUpEffects } from './powerupLogic';

export function createInitialBoard(): (ChessPiece | null)[][] {
  const board: (ChessPiece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Setup pieces for both sides
  const setupRow = (row: number, color: PieceColor) => {
    const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'] as const;
    pieceOrder.forEach((type, col) => {
      board[row][col] = {
        type,
        color,
        id: `${color}-${type}-${col}`,
        hasMoved: false
      };
    });
  };
  
  const setupPawns = (row: number, color: PieceColor) => {
    for (let col = 0; col < 8; col++) {
      board[row][col] = {
        type: 'pawn',
        color,
        id: `${color}-pawn-${col}`,
        hasMoved: false
      };
    }
  };
  
  setupRow(0, 'black');
  setupPawns(1, 'black');
  setupPawns(6, 'white');
  setupRow(7, 'white');
  
  return board;
}

export function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    currentPlayer: 'white',
    gamePhase: 'playing',
    winner: null,
    shrunkSquares: new Set(),
    capturedPieces: [],
    turnCount: 0,
    timeUntilShrink: 20, // Not used anymore, but kept for compatibility
    timeUntilRespawn: 15, // Not used anymore, but kept for compatibility
    powerUps: [],
    shrinkBlocks: [],
    playerPowerUps: new Map([['white', null], ['black', null]]),
    respawnQueue: [],
    trapSquares: new Set(),
    shieldedPieces: new Set()
  };
}

export function makeMove(gameState: GameState, move: Move): GameState {
  const newBoard = gameState.board.map(row => [...row]);
  
  // Capture piece if present
  let capturedPieces = [...gameState.capturedPieces];
  if (move.captured) {
    capturedPieces.push(move.captured);
  }
  
  // Move piece
  newBoard[move.to.row][move.to.col] = { ...move.piece, hasMoved: true };
  newBoard[move.from.row][move.from.col] = null;
  
  // Check for powerup collection
  let newGameState = collectPowerUp(gameState, move.to, gameState.currentPlayer);
  
  // Update respawn queue when pieces are captured
  let newRespawnQueue = newGameState.respawnQueue;
  if (move.captured) {
    newRespawnQueue = createRespawnQueue({
      ...newGameState,
      capturedPieces
    });
  }
  
  const nextPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
  
  return {
    ...newGameState,
    board: newBoard,
    currentPlayer: nextPlayer,
    capturedPieces,
    respawnQueue: newRespawnQueue,
    turnCount: gameState.turnCount + 1
  };
}

export function shrinkBoard(gameState: GameState): GameState {
  // Generate new shrink blocks
  const newShrinkBlocks = generateShrinkBlocks(gameState);
  
  // Apply shrink blocks
  let newGameState = applyShrinkBlocks({
    ...gameState,
    shrinkBlocks: newShrinkBlocks
  });
  
  return newGameState;
}

export function respawnPiece(gameState: GameState): GameState {
  // Process respawn queue
  let newGameState = processRespawnQueue(gameState);
  
  return newGameState;
}

export function checkGameOver(gameState: GameState): GameState {
  const whiteKing = findKing(gameState.board, 'white');
  const blackKing = findKing(gameState.board, 'black');
  
  let winner: PieceColor | null = null;
  
  if (!whiteKing && !blackKing) {
    // Both kings gone - draw (shouldn't happen in battle royale)
    winner = null;
  } else if (!whiteKing) {
    winner = 'black';
  } else if (!blackKing) {
    winner = 'white';
  }
  
  return {
    ...gameState,
    winner,
    gamePhase: winner !== null ? 'gameOver' : gameState.gamePhase
  };
}

function findKing(board: (ChessPiece | null)[][], color: PieceColor): ChessPiece | null {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return piece;
      }
    }
  }
  return null;
}

export function processGameMechanics(gameState: GameState): GameState {
  let newGameState = gameState;
  
  // Generate shrink blocks for warning display
  const newShrinkBlocks = generateShrinkBlocks(newGameState);
  newGameState = {
    ...newGameState,
    shrinkBlocks: newShrinkBlocks
  };
  
  // Spawn powerups
  newGameState = spawnPowerUps(newGameState);
  
  // Update powerups
  newGameState = updatePowerUps(newGameState);
  
  // Disable transformations for now - too chaotic
  // newGameState = updatePieceMovementCounters(newGameState);
  // newGameState = processPieceTransformations(newGameState);
  
  return newGameState;
}

export function getComputerMove(gameState: GameState): Move | null {
  const moves = getAllPossibleMoves(gameState.board, 'black', gameState.shrunkSquares);
  if (moves.length === 0) return null;
  
  // Simple AI: prefer captures, then random moves
  const captureMoves = moves.filter(move => move.captured);
  if (captureMoves.length > 0) {
    return captureMoves[Math.floor(Math.random() * captureMoves.length)];
  }
  
  // Evaluate moves and pick the best one (with some randomness)
  const evaluatedMoves = moves.map(move => {
    const tempBoard = gameState.board.map(row => [...row]);
    tempBoard[move.to.row][move.to.col] = move.piece;
    tempBoard[move.from.row][move.from.col] = null;
    
    return {
      move,
      score: evaluatePosition(tempBoard, 'black') + Math.random() * 2
    };
  });
  
  evaluatedMoves.sort((a, b) => b.score - a.score);
  
  // Pick from top 3 moves for some variety
  const topMoves = evaluatedMoves.slice(0, Math.min(3, evaluatedMoves.length));
  const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
  
  return selectedMove.move;
}