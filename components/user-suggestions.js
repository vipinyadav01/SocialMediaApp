"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, limit, getDocs, where, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function UserSuggestions() {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSuggestions() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        // Get users that the current user is not following
        const userRef = doc(db, "users", user.uid)
        const userFollowing = user.following || []

        const usersQuery = query(
          collection(db, "users"),
          where("__name__", "not-in", [user.uid, ...userFollowing.slice(0, 9)]), // Firestore limits 'not-in' to 10 values
          limit(5),
        )

        const usersSnapshot = await getDocs(usersQuery)
        const suggestionsData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isFollowing: userFollowing.includes(doc.id),
        }))

        setSuggestions(suggestionsData)
      } catch (error) {
        console.error("Error fetching suggestions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [user])

  const handleFollow = async (userId) => {
    if (!user) return

    const userRef = doc(db, "users", user.uid)
    const targetUserRef = doc(db, "users", userId)

    const isFollowing = user.following && user.following.includes(userId)

    if (isFollowing) {
      // Unfollow
      await updateDoc(userRef, {
        following: arrayRemove(userId),
      })

      await updateDoc(targetUserRef, {
        followers: arrayRemove(user.uid),
      })

      setSuggestions((prev) =>
        prev.map((suggestion) => (suggestion.id === userId ? { ...suggestion, isFollowing: false } : suggestion)),
      )
    } else {
      // Follow
      await updateDoc(userRef, {
        following: arrayUnion(userId),
      })

      await updateDoc(targetUserRef, {
        followers: arrayUnion(user.uid),
      })

      setSuggestions((prev) =>
        prev.map((suggestion) => (suggestion.id === userId ? { ...suggestion, isFollowing: true } : suggestion)),
      )
    }
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Join Reelink</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Sign up to follow users and see their posts in your feed.
          </p>
          <div className="flex space-x-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested Users</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="flex items-center justify-between">
                <Link href={`/profile/${suggestion.id}`} className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={suggestion.avatar} alt={suggestion.name} />
                    <AvatarFallback>{suggestion.name ? suggestion.name[0].toUpperCase() : "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-sm">{suggestion.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                      {suggestion.bio || "No bio"}
                    </p>
                  </div>
                </Link>

                <Button
                  variant={suggestion.isFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleFollow(suggestion.id)}
                >
                  {suggestion.isFollowing ? "Unfollow" : "Follow"}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No suggestions available</p>
        )}
      </CardContent>
    </Card>
  )
}
