
import React, { useState, useMemo, useEffect } from 'react';
import FloorMap from './components/FloorMap';
import GoalMap from './components/GoalMap';
import AnalysisModal from './components/AnalysisModal';
import { AppState, GameSituation, Point, Shot, ShotResult, GameMetadata, GameSession } from './types';
import { Shield, Target, Activity, CheckCircle, Undo2, Play, BrainCircuit, History, Calendar, MapPin, Users, ChevronLeft, Save, ChevronUp, ChevronDown, Clock, Grip, AlertTriangle, PlayCircle } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  
  // -- Global Data --
  const [history, setHistory] = useState<GameSession[]>([]);

  // -- Current Game State --
  const [gameId, setGameId] = useState<string>(crypto.randomUUID());
  const [metadata, setMetadata] = useState<GameMetadata>({
    opponent: '',
    location: '',
    date: ''
  });
  const [shots, setShots] = useState<Shot[]>([]);
  
  // -- View Mode State (for History) --
  const [isReadOnly, setIsReadOnly] = useState(false);

  // -- Temporary Shot Construction --
  const [tempOrigin, setTempOrigin] = useState<Point | null>(null);
  const [tempPlacement, setTempPlacement] = useState<Point | null>(null);
  const [shotTime, setShotTime] = useState<string>("");
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState("15:00");
  
  // -- Modifiers State --
  const [modifiers, setModifiers] = useState({
      isPK: false,
      isRebound: false,
      isControlled: false
  });
  
  // -- Modals --
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('boxlax_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history on change
  useEffect(() => {
    localStorage.setItem('boxlax_history', JSON.stringify(history));
  }, [history]);

  // --- ACTIONS ---

  const initGameSetup = () => {
    setGameId(crypto.randomUUID());
    setShots([]);
    setCurrentPeriod(1);
    setTimeRemaining("15:00");
    setIsReadOnly(false);
    
    // Set default defaults
    const now = new Date();
    // Format for datetime-local: YYYY-MM-DDThh:mm
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    setMetadata({
      opponent: '',
      location: 'Home Arena',
      date: localIso
    });
    setAppState(AppState.GAME_SETUP);
  };

  const confirmStartGame = () => {
    if (!metadata.opponent.trim()) {
        // Simple validation
        setMetadata(prev => ({ ...prev, opponent: 'Unknown Opponent' }));
    }
    setAppState(AppState.RECORDING_ORIGIN);
  };

  const finishAndSaveGame = () => {
    const total = shots.length;
    const saves = shots.filter(s => s.result === ShotResult.SAVE).length;
    const goals = shots.filter(s => s.result === ShotResult.GOAL).length;
    const percentage = total === 0 ? 0 : Math.round((saves / total) * 100);

    const session: GameSession = {
        id: gameId,
        metadata,
        shots,
        stats: { total, saves, goals, percentage },
        timestamp: Date.now()
    };

    setHistory(prev => [session, ...prev]);
    setAppState(AppState.HOME);
  };

  const viewHistoryItem = (session: GameSession) => {
    setGameId(session.id);
    setMetadata(session.metadata);
    setShots(session.shots);
    setIsReadOnly(true);
    setAppState(AppState.SUMMARY);
  };

  // --- RECORDING LOGIC ---

  const handleOriginSelect = (point: Point) => {
    setTempOrigin(point);
    setAppState(AppState.RECORDING_PLACEMENT);
  };

  const handlePlacementSelect = (point: Point) => {
    setTempPlacement(point);
    setShotTime(timeRemaining);
    // Reset modifiers for new shot
    setModifiers({
        isPK: false,
        isRebound: false,
        isControlled: false
    });
    setAppState(AppState.RECORDING_DETAILS);
  };

  const saveShot = (result: ShotResult) => {
    if (!tempOrigin) return;

    setTimeRemaining(shotTime); // Sync time

    const situation = modifiers.isPK ? GameSituation.PENALTY_KILL : GameSituation.EVEN_STRENGTH;

    const newShot: Shot = {
      id: crypto.randomUUID(),
      origin: tempOrigin,
      placement: tempPlacement,
      result,
      situation,
      isRebound: modifiers.isRebound,
      isControlled: modifiers.isControlled,
      period: currentPeriod,
      timeRemaining: shotTime,
      timestamp: Date.now(),
    };

    setShots(prev => [...prev, newShot]);
    setTempOrigin(null);
    setTempPlacement(null);
    setAppState(AppState.RECORDING_ORIGIN);
  };

  const cancelShot = () => {
    setTempOrigin(null);
    setTempPlacement(null);
    setAppState(AppState.RECORDING_ORIGIN);
  };

  // Stats Memo
  const stats = useMemo(() => {
    const total = shots.length;
    const saves = shots.filter(s => s.result === ShotResult.SAVE).length;
    const goals = shots.filter(s => s.result === ShotResult.GOAL).length;
    const percentage = total === 0 ? 0 : Math.round((saves / total) * 100);
    return { total, saves, goals, percentage };
  }, [shots]);

  // Period Stats Memo
  const periodStats = useMemo(() => {
      const periods = Array.from(new Set(shots.map(s => s.period))).sort();
      return periods.map(p => {
          const pShots = shots.filter(s => s.period === p);
          const total = pShots.length;
          const saves = pShots.filter(s => s.result === ShotResult.SAVE).length;
          const goals = pShots.filter(s => s.result === ShotResult.GOAL).length;
          const pct = total === 0 ? 0 : Math.round((saves / total) * 100);
          return { period: p, total, saves, goals, pct };
      });
  }, [shots]);
  
  // Special Stats Memo
  const specialStats = useMemo(() => {
      // Controlled Saves
      const totalSaves = shots.filter(s => s.result === ShotResult.SAVE).length;
      const controlledSaves = shots.filter(s => s.result === ShotResult.SAVE && s.isControlled).length;
      const controlledPct = totalSaves === 0 ? 0 : Math.round((controlledSaves / totalSaves) * 100);

      // PK Stats
      const pkShots = shots.filter(s => s.situation === GameSituation.PENALTY_KILL);
      const pkTotal = pkShots.length;
      const pkSaves = pkShots.filter(s => s.result === ShotResult.SAVE).length;
      const pkPct = pkTotal === 0 ? 0 : Math.round((pkSaves / pkTotal) * 100);

      return { controlledSaves, controlledPct, pkTotal, pkSaves, pkPct };
  }, [shots]);


  // --- Time Picker Logic ---
  const handleTimeChange = (type: 'min' | 'sec', delta: number) => {
    const parts = shotTime.split(':');
    let m = parseInt(parts[0]) || 0;
    let s = parseInt(parts[1]) || 0;

    if (type === 'min') {
        m = Math.max(0, Math.min(60, m + delta));
    } else {
        s = s + delta;
        if (s >= 60) {
            s = 0;
            m = Math.min(60, m + 1);
        } else if (s < 0) {
            s = 59;
            m = Math.max(0, m - 1);
        }
    }

    setShotTime(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
  };


  // --- VIEWS ---

  if (appState === AppState.HOME) {
    return (
      <div className="flex flex-col items-center h-full p-6 bg-gradient-to-br from-slate-900 to-slate-800 overflow-y-auto">
        <div className="mt-10 mb-8 p-6 bg-emerald-500/10 rounded-full border border-emerald-500/30">
            <Shield className="w-20 h-20 text-emerald-400" />
        </div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2 text-center">
          BoxLax Tracker
        </h1>
        <p className="text-slate-400 mb-12 text-center max-w-xs">
          Advanced analytics for the modern box goalie.
        </p>

        <div className="w-full max-w-xs space-y-4">
            <button
            onClick={initGameSetup}
            className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
            >
            <Play className="w-6 h-6 fill-current" />
            START NEW GAME
            </button>

            <button
            onClick={() => setAppState(AppState.HISTORY)}
            className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-4 px-6 rounded-2xl shadow-lg border border-slate-600 transition-all transform active:scale-95"
            >
            <History className="w-6 h-6" />
            GAME HISTORY
            </button>
        </div>
      </div>
    );
  }

  if (appState === AppState.GAME_SETUP) {
      return (
          <div className="h-full bg-slate-900 p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setAppState(AppState.HOME)} className="p-2 bg-slate-800 rounded-full text-slate-400">
                      <ChevronLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-2xl font-bold text-white">Game Setup</h2>
              </div>

              <div className="space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-bold text-emerald-400 uppercase tracking-wider">
                          <Users className="w-4 h-4" /> Opponent Name
                      </label>
                      <input 
                        type="text" 
                        value={metadata.opponent}
                        onChange={(e) => setMetadata({...metadata, opponent: e.target.value})}
                        placeholder="e.g. Orangeville Northmen"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                      />
                  </div>

                  <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-bold text-blue-400 uppercase tracking-wider">
                          <MapPin className="w-4 h-4" /> Location
                      </label>
                      <input 
                        type="text" 
                        value={metadata.location}
                        onChange={(e) => setMetadata({...metadata, location: e.target.value})}
                        placeholder="Arena Name"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                  </div>

                   <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-bold text-purple-400 uppercase tracking-wider">
                          <Calendar className="w-4 h-4" /> Date & Time
                      </label>
                      <input 
                        type="datetime-local" 
                        value={metadata.date}
                        onChange={(e) => setMetadata({...metadata, date: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors [color-scheme:dark]"
                      />
                  </div>

                  <button 
                    onClick={confirmStartGame}
                    className="w-full mt-8 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                  >
                      FACE OFF
                  </button>
              </div>
          </div>
      )
  }

  if (appState === AppState.HISTORY) {
      return (
        <div className="h-full bg-slate-900 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center gap-4 bg-slate-900 z-10">
                <button onClick={() => setAppState(AppState.HOME)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                      <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-white">Game History</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <History className="w-12 h-12 mb-2 opacity-50" />
                        <p>No games recorded yet.</p>
                    </div>
                ) : (
                    history.map((game) => (
                        <div 
                            key={game.id}
                            onClick={() => viewHistoryItem(game)}
                            className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-slate-600 active:bg-slate-700 transition-colors cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-white text-lg">{game.metadata.opponent || "Unknown Opponent"}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(game.metadata.date).toLocaleDateString()} 
                                        <span className="text-slate-600">•</span>
                                        <MapPin className="w-3 h-3" />
                                        {game.metadata.location || "Unknown"}
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-sm font-black ${game.stats.percentage >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {game.stats.percentage}%
                                </div>
                            </div>
                            <div className="flex gap-4 text-sm">
                                <span className="text-slate-300"><strong className="text-white">{game.stats.saves}</strong> Saves</span>
                                <span className="text-slate-300"><strong className="text-white">{game.stats.goals}</strong> Goals</span>
                                <span className="text-slate-300"><strong className="text-white">{game.stats.total}</strong> Shots</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      );
  }

  if (appState === AppState.SUMMARY) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-slate-900">
        {/* Header */}
        <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">Summary: {metadata.opponent || 'Unknown'}</h2>
            <p className="text-xs text-slate-400">{new Date(metadata.date).toLocaleDateString()} @ {metadata.location}</p>
          </div>
          
          {!isReadOnly && (
             <button 
                onClick={() => setAppState(AppState.RECORDING_ORIGIN)}
                className="text-emerald-400 font-medium text-sm flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg"
             >
                <Undo2 className="w-4 h-4"/> Resume
             </button>
          )}
          {isReadOnly && (
             <button 
                onClick={() => setAppState(AppState.HISTORY)}
                className="text-slate-400 font-medium text-sm flex items-center gap-1 px-3 py-1.5"
             >
                Close
             </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Key Stats Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Save %</div>
                <div className={`text-2xl font-black ${stats.percentage >= 80 ? 'text-emerald-400' : stats.percentage >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {stats.percentage}
                </div>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Saves</div>
                <div className="text-2xl font-black text-white">{stats.saves}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Goals</div>
                <div className="text-2xl font-black text-white">{stats.goals}</div>
            </div>
          </div>
          
          {/* Period Breakdown */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-400 ml-1">PERIOD BREAKDOWN</h3>
            <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-900/50 text-slate-400 font-bold">
                        <tr>
                            <th className="p-3">Per</th>
                            <th className="p-3 text-center">Shots</th>
                            <th className="p-3 text-center">Saves</th>
                            <th className="p-3 text-center">Goals</th>
                            <th className="p-3 text-right">SV%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {periodStats.map(stat => (
                            <tr key={stat.period}>
                                <td className="p-3 font-mono font-bold text-slate-200">{stat.period}</td>
                                <td className="p-3 text-center text-slate-300">{stat.total}</td>
                                <td className="p-3 text-center text-slate-300">{stat.saves}</td>
                                <td className="p-3 text-center text-slate-300">{stat.goals}</td>
                                <td className={`p-3 text-right font-bold ${stat.pct >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>{stat.pct}%</td>
                            </tr>
                        ))}
                         {periodStats.length === 0 && (
                             <tr><td colSpan={5} className="p-4 text-center text-slate-500">No data</td></tr>
                         )}
                    </tbody>
                </table>
            </div>
          </div>

          {/* Special Stats */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                 <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Controlled Saves</div>
                 <div className="flex justify-between items-baseline">
                    <div className="text-xl font-bold text-blue-400">{specialStats.controlledSaves}</div>
                    <div className="text-sm text-slate-500">{specialStats.controlledPct}%</div>
                 </div>
             </div>
             <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                 <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Penalty Kill SV%</div>
                 <div className="flex justify-between items-baseline">
                    <div className="text-xl font-bold text-orange-400">{specialStats.pkPct}%</div>
                    <div className="text-sm text-slate-500">{specialStats.pkSaves}/{specialStats.pkTotal}</div>
                 </div>
             </div>
          </div>

          {/* Visualization Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-400 ml-1">GOAL HEATMAP (GOALS ALLOWED)</h3>
            <GoalMap shots={shots} heatmapMode={true} />
          </div>
          
          <div className="space-y-2">
             <h3 className="text-sm font-semibold text-slate-400 ml-1">SHOT ORIGINS</h3>
             <FloorMap onSelectLocation={()=>{}} shots={shots.map(s => s.origin)} />
          </div>

          {/* Shot List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-400 ml-1">SHOT LOG</h3>
            <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                {shots.slice().reverse().map((shot, i) => (
                    <div key={shot.id} className="flex justify-between items-center p-3 border-b border-slate-700 last:border-0">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-slate-500">#{shots.length - i}</span>
                            <div className={`w-2 h-2 rounded-full ${shot.result === ShotResult.GOAL ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            <span className="font-medium text-sm">{shot.result}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                             {shot.situation === GameSituation.PENALTY_KILL && <span className="text-orange-400 font-bold">PK</span>}
                             {shot.isControlled && <span className="text-blue-400 font-bold">CTRL</span>}
                            <span>P{shot.period} • {shot.timeRemaining}</span>
                        </div>
                    </div>
                ))}
                {shots.length === 0 && <div className="p-4 text-center text-slate-500 text-sm">No shots recorded.</div>}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col gap-3">
             <button 
                onClick={() => setShowAnalysis(true)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors"
             >
                <BrainCircuit className="w-5 h-5" />
                AI COACH ANALYSIS
             </button>
             
             {!isReadOnly && (
                <button 
                    onClick={finishAndSaveGame}
                    className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 rounded-xl transition-colors"
                >
                    <Save className="w-4 h-4" />
                    FINISH & SAVE GAME
                </button>
             )}
        </div>

        <AnalysisModal 
            isOpen={showAnalysis} 
            onClose={() => setShowAnalysis(false)} 
            shots={shots}
        />
      </div>
    );
  }

  // --- RECORDING FLOW ---

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Top Bar Stats */}
      <div className="flex justify-between items-center px-4 py-3 bg-slate-900 border-b border-slate-800 shadow-sm z-20">
        <div className="flex gap-4">
            <div className="text-center">
                <span className="block text-[10px] font-bold text-slate-500 tracking-wider">SV%</span>
                <span className={`block text-lg font-black leading-none ${stats.percentage > 75 ? 'text-emerald-400' : 'text-slate-100'}`}>{stats.percentage}</span>
            </div>
            <div className="text-center">
                <span className="block text-[10px] font-bold text-slate-500 tracking-wider">SOG</span>
                <span className="block text-lg font-black text-slate-100 leading-none">{stats.total}</span>
            </div>
        </div>
        
        {/* Period / Time Controls (Global) */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-slate-700">
             <button onClick={() => setCurrentPeriod(Math.max(1, currentPeriod - 1))} className="px-2 text-slate-400">-</button>
             <span className="text-xs font-bold w-4 text-center">{currentPeriod}</span>
             <button onClick={() => setCurrentPeriod(Math.min(4, currentPeriod + 1))} className="px-2 text-slate-400">+</button>
             <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>
             <div className="px-2 text-xs font-mono text-slate-300 w-12 text-center">
               {timeRemaining}
             </div>
        </div>

        <button 
            onClick={() => setAppState(AppState.SUMMARY)}
            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
        >
            PAUSE
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        
        {/* Step Indicator */}
        <div className="absolute top-4 left-0 w-full flex justify-center pointer-events-none z-30">
            <div className="bg-slate-900/90 backdrop-blur px-4 py-1.5 rounded-full border border-slate-700 shadow-lg flex items-center gap-2 transition-all">
                {appState === AppState.RECORDING_ORIGIN && (
                    <>
                        <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                        <span className="text-xs font-bold text-blue-100">TAP SHOT ORIGIN</span>
                    </>
                )}
                {appState === AppState.RECORDING_PLACEMENT && (
                    <>
                        <Target className="w-4 h-4 text-yellow-400 animate-pulse" />
                        <span className="text-xs font-bold text-yellow-100">TAP GOAL PLACEMENT</span>
                    </>
                )}
                {appState === AppState.RECORDING_DETAILS && (
                    <>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-100">CONFIRM DETAILS</span>
                    </>
                )}
            </div>
        </div>

        {/* Views */}
        <div className="flex-1 flex flex-col">
            {appState === AppState.RECORDING_ORIGIN && (
                <div className="flex-1 flex flex-col justify-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <FloorMap onSelectLocation={handleOriginSelect} shots={shots.map(s => s.origin)} />
                </div>
            )}

            {appState === AppState.RECORDING_PLACEMENT && (
                <div className="flex-1 flex flex-col justify-center p-4 animate-in fade-in zoom-in duration-300">
                     <div className="flex justify-between mb-2 px-2">
                        <button onClick={cancelShot} className="text-xs text-slate-500 flex items-center gap-1">
                            <Undo2 className="w-3 h-3"/> Back
                        </button>
                    </div>
                    <GoalMap onSelectPlacement={handlePlacementSelect} shots={shots} />
                </div>
            )}

            {appState === AppState.RECORDING_DETAILS && (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-300">
                    {/* Top: Goal Map Visualization */}
                    <div className="bg-slate-900 p-4 pb-8 flex-none z-10 shadow-xl relative">
                        <div className="absolute top-4 left-4 z-20">
                            <button onClick={() => setAppState(AppState.RECORDING_ORIGIN)} className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-300 bg-slate-800/80 px-2 py-1 rounded">
                                <Undo2 className="w-3 h-3"/> Cancel
                            </button>
                        </div>
                        <GoalMap 
                            onSelectPlacement={setTempPlacement} // Allow fine-tuning
                            activePlacement={tempPlacement} 
                        />
                         <div className="text-center mt-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                            Tap chart to adjust location
                        </div>
                    </div>

                    {/* Bottom: Controls */}
                    <div className="flex-1 bg-slate-800 rounded-t-3xl -mt-6 p-6 pt-8 overflow-y-auto border-t border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-20">
                        
                         {/* Time Picker Section */}
                        <div className="mb-6 space-y-2">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Time Remaining
                            </div>
                            
                            {/* Styled container to match input fields */}
                            <div className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-4 mx-auto">
                                    {/* Minutes */}
                                    <div className="flex flex-col items-center">
                                        <button onClick={() => handleTimeChange('min', 1)} className="p-1 text-slate-400 hover:text-white transition-colors active:scale-90">
                                            <ChevronUp className="w-6 h-6"/>
                                        </button>
                                        <div className="text-3xl font-mono font-bold text-white tracking-widest">{shotTime.split(':')[0]}</div>
                                        <button onClick={() => handleTimeChange('min', -1)} className="p-1 text-slate-400 hover:text-white transition-colors active:scale-90">
                                            <ChevronDown className="w-6 h-6"/>
                                        </button>
                                    </div>
                                    <div className="text-2xl font-bold text-slate-600 pb-2">:</div>
                                    {/* Seconds */}
                                    <div className="flex flex-col items-center">
                                        <button onClick={() => handleTimeChange('sec', 1)} className="p-1 text-slate-400 hover:text-white transition-colors active:scale-90">
                                            <ChevronUp className="w-6 h-6"/>
                                        </button>
                                        <div className="text-3xl font-mono font-bold text-white tracking-widest">{shotTime.split(':')[1]}</div>
                                        <button onClick={() => handleTimeChange('sec', -1)} className="p-1 text-slate-400 hover:text-white transition-colors active:scale-90">
                                            <ChevronDown className="w-6 h-6"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modifiers Toggles */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <button
                                onClick={() => setModifiers(m => ({...m, isPK: !m.isPK}))}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                                    modifiers.isPK 
                                    ? 'bg-orange-500/20 border-orange-500 text-orange-400' 
                                    : 'bg-slate-700 border-slate-600 text-slate-400 grayscale'
                                }`}
                            >
                                <AlertTriangle className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase">PK</span>
                            </button>

                            <button
                                onClick={() => setModifiers(m => ({...m, isRebound: !m.isRebound}))}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                                    modifiers.isRebound
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                                    : 'bg-slate-700 border-slate-600 text-slate-400 grayscale'
                                }`}
                            >
                                <PlayCircle className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase">Rebound</span>
                            </button>

                            <button
                                onClick={() => setModifiers(m => ({...m, isControlled: !m.isControlled}))}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                                    modifiers.isControlled
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                                    : 'bg-slate-700 border-slate-600 text-slate-400 grayscale'
                                }`}
                            >
                                <Grip className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase">Control</span>
                            </button>
                        </div>

                        {/* Main Action Buttons */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button 
                                onClick={() => saveShot(ShotResult.SAVE)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 lg:p-6 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/30 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1"
                            >
                                <Shield className="w-8 h-8" />
                                <span className="font-black text-xl tracking-tight">SAVE</span>
                            </button>
                            <button 
                                onClick={() => saveShot(ShotResult.GOAL)}
                                className="bg-red-600 hover:bg-red-500 text-white p-4 lg:p-6 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/30 border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
                            >
                                <Activity className="w-8 h-8" />
                                <span className="font-black text-xl tracking-tight">GOAL</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;
