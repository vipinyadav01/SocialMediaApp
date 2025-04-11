"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import PostCard from "@/components/post-card"
import UserSuggestions from "@/components/user-suggestions"

export default function ExplorePage() {
  const { user } = useAuth()
  const [trendingPosts, setTrendingPosts] = useState([])
  const [recentPosts, setRecentPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPosts() {
      try {
        // Fetch trending posts (most likes)
        const trendingQuery = query(collection(db, "posts"), orderBy("likeCount", "desc"), limit(10))

        const trendingSnapshot = await getDocs(trendingQuery)
        const trendingData = trendingSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setTrendingPosts(trendingData)

        // Fetch recent posts
        const recentQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(10))

        const recentSnapshot = await getDocs(recentQuery)
        const recentData = recentSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setRecentPosts(recentData)
      } catch (error) {
        console.error("Error fetching explore posts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Explore</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="trending">
              <TabsList className="w-full">
                <TabsTrigger value="trending" className="flex-1">
                  Trending
                </TabsTrigger>
                <TabsTrigger value="recent" className="flex-1">
                  Recent
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trending" className="mt-6">
                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : trendingPosts.length > 0 ? (
                  <div className="space-y-6">
                    {trendingPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No trending posts found</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recent" className="mt-6">
                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : recentPosts.length > 0 ? (
                  <div className="space-y-6">
                    {recentPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No recent posts found</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:block">
        <UserSuggestions />
      </div>
    </div>
  )
}
