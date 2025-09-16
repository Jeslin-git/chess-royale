import React from 'react';
import { TriviaTile } from '../types/chess';
import { getPowerUpDescription } from '../utils/powerupLogic';
import { Shield, Zap, Target, ArrowRight } from 'lucide-react';

interface TriviaModalProps {
  isOpen: boolean;
  onClose: () => void;
  triviaTile: TriviaTile | null;
  onAnswer: (isCorrect: boolean) => void;
}

export function TriviaModal({ isOpen, onClose, triviaTile, onAnswer }: TriviaModalProps) {
  if (!isOpen || !triviaTile) return null;

  const allAnswers = [...triviaTile.incorrectAnswers, triviaTile.correctAnswer].sort();
  
  const handleAnswerClick = (answer: string) => {
    const isCorrect = answer === triviaTile.correctAnswer;
    onAnswer(isCorrect);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Trivia Time!</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold">×</button>
        </div>

        <div className="mb-4">
          <p className="font-semibold text-lg text-gray-700 mb-2" dangerouslySetInnerHTML={{ __html: triviaTile.question }} />
        </div>

        <div className="grid grid-cols-1 gap-3">
          {allAnswers.map((answer, index) => (
            <button
              key={index}
              onClick={() => handleAnswerClick(answer)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 p-3 rounded-lg text-left font-medium transition-colors"
              dangerouslySetInnerHTML={{ __html: answer }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}