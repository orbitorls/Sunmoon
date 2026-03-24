import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface VoteCardProps {
  id: string;
  name: string;
  description: string;
  team: string;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function VoteCard({ id, name, description, team, selected, onSelect }: VoteCardProps) {
  return (
    <div
      onClick={() => onSelect(id)}
      className={`relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-[1.02] ${
        selected
          ? 'ring-4 ring-pink-400 ring-offset-2 ring-offset-purple-900 shadow-lg shadow-pink-500/30'
          : 'ring-1 ring-white/20 hover:ring-white/40'
      }`}
    >
      <div className="bg-gradient-to-br from-white/10 to-white/5 p-6">
        {/* Selection Indicator */}
        <div className="absolute top-4 right-4">
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selected ? 'bg-pink-500 border-pink-400' : 'border-white/40 bg-white/10'
            }`}
          >
            {selected && <CheckCircle2 className="w-4 h-4 text-white" />}
          </div>
        </div>
        {/* Project Info */}
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shrink-0">
            {id.split('-')[1]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-1 truncate">{name}</h3>
            <p className="text-white/60 text-sm mb-2 line-clamp-2">{description}</p>
            <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs text-white/80">{team}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
