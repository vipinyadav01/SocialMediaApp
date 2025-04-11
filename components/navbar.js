"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { usePathname } from "next/navigation"
import { Home, MessageCircle, PlusSquare, Bell, LogOut, Moon, Sun, Search, Menu } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMobile } from "@/hooks/use-mobile"

export default function Navbar() {
  const { user, logout } = useAuth()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const searchRef = useRef(null)

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
      orderBy("createdAt", "desc"),
    )

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      setNotifications(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })

    return () => {
      unsubscribeMessages()
      unsubscribeNotifications()
    }
  }, [user])

  // Handle click outside search
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSearch = async (e) => {
    e.preventDefault()
    // Implement search functionality
    console.log("Searching for:", searchQuery)
    // For a real app, you would query Firestore here
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 backdrop-blur-lg bg-opacity-80 dark:bg-opacity-80">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-2">
                    <Menu size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <div className="flex flex-col h-full">
                    <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-8">
                    Reelink
                    </Link>
                    <div className="space-y-4">
                      <Link
                        href="/"
                        className="flex items-center py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Home className="mr-3" size={20} />
                        <span>Home</span>
                      </Link>
                      <Link
                        href="/explore"
                        className="flex items-center py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Search className="mr-3" size={20} />
                        <span>Explore</span>
                      </Link>
                      <Link
                        href="/messages"
                        className="flex items-center py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <MessageCircle className="mr-3" size={20} />
                        <span>Messages</span>
                      </Link>
                      <Link
                        href="/notifications"
                        className="flex items-center py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Bell className="mr-3" size={20} />
                        <span>Notifications</span>
                      </Link>
                      {user && user.isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span>Admin Dashboard</span>
                        </Link>
                      )}
                    </div>
                    <div className="mt-auto">
                      <Button
                        variant="ghost"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="w-full justify-start"
                      >
                        {theme === "dark" ? <Sun className="mr-3" size={20} /> : <Moon className="mr-3" size={20} />}
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
            Reelink
            </Link>

            {!isMobile && (
              <div className="ml-6 hidden md:flex items-center space-x-1">
                <Link
                  href="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  Home
                </Link>
                <Link
                  href="/explore"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/explore"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  Explore
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isMobile && (
              <div className="relative" ref={searchRef}>
                {showSearch ? (
                  <form onSubmit={handleSearch} className="animate-in fade-in duration-200">
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64"
                      autoFocus
                    />
                  </form>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setShowSearch(true)}>
                    <Search size={20} />
                  </Button>
                )}
              </div>
            )}

            {user ? (
              <div className="flex items-center space-x-2">
                {!isMobile && (
                  <>
                    <Link
                      href="/messages"
                      className={`nav-link relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700`}
                    >
                      <MessageCircle
                        size={20}
                        className={
                          pathname.startsWith("/messages")
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-600 dark:text-gray-300"
                        }
                      />
                      {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/create"
                      className={`nav-link p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700`}
                    >
                      <PlusSquare
                        size={20}
                        className={
                          pathname === "/create"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-600 dark:text-gray-300"
                        }
                      />
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Bell
                            size={20}
                            className={
                              pathname === "/notifications"
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-600 dark:text-gray-300"
                            }
                          />
                          {notifications.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {notifications.length > 9 ? "9+" : notifications.length}
                            </span>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-80">
                        <div className="flex items-center justify-between px-4 py-2 border-b">
                          <h3 className="font-medium">Notifications</h3>
                          <Link href="/notifications" className="text-xs text-blue-600 dark:text-blue-400">
                            See all
                          </Link>
                        </div>
                        {notifications.length === 0 ? (
                          <div className="py-4 px-4 text-sm text-gray-500 text-center">No new notifications</div>
                        ) : (
                          <div className="max-h-[300px] overflow-y-auto">
                            {notifications.slice(0, 5).map((notification) => (
                              <Link
                                key={notification.id}
                                href={
                                  notification.type === "like" || notification.type === "comment"
                                    ? `/post/${notification.postId}`
                                    : `/profile/${notification.triggeredBy}`
                                }
                                className="flex items-start px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                <Avatar className="h-8 w-8 mr-3 mt-1">
                                  <AvatarImage
                                    src={notification.triggeredByAvatar}
                                    alt={notification.triggeredByName}
                                  />
                                  <AvatarFallback>
                                    {notification.triggeredByName ? notification.triggeredByName[0].toUpperCase() : "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm">{notification.message}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {notification.createdAt
                                      ? new Date(notification.createdAt.toDate()).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "Just now"}
                                  </p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative p-0 h-10 w-10 rounded-full overflow-hidden">
                      <Avatar>
                        <AvatarImage
                          src={user.avatar || "/placeholder.svg?height=40&width=40"}
                          alt={user.name || "User"}
                        />
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                          {user.name ? user.name[0].toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center justify-start p-2 border-b mb-2">
                      <Avatar className="h-10 w-10 mr-2">
                        <AvatarImage
                          src={user.avatar || "/placeholder.svg?height=40&width=40"}
                          alt={user.name || "User"}
                        />
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                          {user.name ? user.name[0].toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${user.uid}`} className="cursor-pointer">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    {user.isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer">
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="flex items-center"
                    >
                      {theme === "dark" ? (
                        <>
                          <Sun className="mr-2 h-4 w-4" />
                          <span>Light Mode</span>
                        </>
                      ) : (
                        <>
                          <Moon className="mr-2 h-4 w-4" />
                          <span>Dark Mode</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout} className="text-red-500 cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
