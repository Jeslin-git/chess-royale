import { GameState, ChessPiece, Position, PieceType, PieceColor } from '../types/chess';
import { playSound } from './soundEffects';

export function processPieceTransformations(gameState: GameState): GameState {
  const newBoard = gameState.board.map(row => [...row]);
  
  // Only allow transformations every 25 turns to make them special events
  if (gameState.turnCount % 25 !== 0 || gameState.turnCount === 0) {
    return gameState;
  }
  
  // Process transformations for each color separately
  const colors: PieceColor[] = ['white', 'black'];
  
  for (const color of colors) {
    // Find all pawns of this color that can transform
    const eligiblePawns: { piece: ChessPiece; position: Position }[] = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = newBoard[row][col];
        if (piece && piece.color === color && piece.type === 'pawn' && 
            (piece.turnsWithoutMoving || 0) >= 5) {
          eligiblePawns.push({ piece, position: { row, col } });
        }
      }
    }
    
    // Transform only ONE random pawn per side
    if (eligiblePawns.length > 0) {
      const randomIndex = Math.floor(Math.random() * eligiblePawns.length);
      const { piece, position } = eligiblePawns[randomIndex];
      
      // Weighted transformation probabilities
      const transformationType = getWeightedTransformation();
      
      newBoard[position.row][position.col] = {
        ...piece,
        type: transformationType,
        isTransformed: true,
        transformationType: 'veteran',
        turnsWithoutMoving: 0
      };
      
      playSound('powerup');
    }
  }
  
  return {
    ...gameState,
    board: newBoard
  };
}

function getWeightedTransformation(): PieceType {
  const transformations = [
    { type: 'knight' as PieceType, weight: 40 },  // 40% chance
    { type: 'bishop' as PieceType, weight: 30 },  // 30% chance  
    { type: 'rook' as PieceType, weight: 20 },    // 20% chance
    { type: 'queen' as PieceType, weight: 10 }    // 10% chance (rare)
  ];
  
  const totalWeight = transformations.reduce((sum, t) => sum + t.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const transformation of transformations) {
    random -= transformation.weight;
    if (random <= 0) {
      return transformation.type;
    }
  }
  
  return 'knight'; // Fallback
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
