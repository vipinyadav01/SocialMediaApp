"use client"

import { useState, useEffect, useRef, useCallback, use } from "react"
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
import { Send, ArrowLeft, MoreVertical, Clock, Check, CheckCheck } from "lucide-react"
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

  // Unwrap params using React.use() to fix the warning
  const unwrappedParams = use(params)
  
  // Fetch recipient info
  useEffect(() => {
    async function fetchRecipient() {
      if (!user || !unwrappedParams?.id) return

      try {
        const recipientDoc = await getDoc(doc(db, "users", unwrappedParams.id))

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
  }, [unwrappedParams?.id, user, router])

  // Find or create conversation
  useEffect(() => {
    async function setupConversation() {
      if (!user || !recipient) return

      try {
        // Check if conversation already exists
        const conversationsQuery = query(
          collection(db, "conversations"),
          where("participants", "array-contains", user.uid),
          limit(10) // Increased limit to improve search
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
      limit(100) // Increased message limit
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

  // Get message status icon
  const getMessageStatus = (message) => {
    if (!message.createdAt) {
      return <Clock size={14} className="ml-1" />
    } else if (!message.read) {
      return <Check size={14} className="ml-1" />
    } else {
      return <CheckCheck size={14} className="ml-1" />
    }
  }

  // Group messages by date for better UI
  const groupMessagesByDate = () => {
    const groups = [];
    let currentDate = null;
    let currentMessages = [];

    messages.forEach((message) => {
      const messageDate = message.createdAt ? 
        new Date(message.createdAt.toDate()).toDateString() : 
        new Date().toDateString();

      if (messageDate !== currentDate) {
        if (currentMessages.length > 0) {
          groups.push({
            date: currentDate,
            messages: currentMessages
          });
        }
        currentDate = messageDate;
        currentMessages = [message];
      } else {
        currentMessages.push(message);
      }
    });

    if (currentMessages.length > 0) {
      groups.push({
        date: currentDate,
        messages: currentMessages
      });
    }

    return groups;
  }

  const messageGroups = groupMessagesByDate();

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-200 dark:border-gray-700">
        {/* Chat Header */}
        <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2 md:hidden text-white hover:bg-blue-600 hover:text-white" 
              onClick={() => router.push("/messages")}
            >
              <ArrowLeft size={20} />
            </Button>

            {recipient && (
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3 ring-2 ring-white ring-opacity-50">
                  <AvatarImage src={recipient.avatar} alt={recipient.name} />
                  <AvatarFallback className="bg-blue-200 text-blue-700">{recipient.name ? recipient.name[0].toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{recipient.name}</h3>
                  <p className="text-xs text-blue-100">
                    {recipient.isOnline ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600">
            <MoreVertical size={20} />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-gray-900">
          {messageGroups.length > 0 ? (
            messageGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
                    {new Date(group.date).toLocaleDateString(undefined, { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
                
                {group.messages.map((message, index) => {
                  const isSender = message.senderId === user.uid;
                  const isFirstInCluster = index === 0 || 
                    group.messages[index - 1].senderId !== message.senderId;
                  const isLastInCluster = index === group.messages.length - 1 || 
                    group.messages[index + 1].senderId !== message.senderId;
                  
                  // Determine which corners to round
                  let bubbleClass = "px-4 py-2 shadow-sm";
                  
                  if (isSender) {
                    bubbleClass += " bg-gradient-to-r from-blue-500 to-blue-600 text-white";
                    if (isFirstInCluster && isLastInCluster) bubbleClass += " rounded-2xl rounded-br-md";
                    else if (isFirstInCluster) bubbleClass += " rounded-t-2xl rounded-bl-2xl rounded-br-md";
                    else if (isLastInCluster) bubbleClass += " rounded-b-2xl rounded-bl-2xl rounded-tr-2xl";
                    else bubbleClass += " rounded-l-2xl rounded-tr-2xl";
                  } else {
                    bubbleClass += " bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700";
                    if (isFirstInCluster && isLastInCluster) bubbleClass += " rounded-2xl rounded-bl-md";
                    else if (isFirstInCluster) bubbleClass += " rounded-t-2xl rounded-tr-2xl rounded-bl-md";
                    else if (isLastInCluster) bubbleClass += " rounded-b-2xl rounded-tr-2xl rounded-tl-2xl";
                    else bubbleClass += " rounded-r-2xl rounded-tl-2xl";
                  }
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isSender ? "justify-end" : "justify-start"} ${!isFirstInCluster ? "mt-1" : "mt-4"}`}
                    >
                      {!isSender && isFirstInCluster && (
                        <Avatar className="h-8 w-8 mr-2 self-end mb-1">
                          <AvatarImage src={recipient?.avatar} alt={recipient?.name} />
                          <AvatarFallback className="bg-blue-200 text-blue-700 text-xs">
                            {recipient?.name ? recipient.name[0].toUpperCase() : "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={`max-w-[75%] ${!isSender && !isFirstInCluster ? "ml-10" : ""}`}>
                        <div className={bubbleClass}>
                          <p className="whitespace-pre-wrap break-words">{message.text}</p>
                        </div>
                        
                        {isLastInCluster && (
                          <div className={`flex items-center text-xs mt-1 ${isSender ? "justify-end text-gray-500" : "justify-start text-gray-500"}`}>
                            {message.createdAt
                              ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true })
                              : "Sending..."}
                            
                            {isSender && (
                              <span className={`flex items-center ${message.read ? "text-blue-500" : "text-gray-400"}`}>
                                {getMessageStatus(message)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {isSender && isFirstInCluster && (
                        <Avatar className="h-8 w-8 ml-2 self-end mb-1">
                          <AvatarImage src={user?.photoURL} alt={user?.displayName} />
                          <AvatarFallback className="bg-blue-600 text-white text-xs">
                            {user?.displayName ? user.displayName[0].toUpperCase() : "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="bg-blue-100 dark:bg-blue-900 p-6 rounded-full mb-4">
                <Send size={32} className="text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No messages yet</h3>
              <p className="max-w-sm">
                Start the conversation with {recipient?.name}! Say hello or ask how they're doing.
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={sendMessage} className="flex items-center">
            <Input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 mr-2 bg-gray-100 dark:bg-gray-700 border-0 focus-visible:ring-2 focus-visible:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim()) {
                    sendMessage(e);
                  }
                }
              }}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!newMessage.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full h-10 w-10 flex items-center justify-center"
            >
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}