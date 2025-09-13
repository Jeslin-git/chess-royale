import React from 'react';
import { ChessPiece as ChessPieceType } from '../types/chess';

interface ChessPieceProps {
  piece: ChessPieceType;
  isDragging?: boolean;
  onClick?: () => void;
}

const pieceSymbols: Record<string, string> = {
  'white-king': '♔',
  'white-queen': '♕',
  'white-rook': '♖',
  'white-bishop': '♗',
  'white-knight': '♘',
  'white-pawn': '♙',
  'black-king': '♚',
  'black-queen': '♛',
  'black-rook': '♜',
  'black-bishop': '♝',
  'black-knight': '♞',
  'black-pawn': '♟',
};

export function ChessPiece({ piece, isDragging, onClick }: ChessPieceProps) {
  const symbol = pieceSymbols[`${piece.color}-${piece.type}`];
  
  return (
    <div
      className={`
        text-4xl cursor-pointer select-none transition-all duration-200
        hover:scale-110 hover:drop-shadow-lg
        ${isDragging ? 'opacity-70 scale-110' : ''}
        ${piece.color === 'white' ? 'text-gray-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900 drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)]'}
      `}
      onClick={onClick}
    >
      {symbol}
    </div>
  );
}