"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  increment,
  getDocs,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import PostCard from "@/components/post-card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

export default function PostPage({ params }) {
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [relatedPosts, setRelatedPosts] = useState([])
  const router = useRouter()
  const limit = 3

  useEffect(() => {
    async function fetchPost() {
      try {
        const postDoc = await getDoc(doc(db, "posts", params.id))

        if (postDoc.exists()) {
          const postData = {
            id: postDoc.id,
            ...postDoc.data(),
          }

          setPost(postData)

          // Increment view count
          await updateDoc(doc(db, "posts", params.id), {
            viewCount: increment(1),
          })

          // Fetch comments
          const commentsQuery = query(
            collection(db, "comments"),
            where("postId", "==", params.id),
            orderBy("createdAt", "desc"),
          )

          const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
            const commentsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))

            setComments(commentsData)
          })

          // Fetch related posts by same user
          const relatedPostsQuery = query(
            collection(db, "posts"),
            where("userId", "==", postData.userId),
            where("__name__", "!=", params.id),
            orderBy("__name__"),
            orderBy("createdAt", "desc"),
          )

          const relatedPostsSnapshot = await getDocs(relatedPostsQuery)
          const relatedPostsData = relatedPostsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))

          setRelatedPosts(relatedPostsData)
          setLoading(false)

          return () => unsubscribeComments()
        } else {
          // Post doesn't exist
          setLoading(false)
        }
      } catch (error) {
        console.error("Error fetching post:", error)
        setLoading(false)
      }
    }

    fetchPost()
  }, [params.id])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
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
      </div>
    )
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Post not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          The post you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => router.push("/")}>Go Home</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <PostCard post={post} comments={comments} expandComments={true} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">More from {post.userName}</h3>
              {relatedPosts.length > 0 ? (
                <div className="space-y-4">
                  {relatedPosts.map((relatedPost) => (
                    <div key={relatedPost.id} className="flex items-start space-x-3">
                      {relatedPost.mediaUrl && relatedPost.mediaType === "image" && (
                        <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden">
                          <img
                            src={relatedPost.mediaUrl || "/placeholder.svg"}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/post/${relatedPost.id}`}
                          className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                        >
                          {relatedPost.text}
                        </Link>
                        <p className="text-xs text-gray-500 mt-1">
                          {relatedPost.likeCount || 0} likes • {relatedPost.commentCount || 0} comments
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No other posts from this user</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">About this post</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Posted</span>
                  <span>{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Views</span>
                  <span>{post.viewCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Likes</span>
                  <span>{post.likeCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Comments</span>
                  <span>{post.commentCount || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
