"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, orderBy, onSnapshot, getDocs, getDoc, limit, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MessageCircle, Clock, User, Loader2, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { debounce } from "lodash"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState(null)
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
      limit(20)
    )

    const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
      try {
        const conversationsData = []

        for (const docSnapshot of snapshot.docs) {
          const conversation = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          }

          // Get other participant's info
          if (conversation.participants && conversation.participants.length) {
            const otherParticipantId = conversation.participants.find((id) => id !== user.uid)
            if (otherParticipantId) {
              const otherParticipantDoc = await getDoc(doc(db, "users", otherParticipantId))

              if (otherParticipantDoc.exists()) {
                conversation.otherParticipant = {
                  id: otherParticipantId,
                  ...otherParticipantDoc.data(),
                }
              }
            }
          }

          conversationsData.push(conversation)
        }

        setConversations(conversationsData)
      } catch (error) {
        console.error("Error fetching conversations:", error)
      } finally {
        setLoading(false)
      }
    }, (error) => {
      console.error("Error in conversations snapshot:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleSearch = useCallback(
    debounce(async () => {
      if (!searchQuery.trim() || !user) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)

      try {
        const usersQuery = query(
          collection(db, "users"),
          where("name", ">=", searchQuery),
          where("name", "<=", searchQuery + "\uf8ff"),
          orderBy("name"),
          limit(10)
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
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300),
    [searchQuery, user]
  )

  useEffect(() => {
    handleSearch()
  }, [searchQuery, handleSearch])

  const startConversation = (userId) => {
    setSearchQuery("")
    setSearchResults([])
    router.push(`/messages/${userId}`)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
  }

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6" /> Messages
            </h1>
          </div>
          <div className="mt-4 relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-200" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-blue-600/40 border-none text-white placeholder:text-gray-200 focus:ring-2 focus:ring-white/30 focus:ring-offset-0"
              />
              {searchQuery && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-200 hover:text-white" />
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                {isSearching ? (
                  <div className="flex justify-center items-center p-4">
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <ScrollArea className="max-h-60">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                        onClick={() => startConversation(result.id)}
                      >
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3 border-2 border-white shadow">
                            <AvatarImage src={result.avatar} alt={result.name} />
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {result.name ? result.name[0].toUpperCase() : <User className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-gray-800 dark:text-gray-200">{result.name}</h3>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          Message
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No users found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-6 px-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length > 0 ? (
            <ScrollArea className="max-h-[calc(100vh-250px)]">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors duration-200
                      ${selectedConversationId === conversation.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    onClick={() => {
                      setSelectedConversationId(conversation.id)
                      router.push(`/messages/${conversation.otherParticipant?.id}`)
                    }}
                  >
                    <div className="flex items-center">
                      <Avatar className="h-12 w-12 mr-4 border-2 border-white shadow">
                        <AvatarImage
                          src={conversation.otherParticipant?.avatar}
                          alt={conversation.otherParticipant?.name}
                        />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {conversation.otherParticipant?.name ? 
                            conversation.otherParticipant.name[0].toUpperCase() : 
                            <User className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-medium truncate text-gray-800 dark:text-gray-200">
                            {conversation.otherParticipant?.name || "Unknown User"}
                          </h3>
                          {conversation.lastMessageAt && (
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 ml-2">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>
                                {formatDistanceToNow(conversation.lastMessageAt.toDate(), { addSuffix: true })}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                          {conversation.lastMessage || "No messages yet"}
                        </p>
                      </div>

                      {conversation.unreadCount > 0 && (
                        <Badge className="ml-3 bg-blue-500 hover:bg-blue-600">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 px-4">
              <MessageCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No conversations yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                Search for users above to start messaging with them
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}