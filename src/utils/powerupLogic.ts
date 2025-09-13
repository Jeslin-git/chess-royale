import { GameState, PowerUp, Position, PieceColor } from '../types/chess';
import { positionKey } from './chessLogic';

export function spawnPowerUps(gameState: GameState): GameState {
  const SPAWN_INTERVAL = 20; // Every 20 turns (same as shrinking)
  const SPAWN_COUNT_PER_PLAYER = 1;
  
  // Only spawn powerups after turn 20 and every 20 turns
  if (gameState.turnCount < 20 || gameState.turnCount % SPAWN_INTERVAL !== 0) {
    return gameState;
  }
  
  const newPowerUps = [...gameState.powerUps];
  const activePlayers = getActivePlayers(gameState);
  
  // Spawn only one powerup total (not per player)
  if (activePlayers.length > 0) {
    const powerUp = createRandomPowerUp(gameState);
    if (powerUp) {
      newPowerUps.push(powerUp);
    }
  }
  
  return {
    ...gameState,
    powerUps: newPowerUps
  };
}

export function updatePowerUps(gameState: GameState): GameState {
  const newPowerUps = gameState.powerUps
    .map(powerUp => ({
      ...powerUp,
      turnsUntilDespawn: powerUp.turnsUntilDespawn - 1
    }))
    .filter(powerUp => powerUp.turnsUntilDespawn > 0);
  
  return {
    ...gameState,
    powerUps: newPowerUps
  };
}

export function collectPowerUp(gameState: GameState, position: Position, player: PieceColor): GameState {
  const powerUpIndex = gameState.powerUps.findIndex(
    p => p.position.row === position.row && p.position.col === position.col
  );
  
  if (powerUpIndex === -1) return gameState;
  
  const powerUp = gameState.powerUps[powerUpIndex];
  const newPowerUps = [...gameState.powerUps];
  newPowerUps.splice(powerUpIndex, 1);
  
  const newPlayerPowerUps = new Map(gameState.playerPowerUps);
  newPlayerPowerUps.set(player, powerUp);
  
  return {
    ...gameState,
    powerUps: newPowerUps,
    playerPowerUps: newPlayerPowerUps
  };
}

export function usePowerUp(gameState: GameState, player: PieceColor, powerUpType: string): GameState {
  const playerPowerUps = new Map(gameState.playerPowerUps);
  const powerUp = playerPowerUps.get(player);
  
  if (!powerUp || powerUp.type !== powerUpType) {
    return gameState;
  }
  
  // Remove powerup after use
  playerPowerUps.set(player, null);
  
  return {
    ...gameState,
    playerPowerUps
  };
}

function createRandomPowerUp(gameState: GameState): PowerUp | null {
  const powerUpTypes = ['teleport', 'shield', 'extraMove', 'trap'];
  const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
  
  const position = findSafePowerUpPosition(gameState);
  if (!position) return null;
  
  return {
    id: `powerup-${randomType}-${Date.now()}`,
    type: randomType as any,
    position,
    turnsUntilDespawn: 3
  };
}

function findSafePowerUpPosition(gameState: GameState): Position | null {
  const availableSquares: Position[] = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const pos = { row, col };
      const key = positionKey(pos);
      
      // Check if square is safe for powerup
      if (!gameState.shrunkSquares.has(key) && 
          !gameState.board[row][col] && 
          !isNearKing(gameState, pos) &&
          !gameState.powerUps.some(p => p.position.row === row && p.position.col === col)) {
        availableSquares.push(pos);
      }
    }
  }
  
  if (availableSquares.length === 0) return null;
  
  return availableSquares[Math.floor(Math.random() * availableSquares.length)];
}

function isNearKing(gameState: GameState, pos: Position): boolean {
  // Check if position is adjacent to any king
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece && piece.type === 'king') {
        const dx = Math.abs(pos.row - row);
        const dy = Math.abs(pos.col - col);
        if (dx <= 1 && dy <= 1) {
          return true;
        }
      }
    }
  }
  return false;
}

function getActivePlayers(gameState: GameState): PieceColor[] {
  const players = new Set<PieceColor>();
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece) {
        players.add(piece.color);
      }
    }
  }
  
  return Array.from(players);
}

export function applyPowerUpEffects(gameState: GameState, move: any): GameState {
  if (!move.usedPowerUp) return gameState;
  
  const { type } = move.usedPowerUp;
  
  switch (type) {
    case 'shield':
      return applyShieldEffect(gameState, move);
    case 'trap':
      return applyTrapEffect(gameState, move);
    case 'extraMove':
      return applyExtraMoveEffect(gameState);
    default:
      return gameState;
  }
}

function applyShieldEffect(gameState: GameState, move: any): GameState {
  const newShieldedPieces = new Set(gameState.shieldedPieces);
  newShieldedPieces.add(move.piece.id);
  
  return {
    ...gameState,
    shieldedPieces: newShieldedPieces
  };
}

function applyTrapEffect(gameState: GameState, move: any): GameState {
  const newTrapSquares = new Set(gameState.trapSquares);
  newTrapSquares.add(positionKey(move.to));
  
  return {
    ...gameState,
    trapSquares: newTrapSquares
  };
}

function applyExtraMoveEffect(gameState: GameState): GameState {
  // Extra move is handled in the main game loop
  return gameState;
}
