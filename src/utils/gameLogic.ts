import { GameState, ChessPiece, PieceColor, Position, Move } from '../types/chess';
import { getAllPossibleMoves, evaluatePosition, positionKey, PIECE_VALUES } from './chessLogic';
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
  const moves = getAllPossibleMoves(gameState.board, 'black', gameState.shrunkSquares);
  if (moves.length === 0) return null;
  
  // Enhanced AI with strategic priorities
  const evaluatedMoves = moves.map(move => {
    let score = 0;
    
    // 1. King safety is top priority
    score += evaluateKingSafety(gameState, move);
    
    // 2. Capture enemy pieces (especially king!)
    if (move.captured) {
      if (move.captured.type === 'king') {
        score += 1000; // Winning move!
      } else {
        score += PIECE_VALUES[move.captured.type] * 10;
      }
    }
    
    // 3. Move toward powerups
    score += evaluatePowerupProximity(gameState, move);
    
    // 4. Avoid shrinking danger zones
    score += evaluateShrinkingSafety(gameState, move);
    
    // 5. Basic position evaluation
    const tempBoard = gameState.board.map(row => [...row]);
    tempBoard[move.to.row][move.to.col] = move.piece;
    tempBoard[move.from.row][move.from.col] = null;
    score += evaluatePosition(tempBoard, 'black');
    
    // 6. Add some randomness for variety
    score += Math.random() * 5;
    
    return { move, score };
  });
  
  evaluatedMoves.sort((a, b) => b.score - a.score);
  
  // Pick from top moves with weighted probability
  const topMoves = evaluatedMoves.slice(0, Math.min(5, evaluatedMoves.length));
  const weights = topMoves.map((_, index) => Math.pow(0.7, index)); // Exponential decay
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
  const shrinkCountdown = 20 - (gameState.turnCount % 20);

  // Add shrink warning events
  if (shrinkCountdown === 5) {
    events.push("SHRINKING IN 5 TURNS!");
    playSound('emergency');
  } else if (shrinkCountdown === 1) {
    events.push("SHRINKING IMMINENT!");
    playSound('emergency');
  } else if (gameState.turnCount % 20 === 0 && gameState.turnCount > 0) {
    events.push("BOARD SHRINKING!");
    playSound('shrink');
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