import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore, doc, collection, addDoc, deleteDoc, getDocs, setDoc, getDoc, query, orderBy } from 'firebase/firestore'

// Replace these values with your Firebase project config
// from https://console.firebase.google.com → Project settings → Your apps → SDK setup
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Auth helpers
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
export const signInWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password)
export const registerWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password)
export const logOut = () => signOut(auth)

// Diary helpers  ─  path: users/{uid}/diary/{date}/entries/{entryId}
export const getDiaryEntries = async (uid, date) => {
  const ref = collection(db, 'users', uid, 'diary', date, 'entries')
  const snap = await getDocs(query(ref, orderBy('addedAt')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addDiaryEntry = async (uid, date, entry) => {
  const ref = collection(db, 'users', uid, 'diary', date, 'entries')
  const docRef = await addDoc(ref, { ...entry, addedAt: Date.now() })
  return docRef.id
}

export const deleteDiaryEntry = async (uid, date, entryId) => {
  await deleteDoc(doc(db, 'users', uid, 'diary', date, 'entries', entryId))
}

// User profile
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid, 'profile', 'goals'))
  return snap.exists() ? snap.data() : { calorieGoal: 2000, proteinGoal: 150 }
}

export const saveUserProfile = async (uid, profile) => {
  await setDoc(doc(db, 'users', uid, 'profile', 'goals'), profile)
}
