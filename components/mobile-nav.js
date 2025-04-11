"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Home, MessageCircle, PlusSquare, Bell } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"

export default function MobileNav() {
  const { user } = useAuth()
  const pathname = usePathname()
  const isMobile = useMobile()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isFocused, setIsFocused] = useState(false)

  // Listen for unread messages and notifications
  useEffect(() => {
    if (!user) return

    // Listen for unread messages
    const messagesQuery = query(
      collection(db, "messages"),
      where("recipientId", "==", user.uid),
      where("read", "==", false),
    )

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      setUnreadMessages(snapshot.docs.length)
    })

    // Listen for notifications
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false),
    )

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      setNotifications(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })

    return () => {
      unsubscribeMessages()
      unsubscribeNotifications()
    }
  }, [user])

  // Handle scroll to hide/show nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false)
      } else {
        // Scrolling up
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [lastScrollY])

  // Handle input focus to hide nav
  useEffect(() => {
    const handleFocus = () => setIsFocused(true)
    const handleBlur = () => setIsFocused(false)

    const inputs = document.querySelectorAll("input, textarea")

    inputs.forEach((input) => {
      input.addEventListener("focus", handleFocus)
      input.addEventListener("blur", handleBlur)
    })

    return () => {
      inputs.forEach((input) => {
        input.removeEventListener("focus", handleFocus)
        input.removeEventListener("blur", handleBlur)
      })
    }
  }, [])

  if (!isMobile || !user) return null

  return (
    <AnimatePresence>
      {isVisible && !isFocused && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 shadow-lg"
        >
          <div className="flex justify-around items-center h-16">
            <Link
              href="/"
              className={`flex flex-col items-center justify-center w-full h-full ${
                pathname === "/" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <Home size={24} />
              <span className="text-xs mt-1">Home</span>
            </Link>

            <Link
              href="/messages"
              className={`flex flex-col items-center justify-center w-full h-full relative ${
                pathname.startsWith("/messages")
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <MessageCircle size={24} />
              {unreadMessages > 0 && (
                <span className="absolute top-1 right-[calc(50%-12px)] bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
              <span className="text-xs mt-1">Messages</span>
            </Link>

            <Link href="/create" className="flex flex-col items-center justify-center w-full h-full">
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-full p-3 -mt-8 shadow-lg">
                <PlusSquare size={24} className="text-white" />
              </div>
              <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">Create</span>
            </Link>

            <Link
              href="/notifications"
              className={`flex flex-col items-center justify-center w-full h-full relative ${
                pathname === "/notifications" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <Bell size={24} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-[calc(50%-12px)] bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
              <span className="text-xs mt-1">Alerts</span>
            </Link>

            <Link
              href={`/profile/${user.uid}`}
              className={`flex flex-col items-center justify-center w-full h-full ${
                pathname.startsWith("/profile")
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <div className="relative w-6 h-6">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar || "/placeholder.svg?height=24&width=24"} alt={user.name || "User"} />
                  <AvatarFallback className="text-xs">{user.name ? user.name[0].toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs mt-1">Profile</span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
