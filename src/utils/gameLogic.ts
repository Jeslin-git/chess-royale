import { ChessPiece, GameState, Move, Position, PieceColor } from '../types/chess';
import { isValidMove, evaluatePosition, PIECE_VALUES, positionKey, getLegalMoves, isInCheck, isCheckmate, isStalemate, findKing as findKingInBoard, isSquareAttacked } from './chessLogic';
import { generateShrinkBlocks, applyShrinkBlocks, updateAndApplyShrinkBlocks } from './shrinkLogic';
import { createRespawnQueue, processRespawnQueue } from './respawnLogic';
import { processPieceTransformations, updatePieceMovementCounters, resetMovementCounter } from './transformationLogic';
import { spawnPowerUps, updatePowerUps, collectPowerUp, applyPowerUpEffects } from './powerupLogic';
import { spawnTriviaTiles } from './triviaLogic';
import { playSound } from './soundEffects';
import { fetchGif } from './giphyLogic';

export function createInitialBoard(): (ChessPiece | null)[][] {
  const board: (ChessPiece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
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
    timeUntilShrink: 20,
    timeUntilRespawn: 15,
    powerUps: [],
    triviaTiles: [],
    shrinkBlocks: [],
    playerPowerUps: new Map([['white', null], ['black', null]]),
    respawnQueue: [],
    trapSquares: new Set(),
    shieldedPieces: new Set()
  };
}

export function makeMove(gameState: GameState, move: Move): GameState {
  const newBoard = gameState.board.map(row => [...row]);
  
  let capturedPieces = [...gameState.capturedPieces];
  if (move.captured) {
    capturedPieces.push(move.captured);
  }
  
  newBoard[move.to.row][move.to.col] = { ...move.piece, hasMoved: true };
  newBoard[move.from.row][move.from.col] = null;
  
  let newGameState = collectPowerUp(gameState, move.to, gameState.currentPlayer);
  
  let newTriviaTiles = [...newGameState.triviaTiles];
  const triviaTileIndex = newTriviaTiles.findIndex(
    (tile) => tile.position.row === move.to.row && tile.position.col === move.to.col
  );
  if (triviaTileIndex !== -1) {
    newTriviaTiles.splice(triviaTileIndex, 1);
  }

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
    turnCount: gameState.turnCount + 1,
    triviaTiles: newTriviaTiles,
  };
}

export function shrinkBoard(gameState: GameState): GameState {
  return updateAndApplyShrinkBlocks(gameState);
}

export function respawnPiece(gameState: GameState): GameState {
  let newGameState = processRespawnQueue(gameState);
  
  return newGameState;
}

export function checkGameOver(gameState: GameState): GameState {
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
  
  newGameState = updateAndApplyShrinkBlocks(newGameState);
  
  newGameState = spawnPowerUps(newGameState);

  newGameState = spawnTriviaTiles(newGameState);
  
  newGameState = updatePowerUps(newGameState);
  
  newGameState = updatePieceMovementCounters(newGameState);
  newGameState = processPieceTransformations(newGameState);
  
  return newGameState;
}

export function getComputerMove(gameState: GameState): Move | null {
  const legalMoves = getLegalMoves(gameState.board, 'black', gameState.shrunkSquares);
  if (legalMoves.length === 0) return null;
  
  for (const move of legalMoves) {
    const tempBoard = gameState.board.map(row => [...row]);
    tempBoard[move.to.row][move.to.col] = move.piece;
    tempBoard[move.from.row][move.from.col] = null;
    
    if (isCheckmate(tempBoard, 'white', gameState.shrunkSquares)) {
      return move;
    }
  }
  
  const evaluatedMoves = legalMoves.map(move => {
    let score = 0;
    
    const tempBoard = gameState.board.map(row => [...row]);
    tempBoard[move.to.row][move.to.col] = move.piece;
    tempBoard[move.from.row][move.from.col] = null;
    
    if (isInCheck(tempBoard, 'white', gameState.shrunkSquares)) {
      score += 500;
    }
    
    if (move.captured) {
      score += PIECE_VALUES[move.captured.type] * 15;
      
      const ourKingPos = findKingInBoard(gameState.board, 'black');
      if (ourKingPos && isSquareAttacked(gameState.board, ourKingPos, 'white', gameState.shrunkSquares)) {
        if (isValidMove(gameState.board, move.to, ourKingPos, gameState.shrunkSquares)) {
          score += 200;
        }
      }
    }
    
    score += evaluateKingSafety(gameState, move);
    
    const centerSquares = [{row: 3, col: 3}, {row: 3, col: 4}, {row: 4, col: 3}, {row: 4, col: 4}];
    if (centerSquares.some(center => center.row === move.to.row && center.col === move.to.col)) {
      score += 10;
    }
    
    if (isSquareAttacked(tempBoard, move.to, 'white', gameState.shrunkSquares)) {
      score -= PIECE_VALUES[move.piece.type] * 8;
    }
    
    score += evaluatePowerupProximity(gameState, move) * 0.5;
    
    score += evaluateShrinkingSafety(gameState, move);
    
    score += evaluatePosition(tempBoard, 'black') * 2;
    
    score += Math.random() * 3;
    
    return { move, score };
  });
  
  evaluatedMoves.sort((a, b) => b.score - a.score);
  
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
  
  if (!kingPos) return -1000;
  
  if (move.piece.type === 'king') {
    const edgeDistance = Math.min(
      move.to.row, 7 - move.to.row, 
      move.to.col, 7 - move.to.col
    );
    score += edgeDistance * 10;
    
    const isShrinkDanger = gameState.shrinkBlocks.some(block => 
      block.position.row === move.to.row && 
      block.position.col === move.to.col &&
      block.turnsUntilShrink <= 5
    );
    if (isShrinkDanger) score -= 100;
  }
  
  if (move.piece.type !== 'king') {
    const distanceToKing = Math.abs(move.to.row - kingPos.row) + Math.abs(move.to.col - kingPos.col);
    if (distanceToKing <= 2) score += 15;
  }
  
  return score;
}

function evaluatePowerupProximity(gameState: GameState, move: Move): number {
  let score = 0;
  
  for (const powerup of gameState.powerUps) {
    const distance = Math.abs(move.to.row - powerup.position.row) + 
                    Math.abs(move.to.col - powerup.position.col);
    
    if (distance === 0) {
      score += 50;
    } else if (distance <= 2) {
      score += 20 / distance;
    }
  }
  
  return score;
}

function evaluateShrinkingSafety(gameState: GameState, move: Move): number {
  let score = 0;
  
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
        score -= 200;
      } else if (block.turnsUntilShrink <= 3) {
        score -= 100;
      } else if (block.turnsUntilShrink <= 5) {
        score -= 50;
      } else {
        score -= 20;
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

export function processPostMoveEffects(gameState: GameState, triggerScreenShake?: () => void): {
  newGameState: GameState;
  events: string[];
} {
  let newGameState = gameState;
  const events: string[] = [];

  const shrinkResult = processShrinkEffects(newGameState, triggerScreenShake);
  newGameState = shrinkResult.gameState;
  events.push(...shrinkResult.events);

  const respawnResult = processRespawnEffects(newGameState);
  newGameState = respawnResult.gameState;
  events.push(...respawnResult.events);

  if (newGameState.gamePhase === 'gameOver' && newGameState.winner) {
    events.push(`checkmate,${newGameState.winner} wins`);
  }
  
  if (newGameState.turnCount % 15 === 0 && newGameState.turnCount > 0) {
    events.push('piece-respawn');
  }
  if (newGameState.turnCount % 12 === 0 && newGameState.turnCount > 0) {
    events.push('piece-transformation');
  }

  return { newGameState, events };
}

function processShrinkEffects(gameState: GameState, triggerScreenShake?: () => void): {
  gameState: GameState;
  events: string[];
} {
  const events: string[] = [];
  const shrinkCountdown = 16 - (gameState.turnCount % 16);

  if (shrinkCountdown === 3) {
    events.push("SHRINKING IN 3 TURNS!");
    playSound('emergency');
  } else if (shrinkCountdown === 1) {
    events.push("SHRINKING IMMINENT!");
    playSound('emergency');
    if (triggerScreenShake) {
      triggerScreenShake();
    }
  } else if (gameState.turnCount % 16 === 0 && gameState.turnCount > 0) {
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

  if (newGameState.turnCount % 15 === 0 && newGameState.turnCount > 0) {
    newGameState = respawnPiece(newGameState);
    events.push("PIECE RESPAWNED!");
    playSound('respawn');
  }

  const whitePowerUp = newGameState.playerPowerUps.get('white');
  const blackPowerUp = newGameState.playerPowerUps.get('black');
  
  if (whitePowerUp && newGameState.currentPlayer === 'black') {
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