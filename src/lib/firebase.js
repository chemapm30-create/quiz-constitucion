import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web API keys are intentionally public — security is enforced by Firestore Rules
const firebaseConfig = {
  apiKey:            'AIzaSyA-qUtqHtq_b1fcofNqZ1-ZgrcybQ_Baic',
  authDomain:        'quiz-constitucion.firebaseapp.com',
  projectId:         'quiz-constitucion',
  storageBucket:     'quiz-constitucion.firebasestorage.app',
  messagingSenderId: '559689367268',
  appId:             '1:559689367268:web:399e6d575d2f455d2bf6f1',
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

export const isFirebaseReady = true;
