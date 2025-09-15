import { ChessPiece, GameState, Move, Position, PieceColor } from '../types/chess';
import { isValidMove, evaluatePosition, PIECE_VALUES, positionKey, getLegalMoves, isInCheck, isCheckmate, isStalemate, findKing as findKingInBoard, isSquareAttacked } from './chessLogic';
import { generateShrinkBlocks, applyShrinkBlocks, updateAndApplyShrinkBlocks } from './shrinkLogic';
import { createRespawnQueue, processRespawnQueue } from './respawnLogic';
import { processPieceTransformations, updatePieceMovementCounters, resetMovementCounter } from './transformationLogic';
import { spawnPowerUps, updatePowerUps, collectPowerUp, applyPowerUpEffects } from './powerupLogic';
import { playSound } from './soundEffects';

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
  
  // Check if powerup was collected and add feedback message
  const powerUpCollected = gameState.powerUps.length > newGameState.powerUps.length;
  if (powerUpCollected) {
    const collectedPowerUp = newGameState.playerPowerUps.get(gameState.currentPlayer);
    if (collectedPowerUp) {
      // This will be handled by the message system in App.tsx
      console.log(`Powerup collected: ${collectedPowerUp.type}`);
    }
  }
  
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
  return updateAndApplyShrinkBlocks(gameState);
}

export function respawnPiece(gameState: GameState): GameState {
  // Process respawn queue
  let newGameState = processRespawnQueue(gameState);
  
  return newGameState;
}

export function checkGameOver(gameState: GameState): GameState {
  // Check for checkmate and stalemate for both players
  const whiteInCheckmate = isCheckmate(gameState.board, 'white', gameState.shrunkSquares);
  const blackInCheckmate = isCheckmate(gameState.board, 'black', gameState.shrunkSquares);
  const whiteInStalemate = isStalemate(gameState.board, 'white', gameState.shrunkSquares);
  const blackInStalemate = isStalemate(gameState.board, 'black', gameState.shrunkSquares);
  
  let winner: PieceColor | 'draw' | null = null;
  
  if (whiteInCheckmate) {
    winner = 'black';
  } else if (blackInCheckmate) {
    winner = 'white';
  } else if (whiteInStalemate || blackInStalemate) {
    winner = 'draw';
  }
  
  // Fallback: check if kings are missing (for battle royale compatibility)
  const whiteKing = findKing(gameState.board, 'white');
  const blackKing = findKing(gameState.board, 'black');
  
  if (!whiteKing && !blackKing) {
    winner = 'draw';
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
  
  // Update and apply shrink blocks (handles generation, countdown, shrinking)
  newGameState = updateAndApplyShrinkBlocks(newGameState);
  
  // Spawn powerups
  newGameState = spawnPowerUps(newGameState);
  
  // Update powerups
  newGameState = updatePowerUps(newGameState);
  
  // Enable transformations with enhanced tracking
  newGameState = updatePieceMovementCounters(newGameState);
  newGameState = processPieceTransformations(newGameState);
  
  return newGameState;
}

export function getComputerMove(gameState: GameState): Move | null {
  // Get only legal moves (no moves that leave king in check)
  const legalMoves = getLegalMoves(gameState.board, 'black', gameState.shrunkSquares);
  if (legalMoves.length === 0) return null;
  
  // Check for immediate checkmate opportunities
  for (const move of legalMoves) {
    const tempBoard = gameState.board.map(row => [...row]);
    tempBoard[move.to.row][move.to.col] = move.piece;
    tempBoard[move.from.row][move.from.col] = null;
    
    if (isCheckmate(tempBoard, 'white', gameState.shrunkSquares)) {
      return move; // Checkmate! Take it immediately
    }
  }
  
  // Enhanced AI with strategic priorities using minimax-like evaluation
  const evaluatedMoves = legalMoves.map(move => {
    let score = 0;
    
    // Create board after this move
    const tempBoard = gameState.board.map(row => [...row]);
    tempBoard[move.to.row][move.to.col] = move.piece;
    tempBoard[move.from.row][move.from.col] = null;
    
    // 1. Checkmate/Check priorities (highest)
    if (isInCheck(tempBoard, 'white', gameState.shrunkSquares)) {
      score += 500; // Giving check is very good
    }
    
    // 2. Capture valuable pieces
    if (move.captured) {
      score += PIECE_VALUES[move.captured.type] * 15;
      
      // Extra bonus for capturing pieces that threaten our king
      const ourKingPos = findKingInBoard(gameState.board, 'black');
      if (ourKingPos && isSquareAttacked(gameState.board, ourKingPos, 'white', gameState.shrunkSquares)) {
        if (isValidMove(gameState.board, move.to, ourKingPos, gameState.shrunkSquares)) {
          score += 200; // Remove threats to our king
        }
      }
    }
    
    // 3. King safety evaluation
    score += evaluateKingSafety(gameState, move);
    
    // 4. Center control bonus
    const centerSquares = [{row: 3, col: 3}, {row: 3, col: 4}, {row: 4, col: 3}, {row: 4, col: 4}];
    if (centerSquares.some(center => center.row === move.to.row && center.col === move.to.col)) {
      score += 10;
    }
    
    // 5. Avoid moving into danger
    if (isSquareAttacked(tempBoard, move.to, 'white', gameState.shrunkSquares)) {
      score -= PIECE_VALUES[move.piece.type] * 8; // Penalty for hanging pieces
    }
    
    // 6. Move toward powerups (lower priority)
    score += evaluatePowerupProximity(gameState, move) * 0.5;
    
    // 7. Avoid shrinking danger zones
    score += evaluateShrinkingSafety(gameState, move);
    
    // 8. Basic material evaluation
    score += evaluatePosition(tempBoard, 'black') * 2;
    
    // 9. Small randomness for variety
    score += Math.random() * 3;
    
    return { move, score };
  });
  
  evaluatedMoves.sort((a, b) => b.score - a.score);
  
  // Use weighted selection from top moves for some variety
  const topCount = Math.min(3, evaluatedMoves.length);
  const topMoves = evaluatedMoves.slice(0, topCount);
  const weights = topMoves.map((_, index) => Math.pow(0.8, index));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  let random = Math.random() * totalWeight;
  for (let i = 0; i < topMoves.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return topMoves[i].move;
    }
  }
  
  return topMoves[0].move;
}

function evaluateKingSafety(gameState: GameState, move: Move): number {
  let score = 0;
  const kingPos = findKingPosition(gameState.board, 'black');
  
  if (!kingPos) return -1000; // No king = bad!
  
  // If moving the king, evaluate new position safety
  if (move.piece.type === 'king') {
    // Avoid edges and corners when possible
    const edgeDistance = Math.min(
      move.to.row, 7 - move.to.row, 
      move.to.col, 7 - move.to.col
    );
    score += edgeDistance * 10;
    
    // Avoid shrinking zones
    const isShrinkDanger = gameState.shrinkBlocks.some(block => 
      block.position.row === move.to.row && 
      block.position.col === move.to.col &&
      block.turnsUntilShrink <= 5
    );
    if (isShrinkDanger) score -= 100;
  }
  
  // Protect king with other pieces
  if (move.piece.type !== 'king') {
    const distanceToKing = Math.abs(move.to.row - kingPos.row) + Math.abs(move.to.col - kingPos.col);
    if (distanceToKing <= 2) score += 15; // Stay close to protect king
  }
  
  return score;
}

function evaluatePowerupProximity(gameState: GameState, move: Move): number {
  let score = 0;
  
  // Move toward powerups
  for (const powerup of gameState.powerUps) {
    const distance = Math.abs(move.to.row - powerup.position.row) + 
                    Math.abs(move.to.col - powerup.position.col);
    
    if (distance === 0) {
      score += 50; // Collect powerup!
    } else if (distance <= 2) {
      score += 20 / distance; // Get closer to powerups
    }
  }
  
  return score;
}

function evaluateShrinkingSafety(gameState: GameState, move: Move): number {
  let score = 0;
  
  // Heavily penalize moving into danger zones
  const isDangerZone = gameState.shrinkBlocks.some(block => 
    block.position.row === move.to.row && 
    block.position.col === move.to.col
  );
  
  if (isDangerZone) {
    const block = gameState.shrinkBlocks.find(block => 
      block.position.row === move.to.row && 
      block.position.col === move.to.col
    );
    if (block) {
      if (block.turnsUntilShrink <= 1) {
        score -= 200; // Immediate danger!
      } else if (block.turnsUntilShrink <= 3) {
        score -= 100; // High danger
      } else if (block.turnsUntilShrink <= 5) {
        score -= 50; // Moderate danger
      } else {
        score -= 20; // Low danger
      }
    }
  }
  
  return score;
}

function findKingPosition(board: (ChessPiece | null)[][], color: PieceColor): Position | null {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

// Dedicated post-move hooks for clean separation of concerns
export function processPostMoveEffects(gameState: GameState, triggerScreenShake?: () => void): {
  newGameState: GameState;
  events: string[];
} {
  let newGameState = gameState;
  const events: string[] = [];

  // Process shrinking and respawning
  const shrinkResult = processShrinkEffects(newGameState, triggerScreenShake);
  newGameState = shrinkResult.gameState;
  events.push(...shrinkResult.events);

  const respawnResult = processRespawnEffects(newGameState);
  newGameState = respawnResult.gameState;
  events.push(...respawnResult.events);

  return { newGameState, events };
}

function processShrinkEffects(gameState: GameState, triggerScreenShake?: () => void): {
  gameState: GameState;
  events: string[];
} {
  const events: string[] = [];
  const shrinkCountdown = 16 - (gameState.turnCount % 16);

  // Add shrink warning events synchronized with the new 16-turn cycle
  if (shrinkCountdown === 3) {
    events.push("SHRINKING IN 3 TURNS!");
    playSound('emergency');
  } else if (shrinkCountdown === 1) {
    events.push("SHRINKING IMMINENT!");
    playSound('emergency');
    // Trigger screen shake 1 turn before shrink for dramatic effect
    if (triggerScreenShake) {
      triggerScreenShake();
    }
  } else if (gameState.turnCount % 16 === 0 && gameState.turnCount > 0) {
    events.push("BOARD SHRINKING!");
    playSound('shrink');
    // Additional shake when shrinking actually happens
    if (triggerScreenShake) {
      triggerScreenShake();
    }
  }

  return { gameState, events };
}

function processRespawnEffects(gameState: GameState): {
  gameState: GameState;
  events: string[];
} {
  let newGameState = gameState;
  const events: string[] = [];

  // Check for respawning every 15 turns
  if (newGameState.turnCount % 15 === 0 && newGameState.turnCount > 0) {
    newGameState = respawnPiece(newGameState);
    events.push("PIECE RESPAWNED!");
    playSound('respawn');
  }

  // Check for powerup collection feedback
  const whitePowerUp = newGameState.playerPowerUps.get('white');
  const blackPowerUp = newGameState.playerPowerUps.get('black');
  
  if (whitePowerUp && newGameState.currentPlayer === 'black') {
    // Player just collected a powerup on their previous turn
    const description = getPowerUpDescription(whitePowerUp.type);
    events.push(description);
  }

  return { gameState: newGameState, events };
}

function getPowerUpDescription(powerUpType: string): string {
  const descriptions: Record<string, string> = {
    'teleport': 'TELEPORT ACQUIRED!',
    'shield': 'SHIELD ACQUIRED!', 
    'extraMove': 'EXTRA MOVE ACQUIRED!',
    'trap': 'TRAP ACQUIRED!'
  };
  
  return descriptions[powerUpType] || 'POWERUP ACQUIRED!';
}