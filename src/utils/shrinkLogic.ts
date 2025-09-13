import { GameState, Position, ShrinkBlock, ChessPiece } from '../types/chess';
import { positionKey } from './chessLogic';

export function generateShrinkBlocks(gameState: GameState): ShrinkBlock[] {
  const blocks: ShrinkBlock[] = [];
  const shrinkLevel = Math.floor(gameState.turnCount / 20);
  
  if (shrinkLevel >= 3) return blocks; // Max shrink level reached
  
  // Show warnings 3 turns before shrinking
  const turnsUntilNextShrink = 20 - (gameState.turnCount % 20);
  if (turnsUntilNextShrink > 3) return blocks; // Too early to show warnings
  
  // Debug: Always show some blocks for testing
  console.log(`Turn ${gameState.turnCount}, turnsUntilNextShrink: ${turnsUntilNextShrink}, shrinkLevel: ${shrinkLevel}`);
  
  // Generate 2x2 blocks from outer edges
  const blockPositions = getShrinkBlockPositions(shrinkLevel);
  
  blockPositions.forEach((pos, index) => {
    blocks.push({
      position: pos,
      turnsUntilShrink: turnsUntilNextShrink,
      isWarning: true
    });
  });
  
  return blocks;
}

function getShrinkBlockPositions(level: number): Position[] {
  const positions: Position[] = [];
  
  // Simple approach: shrink from corners first
  if (level === 0) {
    // First level: shrink corner 2x2 blocks
    positions.push({ row: 0, col: 0 });
    positions.push({ row: 0, col: 6 });
    positions.push({ row: 6, col: 0 });
    positions.push({ row: 6, col: 6 });
  } else if (level === 1) {
    // Second level: shrink more edge blocks
    positions.push({ row: 0, col: 2 });
    positions.push({ row: 0, col: 4 });
    positions.push({ row: 2, col: 0 });
    positions.push({ row: 2, col: 6 });
    positions.push({ row: 4, col: 0 });
    positions.push({ row: 4, col: 6 });
    positions.push({ row: 6, col: 2 });
    positions.push({ row: 6, col: 4 });
  } else if (level === 2) {
    // Third level: shrink remaining edge blocks
    positions.push({ row: 0, col: 1 });
    positions.push({ row: 0, col: 3 });
    positions.push({ row: 0, col: 5 });
    positions.push({ row: 1, col: 0 });
    positions.push({ row: 1, col: 6 });
    positions.push({ row: 3, col: 0 });
    positions.push({ row: 3, col: 6 });
    positions.push({ row: 5, col: 0 });
    positions.push({ row: 5, col: 6 });
    positions.push({ row: 6, col: 1 });
    positions.push({ row: 6, col: 3 });
    positions.push({ row: 6, col: 5 });
  }
  
  return positions;
}

export function applyShrinkBlocks(gameState: GameState): GameState {
  const newShrunkSquares = new Set(gameState.shrunkSquares);
  const newBoard = gameState.board.map(row => [...row]);
  const newShrinkBlocks = [...gameState.shrunkBlocks];
  
  // Process blocks that are ready to shrink
  const blocksToShrink = newShrinkBlocks.filter(block => block.turnsUntilShrink <= 0);
  
  blocksToShrink.forEach(block => {
    const { position } = block;
    
    // Add 2x2 block to shrunk squares
    for (let dr = 0; dr < 2; dr++) {
      for (let dc = 0; dc < 2; dc++) {
        const newPos = { row: position.row + dr, col: position.col + dc };
        if (isValidPosition(newPos)) {
          const key = positionKey(newPos);
          newShrunkSquares.add(key);
          
          // Check if king is on this square and teleport if needed
          const piece = newBoard[newPos.row][newPos.col];
          if (piece && piece.type === 'king') {
            const safePosition = findNearestSafeSquare(newBoard, newPos, newShrunkSquares);
            if (safePosition) {
              // Teleport king to safe position
              newBoard[safePosition.row][safePosition.col] = piece;
              newBoard[newPos.row][newPos.col] = null;
              // TODO: Add teleport animation effect
            }
          } else {
            // Remove piece from shrunk square
            newBoard[newPos.row][newPos.col] = null;
          }
        }
      }
    }
  });
  
  // Remove processed blocks
  const remainingBlocks = newShrinkBlocks.filter(block => block.turnsUntilShrink > 0);
  
  // Update remaining blocks countdown
  const updatedBlocks = remainingBlocks.map(block => ({
    ...block,
    turnsUntilShrink: block.turnsUntilShrink - 1
  }));
  
  return {
    ...gameState,
    board: newBoard,
    shrunkSquares: newShrunkSquares,
    shrinkBlocks: updatedBlocks
  };
}

function findNearestSafeSquare(
  board: (ChessPiece | null)[][],
  from: Position,
  shrunkSquares: Set<string>
): Position | null {
  // Check adjacent squares first
  const directions = [
    { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
    { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
  ];
  
  for (const { dr, dc } of directions) {
    const pos = { row: from.row + dr, col: from.col + dc };
    if (isValidPosition(pos) && !shrunkSquares.has(positionKey(pos)) && !board[pos.row][pos.col]) {
      return pos;
    }
  }
  
  // If no adjacent safe squares, search outward
  for (let radius = 2; radius <= 7; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) === radius || Math.abs(dc) === radius) {
          const pos = { row: from.row + dr, col: from.col + dc };
          if (isValidPosition(pos) && !shrunkSquares.has(positionKey(pos)) && !board[pos.row][pos.col]) {
            return pos;
          }
        }
      }
    }
  }
  
  return null;
}

function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}
