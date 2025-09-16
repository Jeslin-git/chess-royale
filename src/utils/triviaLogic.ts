import { TriviaTile, Position, GameState, PieceColor } from '../types/chess';
import { positionKey } from './chessLogic';

const API_ENDPOINT = 'https://opentdb.com/api.php?amount=1&type=multiple&encode=base64';

interface TriviaResponse {
  response_code: number;
  results: {
    category: string;
    type: string;
    difficulty: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }[];
}

export async function fetchTriviaQuestion(position: Position): Promise<TriviaTile | null> {
  try {
    const response = await fetch(API_ENDPOINT);
    const data: TriviaResponse = await response.json();

    if (data.response_code !== 0 || data.results.length === 0) {
      console.error('Failed to fetch trivia question from API.');
      return null;
    }

    const result = data.results[0];
    const decoder = new TextDecoder('utf-8');
    const decodeBase64 = (str: string) => decoder.decode(Uint8Array.from(atob(str), c => c.charCodeAt(0)));

    return {
      id: `trivia-tile-${positionKey(position)}`,
      position,
      question: decodeBase64(result.question),
      correctAnswer: decodeBase64(result.correct_answer),
      incorrectAnswers: result.incorrect_answers.map(decodeBase64),
    };
  } catch (error) {
    console.error('Error fetching trivia question:', error);
    return null;
  }
}

export function spawnTriviaTiles(gameState: GameState): GameState {
  const SPAWN_INTERVAL = 10;

  if (gameState.turnCount % SPAWN_INTERVAL !== 0 || gameState.turnCount === 0) {
    return gameState;
  }

  const newTriviaTiles = [...gameState.triviaTiles];
  const position = findSafeTilePosition(gameState);

  if (position) {
    newTriviaTiles.push({
      id: `trivia-tile-${positionKey(position)}`,
      position,
      question: '',
      correctAnswer: '',
      incorrectAnswers: [],
    });
  }

  return {
    ...gameState,
    triviaTiles: newTriviaTiles
  };
}

function findSafeTilePosition(gameState: GameState): Position | null {
  const availableSquares: Position[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const pos = { row, col };
      const key = positionKey(pos);

      if (!gameState.shrunkSquares.has(key) &&
          !gameState.board[row][col] &&
          !gameState.powerUps.some(p => p.position.row === row && p.position.col === col)) {
        availableSquares.push(pos);
      }
    }
  }

  if (availableSquares.length === 0) return null;

  return availableSquares[Math.floor(Math.random() * availableSquares.length)];
}