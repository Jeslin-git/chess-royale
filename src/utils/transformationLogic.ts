import { GameState, ChessPiece, Position } from '../types/chess';
import { positionKey } from './chessLogic';

export function processPieceTransformations(gameState: GameState): GameState {
  const newBoard = gameState.board.map(row => [...row]);
  let hasTransformations = false;
  
  // Process each piece for transformations
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = newBoard[row][col];
      if (!piece) continue;
      
      // Check for fusion (two allied pieces on same square)
      const fusionResult = checkFusion(newBoard, { row, col }, piece);
      if (fusionResult) {
        newBoard[row][col] = fusionResult;
        hasTransformations = true;
        continue;
      }
      
      // Check for veteran transformation (piece hasn't moved for N turns)
      const veteranResult = checkVeteranTransformation(piece);
      if (veteranResult) {
        newBoard[row][col] = veteranResult;
        hasTransformations = true;
      }
    }
  }
  
  return {
    ...gameState,
    board: newBoard
  };
}

function checkFusion(board: (ChessPiece | null)[][], position: Position, piece: ChessPiece): ChessPiece | null {
  // Check if there are multiple pieces of the same color on this square
  // This would happen if two pieces moved to the same square
  const piecesOnSquare = board[position.row][position.col];
  if (!piecesOnSquare || piecesOnSquare.id === piece.id) return null;
  
  // Create fusion piece
  const fusionMoves = combineMovementPatterns(piece.type, piecesOnSquare.type);
  
  return {
    ...piece,
    isTransformed: true,
    transformationType: 'fusion',
    fusionMoves,
    id: `${piece.id}-fusion-${Date.now()}`
  };
}

function checkVeteranTransformation(piece: ChessPiece): ChessPiece | null {
  const TURNS_FOR_VETERAN = 5; // Pieces become veteran after 5 turns without moving
  
  if (!piece.turnsWithoutMoving || piece.turnsWithoutMoving < TURNS_FOR_VETERAN) {
    return null;
  }
  
  // Upgrade piece based on type
  const upgradedType = getVeteranUpgrade(piece.type);
  if (upgradedType === piece.type) return null; // No upgrade available
  
  return {
    ...piece,
    type: upgradedType,
    isTransformed: true,
    transformationType: 'veteran',
    turnsWithoutMoving: 0 // Reset counter
  };
}

function combineMovementPatterns(type1: string, type2: string): string[] {
  // Combine movement patterns for fusion pieces
  const patterns = new Set([type1, type2]);
  
  // Add special combinations
  if (patterns.has('knight') && patterns.has('bishop')) {
    patterns.add('queen'); // Knight + Bishop = Queen-like movement
  }
  if (patterns.has('rook') && patterns.has('bishop')) {
    patterns.add('queen'); // Rook + Bishop = Queen
  }
  if (patterns.has('pawn') && patterns.has('knight')) {
    patterns.add('knight'); // Pawn + Knight = Enhanced Knight
  }
  
  return Array.from(patterns);
}

function getVeteranUpgrade(currentType: string): string {
  const upgrades: Record<string, string> = {
    'pawn': 'knight',
    'knight': 'bishop',
    'bishop': 'rook',
    'rook': 'queen',
    'queen': 'queen', // Queen is already max
    'king': 'king'    // King never upgrades
  };
  
  return upgrades[currentType] || currentType;
}

export function updatePieceMovementCounters(gameState: GameState): GameState {
  const newBoard = gameState.board.map(row => 
    row.map(piece => {
      if (!piece) return null;
      
      return {
        ...piece,
        turnsWithoutMoving: (piece.turnsWithoutMoving || 0) + 1
      };
    })
  );
  
  return {
    ...gameState,
    board: newBoard
  };
}

export function resetMovementCounter(piece: ChessPiece): ChessPiece {
  return {
    ...piece,
    turnsWithoutMoving: 0
  };
}
