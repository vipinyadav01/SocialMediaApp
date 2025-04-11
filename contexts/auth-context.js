"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userRef = doc(db, "users", firebaseUser.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          setUser({
            ...firebaseUser,
            ...userSnap.data(),
          })

          // Update last active timestamp
          await updateDoc(userRef, {
            lastActive: serverTimestamp(),
          }).catch((error) => console.error("Error updating last active:", error))
        } else {
          setUser(firebaseUser)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signup = async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update profile with name
      await updateProfile(user, { displayName: name })

      // Generate avatar using API (example: using DiceBear)
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        avatar: avatarUrl,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        bio: "",
        followers: [],
        following: [],
        settings: {
          emailNotifications: true,
          pushNotifications: true,
          messageNotifications: true,
          privateAccount: false,
          showActivity: true,
          allowTagging: true,
        },
      })

      toast({
        title: "Account created!",
        description: "Welcome to Reelink!",
      })

      return user
    } catch (error) {
      console.error("Signup error:", error)
      toast({
        variant: "destructive",
        title: "Error creating account",
        description: error.message,
      })
      throw error
    }
  }

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)

      // Update last login timestamp
      const userRef = doc(db, "users", result.user.uid)
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        lastActive: serverTimestamp(),
      })

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      })

      return result
    } catch (error) {
      console.error("Login error:", error)
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      })
      throw error
    }
  }

  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const userCredential = await signInWithPopup(auth, provider)
      const user = userCredential.user

      // Check if user exists in Firestore
      const userRef = doc(db, "users", user.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          avatar: user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          lastActive: serverTimestamp(),
          bio: "",
          followers: [],
          following: [],
          settings: {
            emailNotifications: true,
            pushNotifications: true,
            messageNotifications: true,
            privateAccount: false,
            showActivity: true,
            allowTagging: true,
          },
        })

        toast({
          title: "Account created!",
          description: "Welcome to Reelink!",
        })
      } else {
        // Update last login timestamp
        await updateDoc(userRef, {
          lastLogin: serverTimestamp(),
          lastActive: serverTimestamp(),
        })

        toast({
          title: "Welcome back!",
          description: "You've successfully logged in with Google.",
        })
      }

      return user
    } catch (error) {
      console.error("Google sign in error:", error)
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      })
      throw error
    }
  }

  const logout = async () => {
    try {
      if (user) {
        // Update last active timestamp before logout
        const userRef = doc(db, "users", user.uid)
        await updateDoc(userRef, {
          lastActive: serverTimestamp(),
        })
      }

      await signOut(auth)
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      })
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error.message,
      })
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, googleSignIn, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
