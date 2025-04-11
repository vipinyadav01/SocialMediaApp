"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, orderBy, onSnapshot, getDocs, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Fetch conversations
  useEffect(() => {
    if (!user) return

    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc"),
    )

    const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
      const conversationsData = []

      for (const doc of snapshot.docs) {
        const conversation = {
          id: doc.id,
          ...doc.data(),
        }

        // Get other participant's info
        const otherParticipantId = conversation.participants.find((id) => id !== user.uid)
        const otherParticipantDoc = await getDoc(doc(db, "users", otherParticipantId))

        if (otherParticipantDoc.exists()) {
          conversation.otherParticipant = {
            id: otherParticipantId,
            ...otherParticipantDoc.data(),
          }
        }

        conversationsData.push(conversation)
      }

      setConversations(conversationsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return

    setIsSearching(true)

    try {
      const usersQuery = query(
        collection(db, "users"),
        where("name", ">=", searchQuery),
        where("name", "<=", searchQuery + "\uf8ff"),
        orderBy("name"),
      )

      const usersSnapshot = await getDocs(usersQuery)
      const usersData = usersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((userData) => userData.id !== user.uid)

      setSearchResults(usersData)
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const startConversation = (userId) => {
    router.push(`/messages/${userId}`)
  }

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold mb-4">Messages</h1>

          <div className="relative">
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              <Search size={18} />
            </Button>
          </div>

          {searchQuery && (
            <div className="mt-2">
              {isSearching ? (
                <div className="text-center py-2">
                  <div className="animate-spin inline-block rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                      onClick={() => startConversation(result.id)}
                    >
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={result.avatar} alt={result.name} />
                          <AvatarFallback>{result.name ? result.name[0].toUpperCase() : "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{result.name}</h3>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        Message
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No users found</p>
              )}
            </div>
          )}
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin inline-block rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => router.push(`/messages/${conversation.otherParticipant.id}`)}
              >
                <div className="flex items-center">
                  <Avatar className="h-12 w-12 mr-4">
                    <AvatarImage
                      src={conversation.otherParticipant?.avatar}
                      alt={conversation.otherParticipant?.name}
                    />
                    <AvatarFallback>
                      {conversation.otherParticipant?.name ? conversation.otherParticipant.name[0].toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium truncate">{conversation.otherParticipant?.name}</h3>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {formatDistanceToNow(conversation.lastMessageAt.toDate(), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {conversation.lastMessage || "No messages yet"}
                    </p>
                  </div>

                  {conversation.unreadCount > 0 && (
                    <div className="ml-3 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No conversations yet</p>
              <p className="text-sm">Search for users to start a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
