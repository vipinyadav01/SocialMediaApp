"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  limit,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, ArrowLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function ChatPage({ params }) {
  const { user, loading: authLoading } = useAuth()
  const [recipient, setRecipient] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [conversationId, setConversationId] = useState(null)
  const messagesEndRef = useRef(null)
  const router = useRouter()

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Fetch recipient info
  useEffect(() => {
    async function fetchRecipient() {
      if (!user) return

      try {
        const recipientDoc = await getDoc(doc(db, "users", params.id))

        if (recipientDoc.exists()) {
          setRecipient({
            id: recipientDoc.id,
            ...recipientDoc.data(),
          })
        } else {
          // Recipient doesn't exist
          router.push("/messages")
        }
      } catch (error) {
        console.error("Error fetching recipient:", error)
      }
    }

    fetchRecipient()
  }, [params.id, user, router])

  // Find or create conversation
  useEffect(() => {
    async function setupConversation() {
      if (!user || !recipient) return

      try {
        // Check if conversation already exists
        const conversationsQuery = query(
          collection(db, "conversations"),
          where("participants", "array-contains", user.uid),
          limit(1)
        )

        const conversationsSnapshot = await getDocs(conversationsQuery)
        let existingConversation = null

        conversationsSnapshot.forEach((doc) => {
          const conversation = doc.data()
          if (conversation.participants.includes(recipient.id)) {
            existingConversation = {
              id: doc.id,
              ...conversation,
            }
          }
        })

        if (existingConversation) {
          setConversationId(existingConversation.id)
        } else {
          // Create new conversation
          const newConversationRef = await addDoc(collection(db, "conversations"), {
            participants: [user.uid, recipient.id],
            createdAt: serverTimestamp(),
            lastMessageAt: serverTimestamp(),
            lastMessage: "",
          })

          setConversationId(newConversationRef.id)
        }
      } catch (error) {
        console.error("Error setting up conversation:", error)
      }
    }

    setupConversation()
  }, [user, recipient, router])

  // Fetch messages
  useEffect(() => {
    if (!user || !conversationId) return

    const messagesQuery = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "asc"),
      limit(50) // Limit the number of messages initially fetched
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      setMessages(messagesData)
      setLoading(false)

      // Mark messages as read
      snapshot.docs.forEach(async (doc) => {
        const message = doc.data()
        if (message.senderId !== user.uid && !message.read) {
          await updateDoc(doc.ref, { read: true })
        }
      })
    })

    return () => unsubscribe()
  }, [user, conversationId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = useCallback(async (e) => {
    e.preventDefault()

    if (!user || !recipient || !conversationId || !newMessage.trim()) return

    try {
      // Add message
      await addDoc(collection(db, "messages"), {
        conversationId,
        senderId: user.uid,
        recipientId: recipient.id,
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        read: false,
      })

      // Update conversation
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessageAt: serverTimestamp(),
        lastMessage: newMessage.trim(),
      })

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }, [user, recipient, conversationId, newMessage])

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
          <Button variant="ghost" size="icon" className="mr-2 md:hidden" onClick={() => router.push("/messages")}>
            <ArrowLeft size={20} />
          </Button>

          {recipient && (
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src={recipient.avatar} alt={recipient.name} />
                <AvatarFallback>{recipient.name ? recipient.name[0].toUpperCase() : "U"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{recipient.name}</h3>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isSender = message.senderId === user.uid

              return (
                <div key={message.id} className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isSender ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700"
                    }`}
                  >
                    <p>{message.text}</p>
                    <div className={`text-xs mt-1 ${isSender ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>
                      {message.createdAt
                        ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true })
                        : "Sending..."}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No messages yet. Start the conversation!
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={sendMessage} className="flex items-center">
            <Input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 mr-2"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
