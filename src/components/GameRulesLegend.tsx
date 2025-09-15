import { Crown, Zap, Shield, Star, Target, Clock, AlertTriangle, Sparkles } from 'lucide-react';

interface GameRulesLegendProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameRulesLegend({ isOpen, onClose }: GameRulesLegendProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-600" />
            Battle Royale Chess Rules
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Rules */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Basic Rules</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Crown className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-semibold">Win Condition</div>
                  <div className="text-sm text-gray-600">Checkmate your opponent's king. Standard chess checkmate rules apply.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <div className="font-semibold">Check & Checkmate</div>
                  <div className="text-sm text-gray-600">When in check, you must move to escape. If no legal moves exist, it's checkmate.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold">Turn-Based</div>
                  <div className="text-sm text-gray-600">Players alternate turns. White (you) vs Black (computer).</div>
                </div>
              </div>
            </div>
          </div>

          {/* Battle Royale Mechanics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Battle Royale Features</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <div className="font-semibold">Board Shrinking</div>
                  <div className="text-sm text-gray-600">Every 12 turns, board edges shrink. Kings teleport to safety if caught.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <div className="font-semibold">Piece Respawning</div>
                  <div className="text-sm text-gray-600">Captured pieces respawn every 15 turns at random safe locations.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-semibold">Transformations</div>
                  <div className="text-sm text-gray-600">Every 12 turns, one random pawn per side transforms into a stronger piece.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Indicators */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Visual Indicators</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-green-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-semibold">Green Dots</div>
                  <div className="text-sm text-gray-600">Valid move destinations for selected piece.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-red-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-semibold">Red Squares</div>
                  <div className="text-sm text-gray-600">Shrinking warning - these squares will disappear soon.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-yellow-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-semibold">Yellow Glow</div>
                  <div className="text-sm text-gray-600">Power-ups available for collection.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-purple-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-semibold">"V" Symbol</div>
                  <div className="text-sm text-gray-600">Veteran/transformed pieces with enhanced abilities.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Power-ups */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Power-ups</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold">Shield</div>
                  <div className="text-sm text-gray-600">Protects a piece from being captured for several turns.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-semibold">Lightning</div>
                  <div className="text-sm text-gray-600">Allows a piece to move twice in one turn.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <div className="font-semibold">Trap</div>
                  <div className="text-sm text-gray-600">Places a hidden trap that captures the next enemy piece to step on it.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Crown className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <div className="font-semibold">Teleport</div>
                  <div className="text-sm text-gray-600">Instantly moves your king to any safe square on the board.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-semibold text-blue-800">Strategy Tips</div>
              <div className="text-sm text-blue-700 mt-1">
                • Keep your king safe from checks and shrinking zones
                • Collect power-ups when safe to do so
                • Use the shrinking board to your tactical advantage
                • Plan for piece respawns and transformations
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
