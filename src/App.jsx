import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import Menu from './components/Menu';
import Quiz from './components/Quiz';
import Results from './components/Results';
import Stats from './components/Stats';
import Auth from './components/Auth';
import {
  loadHistory, saveHistory,
  loadResults, saveResults,
  loadMistakes, saveMistakes,
  loadSkipped, saveSkipped,
  recordAnswerLocal, clearLocalData,
} from './store';
import { auth, isFirebaseReady } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  fetchRemoteResults, upsertQuestionResult,
  fetchRemoteHistory, insertSession,
  mergeResults, flushPendingResults,
  queuePendingResult,
} from './lib/sync';
import { shuffle, getQuestionId } from './utils';
import defaultQuestions from './data/preguntas.json';

export default function App() {
  const [activeTab, setActiveTab] = useState('practice');
  const [user, setUser] = useState(undefined); // undefined=loading, null=no auth, object=logged in
  const [syncing, setSyncing] = useState(false);

  const [history, setHistory] = useState(() => loadHistory());
  const [questionResults, setQuestionResults] = useState(() => loadResults());
  const [mistakes, setMistakes] = useState(() => loadMistakes());
  const [skippedList, setSkippedList] = useState(() => loadSkipped());

  useEffect(() => { saveMistakes(mistakes); }, [mistakes]);
  useEffect(() => { saveSkipped(skippedList); }, [skippedList]);

  // Estado del quiz
  const [view, setView] = useState('menu');
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState('');
  const [topicName, setTopicName] = useState('');
  const [nRequested, setNRequested] = useState(30);
  const [answers, setAnswers] = useState([]);
  const [instantFeedback, setInstantFeedback] = useState(true);

  const sessionStartRef = useRef(null);
  const allQuestions = useMemo(() => defaultQuestions, []);

  // ─── Auth ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isFirebaseReady) {
      setUser(null);
      return;
    }
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
    });
    return unsub;
  }, []);

  // ─── Sync al hacer login ──────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !isFirebaseReady) return;

    const doSync = async () => {
      setSyncing(true);
      try {
        // Subir pendientes offline primero
        await flushPendingResults(user.uid);

        // Merge resultados local + remoto
        const local = loadResults();
        const remote = await fetchRemoteResults(user.uid);
        if (remote !== null) {
          const merged = mergeResults(local, remote);
          saveResults(merged);
          setQuestionResults(merged);

          // Subir al remoto lo que estaba solo en local
          const onlyLocal = Object.entries(merged).filter(([id]) => !remote[id]);
          await Promise.all(onlyLocal.map(([id, r]) => upsertQuestionResult(user.uid, id, r)));
        }

        // Merge historial: usar remoto como verdad si hay más sesiones
        const remoteHistory = await fetchRemoteHistory(user.uid);
        if (remoteHistory !== null && remoteHistory.length > history.length) {
          saveHistory(remoteHistory);
          setHistory(remoteHistory);
        }
      } finally {
        setSyncing(false);
      }
    };

    doSync();
  }, [user]);

  // ─── Temas ordenados ─────────────────────────────────────────────────────

  const temasDisponibles = useMemo(() => {
    const temas = Array.from(new Set(allQuestions.map(q => q.tema)));
    return temas.sort((a, b) => {
      const getOrder = t => {
        if (t === 'Título Preliminar') return 0;
        const m = t.match(/Título ([IVX]+)/);
        if (m) {
          const roman = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
          return roman[m[1]] ?? 99;
        }
        const tm = t.match(/Tema (\d+)/);
        if (tm) return 100 + parseInt(tm[1]);
        return 200;
      };
      return getOrder(a) - getOrder(b);
    });
  }, [allQuestions]);

  // ─── Quiz logic ───────────────────────────────────────────────────────────

  const startQuiz = useCallback((mode, filterValue = null, n = 30) => {
    let pool = [];
    const qr = questionResults;

    if (mode === 'all' || mode === 'simulacro') pool = shuffle(allQuestions).slice(0, n);
    if (mode === 'topic') pool = shuffle(allQuestions.filter(q => q.tema === filterValue)).slice(0, n);
    if (mode === 'least_seen') {
      pool = shuffle(allQuestions).sort((a, b) => {
        const aR = qr[getQuestionId(a)] || { correctCount: 0, failCount: 0 };
        const bR = qr[getQuestionId(b)] || { correctCount: 0, failCount: 0 };
        return (aR.correctCount + aR.failCount) - (bR.correctCount + bR.failCount);
      }).slice(0, n);
    }
    if (mode === 'mistakes') {
      pool = shuffle(allQuestions.filter(q => mistakes.includes(getQuestionId(q)))).slice(0, n);
    }
    if (mode === 'hard') {
      pool = shuffle(allQuestions.filter(q => {
        const r = qr[getQuestionId(q)];
        return r && r.failCount >= 2 && r.failCount >= r.correctCount;
      })).slice(0, n);
    }
    if (mode === 'most_failed_pct') {
      pool = shuffle(allQuestions.filter(q => {
        const r = qr[getQuestionId(q)];
        return r && r.failCount > 0;
      })).sort((a, b) => {
        const aR = qr[getQuestionId(a)];
        const bR = qr[getQuestionId(b)];
        const pctA = aR.failCount / (aR.failCount + aR.correctCount);
        const pctB = bR.failCount / (bR.failCount + bR.correctCount);
        return pctB - pctA;
      }).slice(0, n);
    }
    if (mode === 'topic_least_seen') {
      pool = shuffle(allQuestions.filter(q => q.tema === filterValue)).sort((a, b) => {
        const aR = qr[getQuestionId(a)] || { correctCount: 0, failCount: 0 };
        const bR = qr[getQuestionId(b)] || { correctCount: 0, failCount: 0 };
        return (aR.correctCount + aR.failCount) - (bR.correctCount + bR.failCount);
      }).slice(0, n);
    }
    if (mode === 'topic_hard') {
      pool = shuffle(allQuestions.filter(q => {
        const r = qr[getQuestionId(q)];
        return q.tema === filterValue && r && r.failCount >= 2 && r.failCount >= r.correctCount;
      })).slice(0, n);
    }
    if (mode === 'topic_random') {
      pool = shuffle(allQuestions.filter(q => q.tema === filterValue)).slice(0, n);
    }
    if (mode === 'topic_mistakes') {
      pool = shuffle(allQuestions.filter(q => q.tema === filterValue && mistakes.includes(getQuestionId(q)))).slice(0, n);
    }
    if (mode === 'skipped_qs') {
      pool = shuffle(allQuestions.filter(q => skippedList.includes(getQuestionId(q)))).slice(0, n);
    }

    if (pool.length === 0) { alert('No hay preguntas para este modo.'); return; }

    pool = pool.map(q => ({ ...q, opciones: shuffle([...q.opciones]) }));
    setCurrentQuestions(pool);
    setCurrentIndex(0);
    setAnswers(new Array(pool.length).fill(null));
    setPracticeMode(mode);
    setTopicName(filterValue || '');
    setNRequested(n);
    setView('quiz');
    setActiveTab('practice');
    sessionStartRef.current = Date.now();
  }, [allQuestions, questionResults, mistakes, skippedList]);

  const handleAnswer = useCallback((opt) => {
    const q = currentQuestions[currentIndex];
    const qId = getQuestionId(q);
    const isCorrect = opt === q.correcta;

    setAnswers(prev => {
      const next = [...prev];
      next[currentIndex] = { selected: opt, answered: instantFeedback, isCorrect, skipped: false };
      return next;
    });

    if (instantFeedback) {
      setSkippedList(prev => prev.filter(id => id !== qId));

      setMistakes(prev => {
        if (isCorrect) return prev.filter(id => id !== qId);
        if (!prev.includes(qId)) return [...prev, qId];
        return prev;
      });

      setQuestionResults(prev => {
        const updated = recordAnswerLocal(qId, isCorrect, opt, prev);

        // Sync remoto (fire-and-forget con cola offline)
        if (user && isFirebaseReady) {
          upsertQuestionResult(user.uid, qId, updated[qId]).catch(() => {
            queuePendingResult(qId, updated[qId]);
          });
        } else if (isFirebaseReady) {
          queuePendingResult(qId, updated[qId]);
        }

        return updated;
      });
    }
  }, [currentIndex, currentQuestions, user, instantFeedback]);

  const handleSkip = useCallback(() => {
    const q = currentQuestions[currentIndex];
    const qId = getQuestionId(q);
    setSkippedList(prev => prev.includes(qId) ? prev : [...prev, qId]);

    const newAnswers = [...answers];
    newAnswers[currentIndex] = { selected: null, answered: false, skipped: true };
    setAnswers(newAnswers);

    let next = -1;
    for (let i = currentIndex + 1; i < newAnswers.length; i++) {
      if (!newAnswers[i]) { next = i; break; }
    }
    if (next === -1) {
      for (let i = 0; i < currentIndex; i++) {
        if (!newAnswers[i]) { next = i; break; }
      }
    }
    setCurrentIndex(next !== -1 ? next : Math.min(currentIndex + 1, newAnswers.length - 1));
  }, [answers, currentIndex]);

  const handleFinish = useCallback(async () => {
    if (!instantFeedback) {
      setQuestionResults(prev => {
        let updated = { ...prev };
        answers.forEach((ans, i) => {
          if (ans && !ans.skipped && ans.selected) {
            const q = currentQuestions[i];
            const qId = getQuestionId(q);
            const isCorrect = ans.selected === q.correcta;

            setSkippedList(prev => prev.filter(id => id !== qId));

            setMistakes(prev => {
              if (isCorrect) return prev.filter(id => id !== qId);
              if (!prev.includes(qId)) return [...prev, qId];
              return prev;
            });

            updated = recordAnswerLocal(qId, isCorrect, ans.selected, updated);
            
            if (user && isFirebaseReady) {
              upsertQuestionResult(user.uid, qId, updated[qId]).catch(() => queuePendingResult(qId, updated[qId]));
            } else if (isFirebaseReady) {
              queuePendingResult(qId, updated[qId]);
            }
          }
        });
        return updated;
      });
      setAnswers(prev => prev.map(a => a ? { ...a, answered: true } : a));
    }

    const duracion = sessionStartRef.current
      ? Math.round((Date.now() - sessionStartRef.current) / 1000)
      : 0;
    const aciertos = answers.filter((a, i) =>
      a && !a.skipped && a.selected === currentQuestions[i]?.correcta).length;
    const fallos = answers.filter((a, i) =>
      a && !a.skipped && a.selected && a.selected !== currentQuestions[i]?.correcta).length;

    const session = {
      fecha: new Date().toISOString(),
      modo: practiceMode,
      tema: topicName || null,
      totalPreguntas: currentQuestions.length,
      aciertos,
      fallos,
      duracion,
    };

    setHistory(prev => {
      const updated = [session, ...prev].slice(0, 50);
      saveHistory(updated);
      return updated;
    });

    if (user && isFirebaseReady) {
      insertSession(user.uid, session).catch(console.error);
    }

    setView('results');
  }, [answers, currentQuestions, practiceMode, topicName, user, instantFeedback]);

  const handleLogout = useCallback(async () => {
    if (auth) await signOut(auth);
    clearLocalData();
    setHistory([]);
    setQuestionResults({});
    setMistakes([]);
    saveMistakes([]);
    setSkippedList([]);
    setView('menu');
  }, []);

  // ─── Loading / Auth gate ──────────────────────────────────────────────────

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user === null && isFirebaseReady) {
    return <Auth />;
  }

  // ─── App ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#080808] text-gray-100 font-sans md:flex md:flex-row">
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); if (tab !== 'practice') setView('menu'); }}
        questionCount={allQuestions.length}
        mistakeCount={mistakes.length}
        user={user}
        syncing={syncing}
        onLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto px-4 pt-20 pb-24 md:p-10 md:pt-10">
        {activeTab === 'stats' && (
          <Stats
            history={history}
            allQuestions={allQuestions}
            mistakes={mistakes}
            questionResults={questionResults}
            onClearHistory={() => {
              clearLocalData();
              setHistory([]);
              setQuestionResults({});
              setMistakes([]);
              saveMistakes([]);
              setSkippedList([]);
            }}
          />
        )}

        {activeTab === 'practice' && (
          <>
            {view === 'menu' && (
              <Menu
                allQuestions={allQuestions}
                temasDisponibles={temasDisponibles}
                mistakes={mistakes}
                skippedList={skippedList}
                questionResults={questionResults}
                onStart={startQuiz}
                instantFeedback={instantFeedback}
                setInstantFeedback={setInstantFeedback}
              />
            )}

            {view === 'quiz' && currentQuestions[currentIndex] && (
              <Quiz
                question={currentQuestions[currentIndex]}
                currentIndex={currentIndex}
                totalQuestions={currentQuestions.length}
                answers={answers}
                onAnswer={handleAnswer}
                onNext={() => setCurrentIndex(i => Math.min(i + 1, currentQuestions.length - 1))}
                onPrev={() => setCurrentIndex(i => Math.max(i - 1, 0))}
                onSkip={handleSkip}
                onGoto={setCurrentIndex}
                onExit={() => setView('menu')}
                onFinish={handleFinish}
                instantFeedback={instantFeedback}
                user={user}
              />
            )}

            {view === 'results' && (
              <Results
                answers={answers}
                questions={currentQuestions}
                onMenu={() => setView('menu')}
                onRetry={() => startQuiz(practiceMode, topicName || null, nRequested)}
                user={user}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
