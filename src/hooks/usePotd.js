import { useState, useEffect } from 'react';

const CF_API_URL = "https://codeforces.com/api/problemset.problems";

const seededRandom = (seed) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

const getDailyDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`;
};

// Helper to format any date object to our string format
// Exporting so Calendar can use it too if needed, but for now internal is fine
const formatDateString = (dateObj) => {
    return `${dateObj.getFullYear()}${dateObj.getMonth() + 1}${dateObj.getDate()}`;
};


export const usePotd = (handle, forceDate = null) => {
    const [globalPotd, setGlobalPotd] = useState(null);
    const [personalPotd, setPersonalPotd] = useState(null);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [solvedToday, setSolvedToday] = useState(false); // Personal solved status (for streak)
    const [globalSolved, setGlobalSolved] = useState(false); // Global solved status
    const [solvedHistory, setSolvedHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Determine target date string
    const targetDateStr = forceDate ? formatDateString(forceDate) : getDailyDateString();
    const isToday = targetDateStr === getDailyDateString();

    // Load streak from storage on mount (independent of selected date)
    useEffect(() => {
        chrome.storage.local.get(['streakData'], (result) => {
            if (result.streakData) {
                let count = result.streakData.count || 0;
                let max = result.streakData.max || 0;
                let history = result.streakData.history || [];
                let lastSolved = result.streakData.lastSolved;

                // Self-healing: Ensure Max is never less than Current
                // This handles cases where data might be inconsistent from old versions
                if (count > max) {
                    max = count;
                    chrome.storage.local.set({
                        streakData: { ...result.streakData, max: max }
                    });
                }

                setStreak(count);
                setMaxStreak(max);
                setSolvedHistory(history);

                if (lastSolved === getDailyDateString()) {
                    setSolvedToday(true);
                }

                const today = getDailyDateString();
                const d = new Date();
                d.setDate(d.getDate() - 1);
                const yesterday = `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`;
                if (lastSolved && lastSolved !== today && lastSolved !== yesterday) {
                    // Only update visual streak if looking at today, or generally just load it
                }
            }
        });
    }, []);


    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setGlobalPotd(null);
        setPersonalPotd(null);
        setError(null);

        const loadProblems = async () => {
            try {
                // If checking today, check cache first
                let loadedGlobal = null;
                let loadedPersonal = null;
                let needFetch = false;

                if (isToday) {
                    const storage = await chrome.storage.local.get(['potdData']);
                    const cachedData = storage.potdData;

                    if (cachedData && cachedData.date === targetDateStr && cachedData.global) {
                        loadedGlobal = cachedData.global;
                    } else {
                        needFetch = true;
                    }

                    if (handle && cachedData && cachedData.date === targetDateStr && cachedData.handle === handle && cachedData.personal) {
                        loadedPersonal = cachedData.personal;
                    } else if (handle) {
                        needFetch = true;
                    }
                } else {
                    // Past date: always fetch/calculate (unless we want to cache history too? heavy)
                    // For now, re-calculate
                    needFetch = true;
                }

                if (loadedGlobal && (!handle || loadedPersonal)) {
                    if (isMounted) {
                        setGlobalPotd(loadedGlobal);
                        if (loadedPersonal) setPersonalPotd(loadedPersonal);
                        if (handle) checkStatus(handle, loadedGlobal, loadedPersonal);
                        setLoading(false);
                    }
                    return;
                }

                if (needFetch) {
                    const response = await fetch(CF_API_URL);
                    const data = await response.json();

                    if (data.status !== "OK") throw new Error("Failed to fetch problems");
                    const problems = data.result.problems.filter(p => p.rating);

                    // Global Selection (Deterministic based on targetDateStr)
                    if (!loadedGlobal) {
                        const globalCandidates = problems.filter(p => p.rating >= 800 && p.rating <= 2000);
                        const seed = parseInt(targetDateStr);
                        const globalIndex = Math.floor(seededRandom(seed) * globalCandidates.length);
                        loadedGlobal = globalCandidates[globalIndex];
                        if (isMounted) setGlobalPotd(loadedGlobal);
                    }

                    // Personal Selection
                    if (handle && !loadedPersonal) {
                        const userRes = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
                        const userData = await userRes.json();

                        if (userData.status === "OK") {
                            const userRating = userData.result[0].rating || 0;

                            let minRating, maxRating;
                            if (userRating < 1000) {
                                minRating = 800;
                                maxRating = 1200;
                            } else {
                                minRating = userRating - 200;
                                maxRating = userRating + 200;
                            }

                            const subsRes = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=500`);
                            const subsData = await subsRes.json();
                            const solvedSet = new Set();
                            if (subsData.status === "OK") {
                                subsData.result.forEach(sub => {
                                    if (sub.verdict === "OK") solvedSet.add(`${sub.problem.contestId}-${sub.problem.index}`);
                                });
                            }

                            const personalCandidates = problems.filter(p =>
                                p.rating >= minRating &&
                                p.rating <= maxRating &&
                                !solvedSet.has(`${p.contestId}-${p.index}`)
                            );

                            if (personalCandidates.length > 0) {
                                const seed = parseInt(targetDateStr);
                                let handleHash = 0;
                                for (let i = 0; i < handle.length; i++) {
                                    handleHash = ((handleHash << 5) - handleHash) + handle.charCodeAt(i);
                                    handleHash |= 0;
                                }
                                const personalSeed = seed + handleHash;
                                const personalIndex = Math.floor(seededRandom(personalSeed) * personalCandidates.length);
                                loadedPersonal = personalCandidates[personalIndex];
                            } else {
                                loadedPersonal = loadedGlobal;
                            }
                            if (isMounted) setPersonalPotd(loadedPersonal);
                        }
                    }

                    // Only cache if it's today
                    if (isToday) {
                        chrome.storage.local.set({
                            potdData: {
                                date: targetDateStr,
                                handle: handle,
                                global: loadedGlobal,
                                personal: loadedPersonal
                            }
                        });
                    }

                    if (handle) checkStatus(handle, loadedGlobal, loadedPersonal);
                }

            } catch (err) {
                console.error(err);
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadProblems();

        return () => { isMounted = false; };
    }, [handle, targetDateStr]); // Depend on targetDateStr

    // Streak Recovery Logic
    useEffect(() => {
        if (handle && streak === 0) {
            import('../supabaseClient').then(({ supabase }) => {
                if (!supabase) return;

                supabase
                    .from('leaderboard')
                    .select('current_streak, last_updated, max_streak')
                    .eq('handle', handle)
                    .single()
                    .then(({ data, error }) => {
                        if (data && !error) {
                            const lastDate = new Date(data.last_updated);
                            const today = new Date();
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);

                            // Check if last update was Today or Yesterday (so streak is still valid)
                            const isToday = lastDate.toDateString() === today.toDateString();
                            const isYesterday = lastDate.toDateString() === yesterday.toDateString();

                            if ((isToday || isYesterday) && data.current_streak > 0) {
                                console.log("Restoring streak from Supabase...", data.current_streak);

                                const lastSolvedStr = `${lastDate.getFullYear()}${lastDate.getMonth() + 1}${lastDate.getDate()}`;

                                chrome.storage.local.get(['streakData'], (result) => {
                                    const currentData = result.streakData || { history: [] };
                                    const newHistory = currentData.history || [];
                                    if (!newHistory.includes(lastSolvedStr)) {
                                        newHistory.push(lastSolvedStr);
                                    }

                                    const restoredData = {
                                        count: data.current_streak,
                                        max: Math.max(data.max_streak, data.current_streak),
                                        lastSolved: lastSolvedStr,
                                        history: newHistory
                                    };

                                    chrome.storage.local.set({ streakData: restoredData });
                                    setStreak(restoredData.count);
                                    setMaxStreak(restoredData.max);
                                    setSolvedHistory(restoredData.history);

                                    if (lastSolvedStr === getDailyDateString()) {
                                        setSolvedToday(true);
                                    }
                                });
                            }
                        }
                    });
            });
        }
    }, [handle, streak]);


    const checkStatus = async (userHandle, globalProb, personalProb) => {
        if (!userHandle) return;

        try {
            // Re-check solved status (maybe efficient to cache this too?)
            const response = await fetch(`https://codeforces.com/api/user.status?handle=${userHandle}&from=1&count=50`);
            const data = await response.json();

            if (data.status === "OK") {
                const submissions = data.result;

                if (globalProb) {
                    const isGlobal = submissions.some(sub =>
                        sub.problem.contestId === globalProb.contestId &&
                        sub.problem.index === globalProb.index &&
                        sub.verdict === "OK"
                    );
                    setGlobalSolved(isGlobal);
                }

                if (personalProb) {
                    const isPersonal = submissions.some(sub =>
                        sub.problem.contestId === personalProb.contestId &&
                        sub.problem.index === personalProb.index &&
                        sub.verdict === "OK"
                    );

                    // Only update solvedToday if it's actually today's problem
                    if (targetDateStr === getDailyDateString()) {
                        if (isPersonal && !solvedToday) {
                            setSolvedToday(true);
                            updateStreak();
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error checking status:", err);
        }
    };

    const updateStreak = () => {
        const today = getDailyDateString();

        chrome.storage.local.get(['streakData'], (result) => {
            let currentStreak = 0;
            let currentMax = 0;
            let lastSolved = null;
            let history = [];

            if (result.streakData) {
                currentStreak = result.streakData.count || 0;
                currentMax = result.streakData.max || 0;
                lastSolved = result.streakData.lastSolved;
                history = result.streakData.history || [];
            }

            // Only increment if we haven't solved it today yet
            if (lastSolved !== today) {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                const yesterday = `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`;

                if (lastSolved === yesterday) {
                    currentStreak += 1;
                } else {
                    currentStreak = 1;
                }
                lastSolved = today;
            }

            // Always update max streak if current exceeds it
            // This fixes the issue where max might be 0 while current is 1 (e.g. from legacy data)
            if (currentStreak > currentMax) {
                currentMax = currentStreak;
            }

            // Always ensure history is up to date
            if (!history.includes(today)) {
                history.push(today);
            }

            const newData = { count: currentStreak, max: currentMax, lastSolved: today, history: history };
            chrome.storage.local.set({ streakData: newData });

            setStreak(currentStreak);
            setMaxStreak(currentMax);
            setSolvedHistory(history);

            // Sync with Supabase Leaderboard
            import('../supabaseClient').then(({ supabase }) => {
                if (supabase && handle) {
                    supabase
                        .from('leaderboard')
                        .upsert({
                            handle: handle,
                            max_streak: currentMax,
                            last_updated: new Date().toISOString()
                        })
                        .then(({ error }) => {
                            if (error) console.error("Supabase sync error:", error);
                        });
                }
            });
        });
    };

    return {
        globalPotd,
        personalPotd,
        loading,
        error,
        streak,
        maxStreak,
        solvedToday,
        globalSolved,
        solvedHistory,
    };
};
