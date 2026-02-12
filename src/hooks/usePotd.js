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
    const [solvedToday, setSolvedToday] = useState(false); // Personal solved status (for streak)
    const [globalSolved, setGlobalSolved] = useState(false); // Global solved status
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
                if (result.streakData.lastSolved === getDailyDateString()) {
                    setSolvedToday(true);
                }
                const lastSolved = result.streakData.lastSolved;
                const today = getDailyDateString();
                const d = new Date();
                d.setDate(d.getDate() - 1);
                const yesterday = `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`;
                if (lastSolved && lastSolved !== today && lastSolved !== yesterday) {
                    setStreak(0);
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

                const storage = await chrome.storage.local.get(['potdData']);
                const cachedData = storage.potdData;

                let loadedGlobal = null;
                let loadedPersonal = null;
                let needFetch = false;

                if (cachedData && cachedData.date === today && cachedData.global) {
                    loadedGlobal = cachedData.global;
                    if (isMounted) setGlobalPotd(loadedGlobal);
                } else {
                    needFetch = true;
                }

                if (handle && cachedData && cachedData.date === today && cachedData.handle === handle && cachedData.personal) {
                    loadedPersonal = cachedData.personal;
                    if (isMounted) setPersonalPotd(loadedPersonal);
                } else if (handle) {
                    needFetch = true;
                }

                if (loadedGlobal && (!handle || loadedPersonal)) {
                    // Check solved status if we have problems
                    if (handle) checkStatus(handle, loadedGlobal, loadedPersonal);
                    if (isMounted) setLoading(false);
                    return;
                }

                if (needFetch) {
                    const response = await fetch(CF_API_URL);
                    const data = await response.json();

                    if (data.status !== "OK") throw new Error("Failed to fetch problems");
                    const problems = data.result.problems.filter(p => p.rating);

                    if (!loadedGlobal) {
                        const globalCandidates = problems.filter(p => p.rating >= 800 && p.rating <= 2000);
                        const seed = parseInt(today);
                        const globalIndex = Math.floor(seededRandom(seed) * globalCandidates.length);
                        loadedGlobal = globalCandidates[globalIndex];
                        if (isMounted) setGlobalPotd(loadedGlobal);
                    }

                    if (handle && !loadedPersonal) {
                        const userRes = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
                        const userData = await userRes.json();

                        if (userData.status === "OK") {
                            // Default to 0 if unrated to trigger the < 1000 logic
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
                        }
                    }

                    chrome.storage.local.set({
                        potdData: {
                            date: today,
                            handle: handle || (cachedData ? cachedData.handle : ''),
                            global: loadedGlobal,
                            personal: loadedPersonal || (cachedData ? cachedData.personal : null)
                        }
                    });

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
    }, [handle]);

    const checkStatus = async (userHandle, globalProb, personalProb) => {
        if (!userHandle) return;

        try {
            const response = await fetch(`https://codeforces.com/api/user.status?handle=${userHandle}&from=1&count=50`);
            const data = await response.json();

            if (data.status === "OK") {
                const submissions = data.result;

                // Check Global
                if (globalProb) {
                    const isGlobal = submissions.some(sub =>
                        sub.problem.contestId === globalProb.contestId &&
                        sub.problem.index === globalProb.index &&
                        sub.verdict === "OK"
                    );
                    if (isGlobal) setGlobalSolved(true);
                }

                // Check Personal
                if (personalProb) {
                    const isPersonal = submissions.some(sub =>
                        sub.problem.contestId === personalProb.contestId &&
                        sub.problem.index === personalProb.index &&
                        sub.verdict === "OK"
                    );
                    if (isPersonal) {
                        setSolvedToday(true);
                        updateStreak();
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

            if (lastSolved === today) {
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
                currentStreak = 1;
            }

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
        solvedToday, // Personal solved
        globalSolved, // Global solved
        solvedHistory,
    };
};
