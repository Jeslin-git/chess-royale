export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';
export type Position = { row: number; col: number };

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  id: string;
  hasMoved?: boolean;
  turnsWithoutMoving?: number;
  isTransformed?: boolean;
  transformationType?: 'fusion' | 'veteran';
  fusionMoves?: PieceType[];
  isTeleporting?: boolean;
  isEmergency?: boolean;
  isRespawning?: boolean;
}

export interface PowerUp {
  id: string;
  type: 'teleport' | 'shield' | 'extraMove' | 'trap';
  position: Position;
  turnsUntilDespawn: number;
}

export interface ShrinkBlock {
  position: Position;
  turnsUntilShrink: number;
  isWarning: boolean;
}

export interface GameState {
  board: (ChessPiece | null)[][];
  currentPlayer: PieceColor;
  gamePhase: 'setup' | 'playing' | 'shrinking' | 'gameOver';
  winner: PieceColor | 'draw' | null;
  shrunkSquares: Set<string>;
  capturedPieces: ChessPiece[];
  turnCount: number;
  timeUntilShrink: number;
  timeUntilRespawn: number;
  powerUps: PowerUp[];
  shrinkBlocks: ShrinkBlock[];
  playerPowerUps: Map<PieceColor, PowerUp | null>;
  respawnQueue: { player: PieceColor; piece: ChessPiece }[];
  trapSquares: Set<string>;
  shieldedPieces: Set<string>;
}

export interface Move {
  from: Position;
  to: Position;
  piece: ChessPiece;
  captured?: ChessPiece;
  usedPowerUp?: PowerUp;
}