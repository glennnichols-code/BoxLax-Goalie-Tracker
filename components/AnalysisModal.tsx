import React, { useEffect, useState } from 'react';
import { Shot } from '../types';
import { analyzeGame } from '../services/geminiService';
import { Loader2, BrainCircuit, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AnalysisModalProps {
  shots: Shot[];
  isOpen: boolean;
  onClose: () => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ shots, isOpen, onClose }) => {
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && shots.length > 0 && !analysis) {
      setLoading(true);
      analyzeGame(shots)
        .then(text => setAnalysis(text))
        .catch(() => setAnalysis("Could not load analysis."))
        .finally(() => setLoading(false));
    }
  }, [isOpen, shots, analysis]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2 text-emerald-400">
            <BrainCircuit className="w-6 h-6" />
            <h2 className="text-lg font-bold tracking-wide">Coach's AI Report</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-300 leading-relaxed">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-sm font-mono text-emerald-500/80">Analyzing Shot Data...</p>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
           <button 
             onClick={onClose}
             className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors"
           >
             Close Report
           </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
