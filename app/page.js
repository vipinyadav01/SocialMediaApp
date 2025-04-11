"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, orderBy, limit, onSnapshot, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import PostCard from "@/components/post-card"
import UserSuggestions from "@/components/user-suggestions"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { registerServiceWorker } from "./sw-register"
import { motion } from "framer-motion"

export default function Home() {
  const { user, loading } = useAuth()
  const [posts, setPosts] = useState([])
  const [trendingPosts, setTrendingPosts] = useState([])
  const [feedType, setFeedType] = useState("all")
  const [loadingPosts, setLoadingPosts] = useState(true)

  // Register service worker for PWA
  useEffect(() => {
    registerServiceWorker()
  }, [])

  // Fetch trending posts
  useEffect(() => {
    async function fetchTrendingPosts() {
      try {
        const trendingQuery = query(collection(db, "posts"), orderBy("likeCount", "desc"), limit(5))

        const snapshot = await getDocs(trendingQuery)
        const trendingData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setTrendingPosts(trendingData)
      } catch (error) {
        console.error("Error fetching trending posts:", error)
      }
    }

    fetchTrendingPosts()
  }, [])

  // Fetch main feed posts
  useEffect(() => {
    if (loading) return

    let postsQuery

    if (!user) {
      // Not logged in, show public posts
      postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20))
    } else if (feedType === "following" && user) {
      // Show posts from users the current user follows
      postsQuery = query(
        collection(db, "posts"),
        where("userId", "in", [...(user.following || []), user.uid]),
        orderBy("createdAt", "desc"),
        limit(20),
      )
    } else {
      // Show all posts
      postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20))
    }

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setPosts(postsData)
      setLoadingPosts(false)
    })

    return () => unsubscribe()
  }, [user, loading, feedType])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Skeleton className="h-12 w-full rounded-lg" />

          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <div className="p-4 flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                </div>
                <Skeleton className="h-[300px] w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="hidden md:block">
          <Card>
            <CardHeader>
              <CardTitle>Suggested Users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="h-10 w-10 rounded-full mr-3" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-3 w-[80px]" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Tabs defaultValue={user ? "feed" : "all"} className="mb-6">
          <TabsList className="w-full">
            <TabsTrigger value={user ? "feed" : "all"} className="flex-1" onClick={() => setFeedType("all")}>
              {user ? "For You" : "All Posts"}
            </TabsTrigger>
            {user && (
              <TabsTrigger value="following" className="flex-1" onClick={() => setFeedType("following")}>
                Following
              </TabsTrigger>
            )}
            <TabsTrigger value="trending" className="flex-1">
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-6 space-y-6">
            {renderPosts(posts, loadingPosts, user)}
          </TabsContent>

          <TabsContent value="all" className="mt-6 space-y-6">
            {renderPosts(posts, loadingPosts, user)}
          </TabsContent>

          {user && (
            <TabsContent value="following" className="mt-6 space-y-6">
              {renderPosts(posts, loadingPosts, user)}
            </TabsContent>
          )}

          <TabsContent value="trending" className="mt-6 space-y-6">
            {trendingPosts.length > 0 ? (
              <div className="space-y-6">
                {trendingPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                <h3 className="text-lg font-medium mb-2">No trending posts yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Be the first to create popular content!</p>
                {user && (
                  <Button asChild>
                    <a href="/create">Create Post</a>
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden md:block space-y-6">
        <UserSuggestions />

        <Card>
          <CardHeader>
            <CardTitle>Trending Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["#photography", "#travel", "#food", "#technology", "#music"].map((tag) => (
                <div key={tag} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-blue-600 dark:text-blue-400">{tag}</p>
                    <p className="text-xs text-gray-500">{Math.floor(Math.random() * 1000) + 100} posts</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Explore
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reelink Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">New Feature:</span> Dark mode is now available! Toggle it in your
                settings.
              </p>
              <p>
                <span className="font-medium">Coming Soon:</span> Live video streaming and improved messaging.
              </p>
              <p className="text-xs text-gray-500 mt-4">© 2025 Reelink. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function renderPosts(posts, loadingPosts, user) {
  if (loadingPosts) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (posts.length > 0) {
    return (
      <div className="space-y-6">
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <PostCard post={post} />
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
      <h3 className="text-lg font-medium mb-2">No posts yet</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        {user ? "Start by creating a post or following users" : "Sign up to create posts and follow users"}
      </p>
      {user ? (
        <Button asChild>
          <a href="/create">Create Post</a>
        </Button>
      ) : (
        <Button asChild>
          <a href="/signup">Sign Up</a>
        </Button>
      )}
    </div>
  )
}
