import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Trophy, X, Loader2 } from 'lucide-react';

const Leaderboard = ({ isOpen, onClose, currentHandle }) => {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchLeaderboard();
        }
    }, [isOpen]);

    const fetchLeaderboard = async () => {
        if (!supabase) {
            setError("Supabase not configured.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('leaderboard')
                .select('handle, max_streak')
                .order('max_streak', { ascending: false })
                .limit(10);

            if (error) throw error;
            setLeaders(data || []);
        } catch (err) {
            console.error("Error fetching leaderboard:", err);
            setError("Could not load leaderboard.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-2 text-yellow-500">
                        <Trophy size={20} className="fill-yellow-500/20" />
                        <h2 className="text-lg font-bold font-mono">Top Streaks</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                            <p className="text-sm font-medium">Loading scores...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-2 text-red-400 p-4 text-center">
                            <p className="text-sm">{error}</p>
                            {!supabase && (
                                <p className="text-xs text-slate-500 mt-2">
                                    Missing API Key in supabaseClient.js
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {leaders.length === 0 ? (
                                <div className="text-center p-8 text-slate-500">
                                    No records yet. Be the first!
                                </div>
                            ) : (
                                leaders.map((player, index) => {
                                    const isMe = player.handle === currentHandle;
                                    const rank = index + 1;
                                    let rankColor = "text-slate-400";
                                    let rankBg = "bg-slate-800/30";

                                    if (rank === 1) { rankColor = "text-yellow-400"; rankBg = "bg-yellow-500/10 border-yellow-500/20"; }
                                    if (rank === 2) { rankColor = "text-slate-300"; rankBg = "bg-slate-400/10 border-slate-400/20"; }
                                    if (rank === 3) { rankColor = "text-amber-600"; rankBg = "bg-amber-600/10 border-amber-600/20"; }

                                    return (
                                        <div
                                            key={player.handle}
                                            className={`flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-slate-700 transition-all ${isMe ? 'bg-blue-500/10 border-blue-500/30' : rankBg}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`font-mono font-bold w-6 text-center ${rankColor}`}>
                                                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className={`font-medium ${isMe ? 'text-blue-400' : 'text-slate-200'}`}>
                                                        {player.handle}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-lg font-bold text-white tabular-nums">
                                                    {player.max_streak}
                                                </span>
                                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                                                    Days
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
