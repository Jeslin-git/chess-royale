import { GameState, Position, ShrinkBlock, ChessPiece } from '../types/chess';
import { positionKey } from './chessLogic';
import { playSound } from './soundEffects';

export function shouldGenerateShrinkBlocks(turnCount: number): boolean {
  // Generate shrink blocks every 12 turns, with warnings 3 turns before
  return turnCount > 0 && turnCount % 12 === 9;
}

export function generateShrinkBlocks(gameState: GameState): ShrinkBlock[] {
  const blocks: ShrinkBlock[] = [];
  const shrinkLevel = Math.floor(gameState.turnCount / 20);
  
  if (shrinkLevel >= 3) return blocks; // Max shrink level reached
  
  // Generate 2x2 blocks from outer edges
  const blockPositions = getShrinkBlockPositions(shrinkLevel);
  
  blockPositions.forEach((pos) => {
    blocks.push({
      position: pos,
      turnsUntilShrink: 20,
      isWarning: true
    });
  });
  
  return blocks;
}

function getShrinkBlockPositions(level: number): Position[] {
  const positions: Position[] = [];
  
  // Less harsh shrinking: shrink individual squares from edges
  if (level === 0) {
    // First level: shrink outer corners and some edge squares
    positions.push({ row: 0, col: 0 });
    positions.push({ row: 0, col: 7 });
    positions.push({ row: 7, col: 0 });
    positions.push({ row: 7, col: 7 });
    positions.push({ row: 0, col: 1 });
    positions.push({ row: 1, col: 0 });
    positions.push({ row: 0, col: 6 });
    positions.push({ row: 1, col: 7 });
    positions.push({ row: 6, col: 0 });
    positions.push({ row: 7, col: 1 });
    positions.push({ row: 7, col: 6 });
    positions.push({ row: 6, col: 7 });
  } else if (level === 1) {
    // Second level: shrink more edge squares
    positions.push({ row: 0, col: 2 });
    positions.push({ row: 0, col: 3 });
    positions.push({ row: 0, col: 4 });
    positions.push({ row: 0, col: 5 });
    positions.push({ row: 2, col: 0 });
    positions.push({ row: 3, col: 0 });
    positions.push({ row: 4, col: 0 });
    positions.push({ row: 5, col: 0 });
    positions.push({ row: 7, col: 2 });
    positions.push({ row: 7, col: 3 });
    positions.push({ row: 7, col: 4 });
    positions.push({ row: 7, col: 5 });
    positions.push({ row: 2, col: 7 });
    positions.push({ row: 3, col: 7 });
    positions.push({ row: 4, col: 7 });
    positions.push({ row: 5, col: 7 });
  } else if (level === 2) {
    // Third level: shrink remaining outer ring
    positions.push({ row: 1, col: 1 });
    positions.push({ row: 1, col: 2 });
    positions.push({ row: 1, col: 3 });
    positions.push({ row: 1, col: 4 });
    positions.push({ row: 1, col: 5 });
    positions.push({ row: 1, col: 6 });
    positions.push({ row: 2, col: 1 });
    positions.push({ row: 3, col: 1 });
    positions.push({ row: 4, col: 1 });
    positions.push({ row: 5, col: 1 });
    positions.push({ row: 6, col: 1 });
    positions.push({ row: 6, col: 2 });
    positions.push({ row: 6, col: 3 });
    positions.push({ row: 6, col: 4 });
    positions.push({ row: 6, col: 5 });
    positions.push({ row: 6, col: 6 });
    positions.push({ row: 2, col: 6 });
    positions.push({ row: 3, col: 6 });
    positions.push({ row: 4, col: 6 });
    positions.push({ row: 5, col: 6 });
  }
  
  return positions;
}

export function applyShrinkBlocks(gameState: GameState): GameState {
  const newShrunkSquares = new Set(gameState.shrunkSquares);
  const newBoard = gameState.board.map(row => [...row]);
  const newShrinkBlocks = [...gameState.shrinkBlocks];
  
  // Process blocks that are ready to shrink
  const blocksToShrink = newShrinkBlocks.filter(block => block.turnsUntilShrink <= 0);
  
  blocksToShrink.forEach(block => {
    const { position } = block;
    const key = positionKey(position);
    newShrunkSquares.add(key);
    
    // Check if king is on this square and teleport if needed
    const piece = newBoard[position.row][position.col];
    if (piece && piece.type === 'king') {
      const safePosition = findNearestSafeSquare(newBoard, position, newShrunkSquares);
      if (safePosition) {
        // Teleport king to safe position
        newBoard[safePosition.row][safePosition.col] = {
          ...piece,
          isTeleporting: true // Add teleport animation flag
        };
        newBoard[position.row][position.col] = null;
        
        // Play teleport sound
        playSound('teleport');
      } else {
        // Emergency: No safe square found!
        console.warn('EMERGENCY: No safe square found for king teleport!');
        playSound('emergency');
        // Keep king but mark as emergency
        newBoard[position.row][position.col] = {
          ...piece,
          isEmergency: true
        };
      }
    } else {
      // Remove piece from shrunk square
      newBoard[position.row][position.col] = null;
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

export function updateAndApplyShrinkBlocks(gameState: GameState): GameState {
  let newGameState = { ...gameState };
  const currentTurn = newGameState.turnCount;
  const shrinkCycle = 12; // Speed up to 12 turns per shrink cycle
  const cyclePosition = currentTurn % shrinkCycle;
  const shrinkLevel = Math.floor(currentTurn / shrinkCycle);

  // Generate warning blocks at the start of each cycle (turn 1, 31, 61, etc.)
  let blocks = [...newGameState.shrinkBlocks];
  
  if (cyclePosition === 1 && shrinkLevel < 3) {
    // Generate new warning blocks for this cycle
    const newBlocks = generateShrinkBlocks({
      ...newGameState,
      turnCount: shrinkLevel * shrinkCycle // Use shrink level for block generation
    });
    blocks = newBlocks.map(block => ({ 
      ...block, 
      turnsUntilShrink: shrinkCycle - 5, // Shrink 5 turns before cycle ends
      isWarning: true 
    }));
  } else if (blocks.length > 0) {
    // Decrement existing blocks countdown
    blocks = blocks.map(block => ({
      ...block,
      turnsUntilShrink: block.turnsUntilShrink - 1
    }));
  }

  // Apply shrinking when countdown reaches 0
  const blocksToApply = blocks.filter(block => block.turnsUntilShrink <= 0);
  if (blocksToApply.length > 0) {
    newGameState = applyShrinkBlocks({
      ...newGameState,
      shrinkBlocks: blocks
    });
    // Remove applied blocks
    blocks = blocks.filter(block => block.turnsUntilShrink > 0);
  }

  return {
    ...newGameState,
    shrinkBlocks: blocks
  };
}
