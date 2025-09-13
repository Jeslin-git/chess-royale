import { ChessPiece, PieceType, PieceColor, Position, Move } from '../types/chess';

export const PIECE_VALUES = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 100
};

export function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}

export function positionKey(pos: Position): string {
  return `${pos.row}-${pos.col}`;
}

export function isValidMove(
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position,
  shrunkSquares: Set<string>
): boolean {
  if (!isValidPosition(from) || !isValidPosition(to)) return false;
  if (shrunkSquares.has(positionKey(to))) return false;
  
  const piece = board[from.row][from.col];
  if (!piece) return false;
  
  const target = board[to.row][to.col];
  if (target && target.color === piece.color) return false;
  
  return isValidPieceMove(board, piece, from, to);
}

function isValidPieceMove(
  board: (ChessPiece | null)[][],
  piece: ChessPiece,
  from: Position,
  to: Position
): boolean {
  const dx = to.col - from.col;
  const dy = to.row - from.row;
  
  switch (piece.type) {
    case 'pawn':
      return isValidPawnMove(board, piece, from, to, dx, dy);
    case 'rook':
      return isValidRookMove(board, from, to, dx, dy);
    case 'bishop':
      return isValidBishopMove(board, from, to, dx, dy);
    case 'queen':
      return isValidQueenMove(board, from, to, dx, dy);
    case 'king':
      return isValidKingMove(dx, dy);
    case 'knight':
      return isValidKnightMove(dx, dy);
    default:
      return false;
  }
}

function isValidPawnMove(
  board: (ChessPiece | null)[][],
  piece: ChessPiece,
  from: Position,
  to: Position,
  dx: number,
  dy: number
): boolean {
  const direction = piece.color === 'white' ? -1 : 1;
  const target = board[to.row][to.col];
  
  // Moving forward
  if (dx === 0) {
    if (target) return false; // Can't move forward to occupied square
    if (dy === direction) return true; // Single step forward
    if (dy === 2 * direction && !piece.hasMoved && !board[from.row + direction][from.col]) {
      return true; // Double step from starting position
    }
  }
  
  // Diagonal capture
  if (Math.abs(dx) === 1 && dy === direction && target && target.color !== piece.color) {
    return true;
  }
  
  return false;
}

function isValidRookMove(
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position,
  dx: number,
  dy: number
): boolean {
  if (dx !== 0 && dy !== 0) return false; // Must be horizontal or vertical
  return isPathClear(board, from, to);
}

function isValidBishopMove(
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position,
  dx: number,
  dy: number
): boolean {
  if (Math.abs(dx) !== Math.abs(dy)) return false; // Must be diagonal
  return isPathClear(board, from, to);
}

function isValidQueenMove(
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position,
  dx: number,
  dy: number
): boolean {
  // Queen moves like rook or bishop
  if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) {
    return isPathClear(board, from, to);
  }
  return false;
}

function isValidKingMove(dx: number, dy: number): boolean {
  return Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0);
}

function isValidKnightMove(dx: number, dy: number): boolean {
  return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || 
         (Math.abs(dx) === 1 && Math.abs(dy) === 2);
}

function isPathClear(
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position
): boolean {
  const dx = Math.sign(to.col - from.col);
  const dy = Math.sign(to.row - from.row);
  
  let currentRow = from.row + dy;
  let currentCol = from.col + dx;
  
  while (currentRow !== to.row || currentCol !== to.col) {
    if (board[currentRow][currentCol] !== null) {
      return false;
    }
    currentRow += dy;
    currentCol += dx;
  }
  
  return true;
}

export function getAllPossibleMoves(
  board: (ChessPiece | null)[][],
  color: PieceColor,
  shrunkSquares: Set<string>
): Move[] {
  const moves: Move[] = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const from = { row, col };
        
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            const to = { row: toRow, col: toCol };
            if (isValidMove(board, from, to, shrunkSquares)) {
              moves.push({
                from,
                to,
                piece,
                captured: board[to.row][to.col]
              });
            }
          }
        }
      }
    }
  }
  
  return moves;
}

export function evaluatePosition(board: (ChessPiece | null)[][], color: PieceColor): number {
  let score = 0;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const value = PIECE_VALUES[piece.type];
        if (piece.color === color) {
          score += value;
        } else {
          score -= value;
        }
      }
    }
  }
  
  return score;
}