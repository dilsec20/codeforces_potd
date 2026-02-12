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

export const usePotd = (handle) => {
    const [globalPotd, setGlobalPotd] = useState(null);
    const [personalPotd, setPersonalPotd] = useState(null);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [solvedToday, setSolvedToday] = useState(false);
    const [solvedHistory, setSolvedHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load streak from storage on mount
    useEffect(() => {
        chrome.storage.local.get(['streakData'], (result) => {
            if (result.streakData) {
                setStreak(result.streakData.count || 0);
                setMaxStreak(result.streakData.max || 0);
                setSolvedHistory(result.streakData.history || []);

                // Check if last solved date was today
                if (result.streakData.lastSolved === getDailyDateString()) {
                    setSolvedToday(true);
                }

                // Check if streak is broken (last solved was before yesterday)
                // NOTE: We only reset visualization here. Actual reset happens on updateStreak or next solve.
                // But wait, if user opens extension and sees "Streak: 5", but last solve was 2 days ago, 
                // it should probably say "Streak: 0" (or pending reset).
                // Let's check logic:
                const lastSolved = result.streakData.lastSolved;
                const today = getDailyDateString();

                const d = new Date();
                d.setDate(d.getDate() - 1);
                const yesterday = `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`;

                if (lastSolved && lastSolved !== today && lastSolved !== yesterday) {
                    setStreak(0); // Visual reset if broken
                }
            }
        });
    }, []);


    useEffect(() => {
        let isMounted = true;

        const loadProblems = async () => {
            try {
                setLoading(true);
                const today = getDailyDateString();

                // 1. Check Storage First
                const storage = await chrome.storage.local.get(['potdData']);
                const cachedData = storage.potdData;

                let loadedGlobal = null;
                let loadedPersonal = null;
                let needFetch = false;

                // Validate Cached Global
                if (cachedData && cachedData.date === today && cachedData.global) {
                    loadedGlobal = cachedData.global;
                    if (isMounted) setGlobalPotd(loadedGlobal);
                } else {
                    needFetch = true;
                }

                // Validate Cached Personal
                if (handle && cachedData && cachedData.date === today && cachedData.handle === handle && cachedData.personal) {
                    loadedPersonal = cachedData.personal;
                    if (isMounted) setPersonalPotd(loadedPersonal);
                } else if (handle) {
                    needFetch = true;
                }

                if (handle && loadedPersonal) {
                    checkIfSolved(handle, loadedPersonal);
                }

                if (loadedGlobal && (!handle || loadedPersonal)) {
                    if (isMounted) setLoading(false);
                    return;
                }

                // 2. Fetch from API if needed
                if (needFetch) {
                    const response = await fetch(CF_API_URL);
                    const data = await response.json();

                    if (data.status !== "OK") throw new Error("Failed to fetch problems");
                    const problems = data.result.problems.filter(p => p.rating);

                    // Global
                    if (!loadedGlobal) {
                        const globalCandidates = problems.filter(p => p.rating >= 800 && p.rating <= 2000);
                        const seed = parseInt(today);
                        const globalIndex = Math.floor(seededRandom(seed) * globalCandidates.length);
                        loadedGlobal = globalCandidates[globalIndex];
                        if (isMounted) setGlobalPotd(loadedGlobal);
                    }

                    // Personal
                    if (handle && !loadedPersonal) {
                        const userRes = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
                        const userData = await userRes.json();

                        if (userData.status === "OK") {
                            const userRating = userData.result[0].rating || 1200;

                            const subsRes = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=500`);
                            const subsData = await subsRes.json();
                            const solvedSet = new Set();
                            if (subsData.status === "OK") {
                                subsData.result.forEach(sub => {
                                    if (sub.verdict === "OK") solvedSet.add(`${sub.problem.contestId}-${sub.problem.index}`);
                                });
                            }

                            const personalCandidates = problems.filter(p =>
                                p.rating >= userRating - 200 &&
                                p.rating <= userRating + 200 &&
                                !solvedSet.has(`${p.contestId}-${p.index}`)
                            );

                            if (personalCandidates.length > 0) {
                                const seed = parseInt(today);
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

                            checkIfSolved(handle, loadedPersonal);
                        }
                    }

                    // Save
                    chrome.storage.local.set({
                        potdData: {
                            date: today,
                            handle: handle || (cachedData ? cachedData.handle : ''),
                            global: loadedGlobal,
                            personal: loadedPersonal || (cachedData ? cachedData.personal : null)
                        }
                    });
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
    }, [handle]);

    const checkIfSolved = async (userHandle, problem) => {
        if (!userHandle || !problem) return;

        try {
            const response = await fetch(`https://codeforces.com/api/user.status?handle=${userHandle}&from=1&count=50`);
            const data = await response.json();

            if (data.status === "OK") {
                const isSolved = data.result.some(sub =>
                    sub.problem.contestId === problem.contestId &&
                    sub.problem.index === problem.index &&
                    sub.verdict === "OK"
                );

                if (isSolved) {
                    setSolvedToday(true);
                    updateStreak();
                }
            }
        } catch (err) {
            console.error("Error checking solved status:", err);
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

            if (lastSolved === today) {
                // Idempotency: just return, visualization is handled
                if (!history.includes(today)) {
                    history.push(today);
                    chrome.storage.local.set({ streakData: { ...result.streakData, history } });
                    setSolvedHistory(history);
                }
                return;
            }

            const d = new Date();
            d.setDate(d.getDate() - 1);
            const yesterday = `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`;

            if (lastSolved === yesterday) {
                currentStreak += 1;
            } else {
                // Streak broken, reset to 1 (since we just solved it)
                currentStreak = 1;
            }

            // Update Max
            if (currentStreak > currentMax) {
                currentMax = currentStreak;
            }

            if (!history.includes(today)) {
                history.push(today);
            }

            const newData = { count: currentStreak, max: currentMax, lastSolved: today, history: history };
            chrome.storage.local.set({ streakData: newData });

            setStreak(currentStreak);
            setMaxStreak(currentMax);
            setSolvedHistory(history);
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
        solvedHistory,
        checkSolved: () => checkIfSolved(handle, personalPotd)
    };
};
