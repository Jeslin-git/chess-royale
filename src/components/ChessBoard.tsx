import React from 'react';
import { GameState, Position, ChessPiece as ChessPieceType, ShrinkBlock, PowerUp } from '../types/chess';
import { ChessPiece } from './ChessPiece';
import { positionKey, isInCheck } from '../utils/chessLogic';

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
  
  // Simplified visual indicators for individual squares
  const isShrinkWarning = (row: number, col: number): boolean => {
    return gameState.shrinkBlocks.some(block => 
      block.isWarning && 
      block.position.row === row && block.position.col === col
    );
  };

  const getShrinkWarningLevel = (row: number, col: number): number => {
    const block = gameState.shrinkBlocks.find(block => 
      block.isWarning && 
      block.position.row === row && block.position.col === col
    );
    return block ? block.turnsUntilShrink : 0;
  };

  const isPowerUp = (row: number, col: number): PowerUp | null => {
    return gameState.powerUps.find(powerUp => 
      powerUp.position.row === row && powerUp.position.col === col
    ) || null;
  };

  const isKingInCheck = (row: number, col: number): boolean => {
    const piece = gameState.board[row][col];
    if (!piece || piece.type !== 'king') return false;
    
    return isInCheck(gameState.board, piece.color, gameState.shrunkSquares);
  };

  const getSquareClass = (row: number, col: number): string => {
    const baseClass = 'relative w-16 h-16 flex items-center justify-center transition-all duration-300';
    const isLight = (row + col) % 2 === 0;
    const key = positionKey({ row, col });
    
    let bgClass = isLight ? 'bg-amber-100' : 'bg-amber-800';
    
    if (gameState.shrunkSquares.has(key)) {
      bgClass = 'bg-red-600';
    } else if (isKingInCheck(row, col)) {
      bgClass = 'bg-red-500 animate-pulse ring-4 ring-red-300'; // King in check - flashing red
    } else if (isShrinkWarning(row, col)) {
      const warningLevel = getShrinkWarningLevel(row, col);
      if (warningLevel <= 1) {
        bgClass = 'bg-red-500 animate-pulse'; // Critical - about to shrink
      } else if (warningLevel <= 3) {
        bgClass = 'bg-red-400'; // Danger - very soon
      } else if (warningLevel <= 5) {
        bgClass = 'bg-orange-400'; // Warning - soon
      } else if (warningLevel <= 10) {
        bgClass = 'bg-yellow-400'; // Caution - moderate time
      } else {
        bgClass = 'bg-yellow-200'; // Early warning - plenty of time
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
                {piece && (
                  <div className={`
                    ${piece.isTeleporting ? 'king-teleport' : ''}
                    ${piece.isEmergency ? 'emergency-warning' : ''}
                    ${piece.isRespawning ? 'respawn-lightning respawn-shockwave' : ''}
                    ${piece.isTransformed && piece.transformationType === 'veteran' ? 'veteran-glow' : ''}
                    ${piece.isTransformed && piece.transformationType === 'fusion' ? 'fusion-glow' : ''}
                  `}>
                    <ChessPiece piece={piece} />
                    {/* Transformation indicator */}
                    {piece.isTransformed && (
                      <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {piece.transformationType === 'veteran' ? 'V' : 'F'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
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
                
                {/* Enhanced Power-up indicator */}
                {isPowerUp(row, col) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center powerup-icon shadow-lg">
                      <span className="text-white text-sm font-bold">
                        {isPowerUp(row, col)?.type === 'teleport' ? '⚡' :
                         isPowerUp(row, col)?.type === 'shield' ? '🛡️' :
                         isPowerUp(row, col)?.type === 'extraMove' ? '⏩' : '💥'}
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