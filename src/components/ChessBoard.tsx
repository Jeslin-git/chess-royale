import React from 'react';
import { GameState, Position, ChessPiece as ChessPieceType, ShrinkBlock, PowerUp } from '../types/chess';
import { ChessPiece } from './ChessPiece';
import { positionKey } from '../utils/chessLogic';

interface ChessBoardProps {
  gameState: GameState;
  selectedSquare: Position | null;
  validMoves: Position[];
  onSquareClick: (position: Position) => void;
}

export function ChessBoard({ gameState, selectedSquare, validMoves, onSquareClick }: ChessBoardProps) {
  const isSquareSelected = (row: number, col: number): boolean => {
    return selectedSquare?.row === row && selectedSquare?.col === col;
  };
  
  const isValidMoveSquare = (row: number, col: number): boolean => {
    return validMoves.some(move => move.row === row && move.col === col);
  };
  
  // Simplified visual indicators
  const isShrinkWarning = (row: number, col: number): boolean => {
    return gameState.shrinkBlocks.some(block => 
      block.isWarning && 
      row >= block.position.row && row < block.position.row + 2 &&
      col >= block.position.col && col < block.position.col + 2
    );
  };

  const getShrinkWarningLevel = (row: number, col: number): number => {
    const block = gameState.shrinkBlocks.find(block => 
      block.isWarning && 
      row >= block.position.row && row < block.position.row + 2 &&
      col >= block.position.col && col < block.position.col + 2
    );
    return block ? block.turnsUntilShrink : 0;
  };

  const isPowerUp = (row: number, col: number): PowerUp | null => {
    return gameState.powerUps.find(powerUp => 
      powerUp.position.row === row && powerUp.position.col === col
    ) || null;
  };

  const isTrapSquare = (row: number, col: number): boolean => {
    return false; // Disable traps for now
  };

  const getSquareClass = (row: number, col: number): string => {
    const baseClass = 'relative w-16 h-16 flex items-center justify-center transition-all duration-300';
    const isLight = (row + col) % 2 === 0;
    const key = positionKey({ row, col });
    
    let bgClass = isLight ? 'bg-amber-100' : 'bg-amber-800';
    
    if (gameState.shrunkSquares.has(key)) {
      bgClass = 'bg-red-600';
    } else if (isShrinkWarning(row, col)) {
      const warningLevel = getShrinkWarningLevel(row, col);
      if (warningLevel === 1) {
        bgClass = 'bg-red-400';
      } else if (warningLevel === 2) {
        bgClass = 'bg-orange-400';
      } else {
        bgClass = 'bg-yellow-400';
      }
    } else if (isSquareSelected(row, col)) {
      bgClass = isLight ? 'bg-blue-300' : 'bg-blue-600';
    } else if (isValidMoveSquare(row, col)) {
      bgClass = isLight ? 'bg-green-300' : 'bg-green-600';
    }
    
    return `${baseClass} ${bgClass} hover:brightness-110`;
  };

  return (
    <div className="inline-block border-4 border-amber-900 rounded-lg overflow-hidden shadow-2xl">
      {/* Turn indicator */}
      <div className={`text-center py-2 text-sm font-bold ${gameState.currentPlayer === 'white' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
        {gameState.currentPlayer === 'white' ? 'Your Turn - Click a piece to move' : 'Computer Turn - Please wait...'}
      </div>
      <div className="grid grid-cols-8 gap-0">
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => {
            const piece = gameState.board[row][col];
            const position = { row, col };
            
            return (
              <div
                key={`${row}-${col}`}
                className={getSquareClass(row, col)}
                onClick={() => onSquareClick(position)}
              >
                {piece && <ChessPiece piece={piece} />}
                {isValidMoveSquare(row, col) && !piece && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-white bg-opacity-50 rounded-full" />
                  </div>
                )}
                
                {/* Shrink warning countdown */}
                {isShrinkWarning(row, col) && (
                  <div className="absolute top-1 right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {getShrinkWarningLevel(row, col)}
                  </div>
                )}
                
                {/* Power-up indicator - simplified */}
                {isPowerUp(row, col) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {isPowerUp(row, col)?.type === 'teleport' ? 'T' : 
                         isPowerUp(row, col)?.type === 'shield' ? 'S' :
                         isPowerUp(row, col)?.type === 'extraMove' ? 'E' : 'T'}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Simple respawn indicator */}
                {piece && piece.id.includes('respawn') && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}