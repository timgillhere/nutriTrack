import { useState, useEffect, createContext, useContext } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, getUserProfile } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState({ calorieGoal: 2000, proteinGoal: 150 })

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const p = await getUserProfile(firebaseUser.uid)
        setProfile(p)
      }
    })
  }, [])

  const refreshProfile = async () => {
    if (user) {
      const p = await getUserProfile(user.uid)
      setProfile(p)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
