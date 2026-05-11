/**
 * Sync layer entre localStorage y Firestore.
 * Estrategia: merge por máximos (nunca se pierde progreso).
 * Offline: solo localStorage. Online: Firestore como fuente de verdad.
 */

import {
  doc, getDoc, setDoc, collection,
  getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Resultados por pregunta ─────────────────────────────────────────────────

export async function fetchRemoteResults(userId) {
  if (!db) return null;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'question_results'));
    const obj = {};
    snap.forEach(d => {
      obj[d.id] = {
        correctCount: d.data().correctCount ?? 0,
        failCount:    d.data().failCount    ?? 0,
        optionsCount: d.data().optionsCount ?? {},
      };
    });
    return obj;
  } catch (e) {
    console.error('fetchRemoteResults:', e);
    return null;
  }
}

export async function upsertQuestionResult(userId, questionId, result) {
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'users', userId, 'question_results', questionId),
      {
        correctCount: result.correctCount,
        failCount:    result.failCount,
        optionsCount: result.optionsCount ?? {},
        updatedAt:    serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error('upsertQuestionResult:', e);
  }
}

// Merge local + remoto: toma máximos para no perder progreso en ningún dispositivo
export function mergeResults(local, remote) {
  if (!remote) return local;
  const merged = { ...local };
  for (const [id, remoteVal] of Object.entries(remote)) {
    const localVal = merged[id] ?? { correctCount: 0, failCount: 0, optionsCount: {} };
    merged[id] = {
      correctCount: Math.max(localVal.correctCount, remoteVal.correctCount),
      failCount:    Math.max(localVal.failCount,    remoteVal.failCount),
      optionsCount: mergeOptionCounts(localVal.optionsCount, remoteVal.optionsCount),
    };
  }
  return merged;
}

function mergeOptionCounts(a = {}, b = {}) {
  const result = { ...a };
  for (const [k, v] of Object.entries(b)) {
    result[k] = Math.max(result[k] ?? 0, v);
  }
  return result;
}

// ─── Historial de sesiones ────────────────────────────────────────────────────

export async function fetchRemoteHistory(userId) {
  if (!db) return null;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'sessions'));
    const sessions = [];
    snap.forEach(d => sessions.push({ id: d.id, ...d.data() }));
    return sessions
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 50)
      .map(({ id, ...rest }) => rest);
  } catch (e) {
    console.error('fetchRemoteHistory:', e);
    return null;
  }
}

export async function insertSession(userId, session) {
  if (!db) return;
  try {
    await addDoc(collection(db, 'users', userId, 'sessions'), {
      ...session,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('insertSession:', e);
  }
}

// ─── Cola offline ─────────────────────────────────────────────────────────────

const PENDING_KEY = 'opo_pending_sync';

export function queuePendingResult(questionId, result) {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
    pending[questionId] = result;
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch { /* noop */ }
}

export async function flushPendingResults(userId) {
  if (!db) return;
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
    const entries = Object.entries(pending);
    if (!entries.length) return;
    await Promise.all(entries.map(([qId, res]) => upsertQuestionResult(userId, qId, res)));
    localStorage.removeItem(PENDING_KEY);
  } catch (e) {
    console.error('flushPendingResults:', e);
  }
}
