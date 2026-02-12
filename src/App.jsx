import { useState, useEffect } from 'react';
import { usePotd } from './hooks/usePotd';
import Calendar from './components/Calendar';
import { Trophy, Globe, User, ExternalLink, Settings, Flame, Zap, History, ChevronLeft } from 'lucide-react';

function App() {
  const [handle, setHandle] = useState('');
  const [inputHandle, setInputHandle] = useState('');
  const [activeTab, setActiveTab] = useState('global');
  const [selectedDate, setSelectedDate] = useState(new Date()); // New state for date selection

  // Pass selectedDate to hook (it will default to today if null, but we manage state here)
  const { globalPotd, personalPotd, loading, error, streak, maxStreak, solvedToday, globalSolved, solvedHistory } = usePotd(handle, selectedDate);

  useEffect(() => {
    chrome.storage.local.get(['handle'], (result) => {
      if (result.handle) setHandle(result.handle);
    });
  }, []);

  const saveHandle = () => {
    chrome.storage.local.set({ handle: inputHandle }, () => {
      setHandle(inputHandle);
    });
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    // Optional: switch to 'personal' tab if user clicks a date to see their history
    if (activeTab === 'global') setActiveTab('personal');
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const ProblemCard = ({ problem, type }) => {
    if (!problem) return <div className="text-gray-500 text-sm text-center py-4">Loading problem...</div>;

    const problemUrl = `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;

    return (
      <div className="p-3 bg-slate-800 rounded-lg shadow-sm border border-slate-700/50 animate-in fade-in duration-300 relative overflow-hidden">
        {/* Date Context Indicator */}
        {!isToday && (
          <div className="absolute top-0 right-0 bg-orange-500/20 text-orange-400 text-[10px] px-2 py-0.5 rounded-bl font-bold border-l border-b border-orange-500/30 flex items-center gap-1">
            <History size={10} /> {selectedDate.toLocaleDateString()}
          </div>
        )}

        <div className="flex justify-between items-center mb-1 pt-2">
          <h3 className="text-base font-bold text-white truncate max-w-[200px]">{problem.name}</h3>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${problem.rating < 1200 ? 'bg-green-900/50 text-green-300 border border-green-800' :
              problem.rating < 1600 ? 'bg-blue-900/50 text-blue-300 border border-blue-800' :
                problem.rating < 2000 ? 'bg-purple-900/50 text-purple-300 border border-purple-800' :
                  'bg-red-900/50 text-red-300 border border-red-800'
            }`}>
            {problem.rating || 'Unrated'}
          </span>
        </div>
        <div className="text-gray-500 text-xs mb-3 truncate">
          {problem.tags.join(', ')}
        </div>
        <a
          href={problemUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors group"
        >
          Solve Problem <ExternalLink size={14} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    );
  };

  return (
    <div className="w-[350px] bg-slate-900 text-white font-sans flex flex-col h-auto min-h-0 transition-height duration-300">
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-3 bg-slate-800/30 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          {!isToday ? (
            <button onClick={goToToday} className="mr-1 p-1 hover:bg-slate-800 rounded-full transition-colors group" title="Back to Today">
              <ChevronLeft size={16} className="text-slate-400 group-hover:text-white" />
            </button>
          ) : (
            <Trophy className="text-yellow-500 w-4 h-4" />
          )}
          <h1 className="text-sm font-bold tracking-wide text-slate-200">
            {isToday ? (
              <>POTD<span className="text-blue-500">+</span></>
            ) : (
              <span className="text-orange-400">Past Mode</span>
            )}
          </h1>
        </div>
        <button className="text-slate-500 hover:text-white transition-colors">
          <Settings size={16} />
        </button>
      </header>

      {/* Main Content */}
      <main className="p-3 space-y-3">
        {!handle ? (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="p-3 bg-slate-800 rounded-full">
              <User size={32} className="text-slate-500" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold">Welcome</h2>
              <p className="text-slate-400 text-xs">Enter handle to start.</p>
            </div>
            <div className="w-full space-y-2">
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                placeholder="Codeforces Handle"
                value={inputHandle}
                onChange={(e) => setInputHandle(e.target.value)}
              />
              <button
                onClick={saveHandle}
                disabled={!inputHandle}
                className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-sm font-semibold transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex bg-slate-800/50 p-0.5 rounded-lg">
              <button
                onClick={() => setActiveTab('global')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'global'
                    ? 'bg-slate-700 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-700/30'
                  } ${globalSolved
                    ? 'text-green-400'
                    : (activeTab === 'global' ? 'text-white' : '')
                  }`}
              >
                <Globe size={12} className={globalSolved ? 'text-green-400' : ''} />
                Global {globalSolved && '✓'}
              </button>
              <button
                onClick={() => setActiveTab('personal')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'personal'
                    ? 'bg-purple-600 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-700/30'
                  } ${solvedToday && isToday // Only show strict green tick for "TODAY's" goal being done? Or if past is solved? 
                    // If globalSolved/solvedToday reflects the loaded problem (which is past date), then it's correct.
                    // YES, usePotd checkStats updates based on loaded problem.
                    // BUT 'solvedToday' variable name is slightly confusing now, it means 'solvedSelected'.
                    ? 'text-green-300 font-bold'
                    : (activeTab === 'personal' ? 'text-white' : '')
                  }`}
              >
                <User size={12} className={solvedToday ? 'text-green-300' : ''} />
                For You {solvedToday && '✓'}
              </button>
            </div>

            {/* Problem Card */}
            {loading ? (
              <div className="py-4 text-center">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : error ? (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-center text-xs">
                {error}
              </div>
            ) : (
              <ProblemCard
                problem={activeTab === 'global' ? globalPotd : personalPotd}
                type={activeTab}
              />
            )}

            {/* Stats - Horizontal Row with Max Streak */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/30 p-2 rounded border border-slate-700/30 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                    <Flame size={12} className="text-orange-500" /> Current
                  </span>
                  <span className="text-white text-sm font-bold">{streak}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                    <Zap size={12} className="text-yellow-500" /> Max
                  </span>
                  <span className="text-slate-300 text-sm font-bold">{maxStreak}</span>
                </div>
              </div>
              <div className="bg-slate-800/30 p-2 rounded border border-slate-700/30 flex flex-col justify-center items-center">
                <span className="text-slate-500 text-[10px] uppercase font-bold mb-1">
                  {isToday ? 'Today Status' : 'Past Status'}
                </span>
                <span className={`text-sm font-bold ${solvedToday ? 'text-green-400' : 'text-slate-400'}`}>
                  {solvedToday ? 'Solved! 🎉' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Calendar */}
            <div className="pt-1">
              <Calendar
                solvedHistory={solvedHistory}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
