import React from 'react';
import { GameState } from '../types/chess';
import { Crown, Clock, Target, Zap, Shield, Star, Zap as PowerUpIcon } from 'lucide-react';

interface GameInfoProps {
  gameState: GameState;
}

export function GameInfo({ gameState }: GameInfoProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Crown className="w-6 h-6 text-yellow-600" />
        <h2 className="text-xl font-bold text-gray-800">Battle Royale Chess</h2>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-gray-700">Current Player</span>
          </div>
          <div className={`capitalize font-bold ${gameState.currentPlayer === 'white' ? 'text-blue-600' : 'text-red-600'}`}>
            {gameState.currentPlayer === 'white' ? 'Your Turn' : 'Computer Turn'}
          </div>
          {gameState.currentPlayer === 'black' && (
            <div className="text-xs text-gray-500 mt-1">Computer is thinking...</div>
          )}
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-gray-700">Turn</span>
          </div>
          <div className="font-bold text-green-600">
            {gameState.turnCount}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${((gameState.turnCount % 16) / 16) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Progress to next shrink</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-red-600" />
            <span className="font-semibold text-gray-700">Next Shrink</span>
          </div>
          <div className="font-bold text-red-600">
            {16 - (gameState.turnCount % 16)} turns
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-gray-700">Next Respawn</span>
          </div>
          <div className="font-bold text-purple-600">
            {15 - (gameState.turnCount % 15)} turns
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((gameState.turnCount % 15) / 15) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {gameState.gamePhase === 'gameOver' && gameState.winner && (
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-6 h-6 text-white" />
            <span className="text-white font-bold text-lg">Game Over!</span>
          </div>
          <div className="text-white font-bold capitalize">
            {gameState.winner} Wins!
          </div>
        </div>
      )}
      
      {gameState.capturedPieces.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="font-semibold text-gray-700 mb-2">
            Captured Pieces ({gameState.capturedPieces.length})
          </div>
          <div className="text-sm text-gray-600">
            Next piece will respawn in {15 - (gameState.turnCount % 15)} turns
          </div>
        </div>
      )}
      
      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-3 border border-yellow-200">
        <div className="flex items-center gap-2 mb-2">
          <PowerUpIcon className="w-4 h-4 text-yellow-600" />
          <span className="font-semibold text-gray-700">Power-ups</span>
        </div>
        <div className="text-sm text-gray-600 mb-2">
          {gameState.powerUps.length} available on board
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Your Power-up:</span>
            <span className="text-xs font-bold text-blue-600">
              {gameState.playerPowerUps.get('white')?.type || 'None'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Computer Power-up:</span>
            <span className="text-xs font-bold text-red-600">
              {gameState.playerPowerUps.get('black')?.type || 'None'}
            </span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          Next spawn: {12 - (gameState.turnCount % 12)} turns
        </div>
      </div>
      
      {gameState.shrinkBlocks.length > 0 && (
        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-red-600" />
            <span className="font-semibold text-red-700">Warning</span>
          </div>
          <div className="text-sm text-red-600">
            Board will shrink soon!
          </div>
        </div>
      )}
    </div>
  );
}