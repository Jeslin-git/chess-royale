import { useEffect } from 'react';
import { GameState } from '../types/chess';

interface UseGameTimerProps {
  gameState: GameState;
  onShrink: () => void;
  onRespawn: () => void;
  onTimerTick: () => void;
}

export function useGameTimer({ gameState, onShrink, onRespawn, onTimerTick }: UseGameTimerProps) {
  useEffect(() => {
    if (gameState.gamePhase !== 'playing') return;
    
    const interval = setInterval(() => {
      onTimerTick();
      
      if (gameState.timeUntilShrink <= 1) {
        onShrink();
      }
      
      if (gameState.timeUntilRespawn <= 1 && gameState.capturedPieces.length > 0) {
        onRespawn();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState, onShrink, onRespawn, onTimerTick]);
}