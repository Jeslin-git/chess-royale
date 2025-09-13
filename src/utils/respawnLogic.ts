import { GameState, ChessPiece, PieceColor, Position } from '../types/chess';
import { positionKey } from './chessLogic';

const PIECE_WEIGHTS = {
  pawn: 40,    // High chance
  knight: 20,  // Medium chance
  bishop: 20,  // Medium chance
  rook: 20,    // Medium chance
  queen: 5,    // Low chance
  king: 0      // Never respawn
};

export function createRespawnQueue(gameState: GameState): { player: PieceColor; piece: ChessPiece }[] {
  const queue: { player: PieceColor; piece: ChessPiece }[] = [];
  
  // Count pieces per player
  const playerPieces = new Map<PieceColor, number>();
  playerPieces.set('white', 0);
  playerPieces.set('black', 0);
  
  for (const piece of gameState.capturedPieces) {
    playerPieces.set(piece.color, (playerPieces.get(piece.color) || 0) + 1);
  }
  
  // Ensure equal distribution
  const maxPieces = Math.max(playerPieces.get('white') || 0, playerPieces.get('black') || 0);
  
  for (let i = 0; i < maxPieces; i++) {
    // Alternate between players for fair distribution
    const players: PieceColor[] = ['white', 'black'];
    for (const player of players) {
      const playerCapturedPieces = gameState.capturedPieces.filter(p => p.color === player);
      if (i < playerCapturedPieces.length) {
        queue.push({ player, piece: playerCapturedPieces[i] });
      }
    }
  }
  
  return queue;
}

export function processRespawnQueue(gameState: GameState): GameState {
  if (gameState.respawnQueue.length === 0) return gameState;
  
  const newBoard = gameState.board.map(row => [...row]);
  const newRespawnQueue = [...gameState.respawnQueue];
  const newCapturedPieces = [...gameState.capturedPieces];
  
  // Get next piece to respawn
  const nextRespawn = newRespawnQueue.shift();
  if (!nextRespawn) return gameState;
  
  // Find safe spawn position
  const safePosition = findSafeSpawnPosition(newBoard, gameState.shrunkSquares, gameState.powerUps);
  if (!safePosition) {
    // No safe position available, put back in queue
    newRespawnQueue.unshift(nextRespawn);
    return {
      ...gameState,
      respawnQueue: newRespawnQueue
    };
  }
  
  // Create respawned piece with weighted selection
  const respawnedPiece = selectWeightedPiece(nextRespawn.piece);
  
  // Place piece on board
  newBoard[safePosition.row][safePosition.col] = {
    ...respawnedPiece,
    id: `${respawnedPiece.id}-respawn-${Date.now()}`,
    hasMoved: false,
    turnsWithoutMoving: 0
  };
  
  // Remove from captured pieces
  const pieceIndex = newCapturedPieces.findIndex(p => p.id === nextRespawn.piece.id);
  if (pieceIndex !== -1) {
    newCapturedPieces.splice(pieceIndex, 1);
  }
  
  return {
    ...gameState,
    board: newBoard,
    capturedPieces: newCapturedPieces,
    respawnQueue: newRespawnQueue
  };
}

function findSafeSpawnPosition(
  board: (ChessPiece | null)[][],
  shrunkSquares: Set<string>,
  powerUps: any[]
): Position | null {
  const availableSquares: Position[] = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const pos = { row, col };
      const key = positionKey(pos);
      
      // Check if square is safe (not shrunk, not occupied, not near powerup)
      if (!shrunkSquares.has(key) && !board[row][col] && !isNearPowerUp(pos, powerUps)) {
        availableSquares.push(pos);
      }
    }
  }
  
  if (availableSquares.length === 0) return null;
  
  // Random selection from available squares
  return availableSquares[Math.floor(Math.random() * availableSquares.length)];
}

function isNearPowerUp(pos: Position, powerUps: any[]): boolean {
  return powerUps.some(powerUp => {
    const dx = Math.abs(pos.row - powerUp.position.row);
    const dy = Math.abs(pos.col - powerUp.position.col);
    return dx <= 1 && dy <= 1; // Adjacent to powerup
  });
}

function selectWeightedPiece(originalPiece: ChessPiece): ChessPiece {
  // Create weighted selection pool
  const weightedTypes: PieceType[] = [];
  
  Object.entries(PIECE_WEIGHTS).forEach(([type, weight]) => {
    for (let i = 0; i < weight; i++) {
      weightedTypes.push(type as PieceType);
    }
  });
  
  // Select random type from weighted pool
  const selectedType = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
  
  return {
    ...originalPiece,
    type: selectedType
  };
}
