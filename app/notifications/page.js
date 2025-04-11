"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, orderBy, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageCircle, UserPlus } from "lucide-react"

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Fetch notifications
  useEffect(() => {
    if (!user) return

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    )

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      setNotifications(notificationsData)
      setLoading(false)

      // Mark all as read
      snapshot.docs.forEach(async (doc) => {
        const notification = doc.data()
        if (!notification.read) {
          await updateDoc(doc.ref, { read: true })
        }
      })
    })

    return () => unsubscribe()
  }, [user])

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart className="text-red-500" size={16} />
      case "comment":
        return <MessageCircle className="text-blue-500" size={16} />
      case "follow":
        return <UserPlus className="text-green-500" size={16} />
      default:
        return null
    }
  }

  const getNotificationLink = (notification) => {
    switch (notification.type) {
      case "like":
      case "comment":
        return `/post/${notification.postId}`
      case "follow":
        return `/profile/${notification.triggeredBy}`
      default:
        return "#"
    }
  }

  if (authLoading || loading) {
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
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                href={getNotificationLink(notification)}
                className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  !notification.read ? "bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
              >
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={notification.triggeredByAvatar} alt={notification.triggeredByName} />
                    <AvatarFallback>
                      {notification.triggeredByName ? notification.triggeredByName[0].toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className="mr-2">{getNotificationIcon(notification.type)}</span>
                      <p className="text-sm">{notification.message}</p>
                    </div>
                    {notification.createdAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                      </p>
                    )}
                  </div>

                  {!notification.read && <div className="h-2 w-2 bg-blue-500 rounded-full ml-2"></div>}
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
