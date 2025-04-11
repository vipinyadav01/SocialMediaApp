"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Trash2, Flag } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PostCard({ post }) {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)

  const isLiked = user && post.likes && post.likes.includes(user.uid)
  const isSaved = user && post.savedBy && post.savedBy.includes(user.uid)

  const handleLike = async () => {
    if (!user) return

    const postRef = doc(db, "posts", post.id)

    if (isLiked) {
      await updateDoc(postRef, {
        likes: arrayRemove(user.uid),
        likeCount: (post.likeCount || 1) - 1,
      })

      // Delete notification if exists
      // This would be more complex in a real app
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(user.uid),
        likeCount: (post.likeCount || 0) + 1,
      })

      // Create notification
      if (post.userId !== user.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: post.userId,
          triggeredBy: user.uid,
          triggeredByName: user.name,
          triggeredByAvatar: user.avatar,
          type: "like",
          postId: post.id,
          message: `${user.name} liked your post`,
          read: false,
          createdAt: serverTimestamp(),
        })
      }
    }
  }

  const handleSave = async () => {
    if (!user) return

    const postRef = doc(db, "posts", post.id)

    if (isSaved) {
      await updateDoc(postRef, {
        savedBy: arrayRemove(user.uid),
      })
    } else {
      await updateDoc(postRef, {
        savedBy: arrayUnion(user.uid),
      })
    }
  }

  const handleDelete = async () => {
    if (!user || user.uid !== post.userId) return

    await deleteDoc(doc(db, "posts", post.id))
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!user || !comment.trim()) return

    setIsSubmitting(true)

    try {
      const commentData = {
        postId: post.id,
        userId: user.uid,
        userName: user.name,
        userAvatar: user.avatar,
        text: comment,
        createdAt: serverTimestamp(),
      }

      // Add comment to comments collection
      await addDoc(collection(db, "comments"), commentData)

      // Update comment count on post
      const postRef = doc(db, "posts", post.id)
      await updateDoc(postRef, {
        commentCount: (post.commentCount || 0) + 1,
      })

      // Create notification
      if (post.userId !== user.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: post.userId,
          triggeredBy: user.uid,
          triggeredByName: user.name,
          triggeredByAvatar: user.avatar,
          type: "comment",
          postId: post.id,
          message: `${user.name} commented on your post`,
          read: false,
          createdAt: serverTimestamp(),
        })
      }

      setComment("")
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadComments = async () => {
    if (!showComments) {
      setLoadingComments(true)

      const commentsQuery = query(
        collection(db, "comments"),
        where("postId", "==", post.id),
        orderBy("createdAt", "desc"),
      )

      const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
        const commentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setComments(commentsData)
        setLoadingComments(false)
      })

      // Store unsubscribe function for cleanup
      return unsubscribe
    }
  }

  const toggleComments = async () => {
    if (!showComments) {
      const unsubscribe = await loadComments()
      setShowComments(true)

      // Return cleanup function
      return () => {
        if (unsubscribe) unsubscribe()
      }
    } else {
      setShowComments(false)
    }
  }

  const handleReport = async () => {
    if (!user || !reportReason) return

    try {
      // In a real app, you would add to a reports collection
      await addDoc(collection(db, "reports"), {
        postId: post.id,
        userId: user.uid,
        userName: user.name,
        userAvatar: user.avatar,
        reason: reportReason,
        status: "pending",
        createdAt: serverTimestamp(),
      })

      setShowReportDialog(false)
      setReportReason("")

      // Show success message
      alert("Post reported successfully")
    } catch (error) {
      console.error("Error reporting post:", error)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <Link href={`/profile/${post.userId}`} className="flex items-center">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={post.userAvatar} alt={post.userName} />
            <AvatarFallback>{post.userName ? post.userName[0].toUpperCase() : "U"}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{post.userName}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : "Just now"}
            </p>
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {user && user.uid === post.userId ? (
              <DropdownMenuItem onClick={handleDelete} className="text-red-500">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-red-500">
                <Flag className="mr-2 h-4 w-4" />
                <span>Report</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="mb-3">{post.text}</p>

        {post.mediaUrl && (
          <div className="relative rounded-lg overflow-hidden mb-3">
            {post.mediaType === "image" ? (
              <Image
                src={post.mediaUrl || "/placeholder.svg"}
                alt="Post media"
                width={600}
                height={400}
                className="w-full object-cover max-h-[500px]"
              />
            ) : post.mediaType === "video" ? (
              <video src={post.mediaUrl} controls className="w-full max-h-[500px]" />
            ) : null}
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center ${isLiked ? "text-red-500" : ""}`}
          >
            <Heart size={20} className={isLiked ? "fill-current" : ""} />
            <span className="ml-1">{post.likeCount || 0}</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={toggleComments} className="flex items-center">
            <MessageCircle size={20} />
            <span className="ml-1">{post.commentCount || 0}</span>
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleSave} className={isSaved ? "text-blue-500" : ""}>
            <Bookmark size={20} className={isSaved ? "fill-current" : ""} />
          </Button>

          <Button variant="ghost" size="sm">
            <Share2 size={20} />
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <h4 className="font-medium mb-2">Comments</h4>

          {/* Comment Form */}
          {user ? (
            <form onSubmit={handleComment} className="mb-4 flex">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[60px] flex-1 mr-2"
              />
              <Button type="submit" disabled={!comment.trim() || isSubmitting} className="self-end">
                Post
              </Button>
            </form>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              <Link href="/login" className="text-blue-500">
                Log in
              </Link>{" "}
              to add a comment
            </p>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                    <AvatarFallback>{comment.userName ? comment.userName[0].toUpperCase() : "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                      <div className="font-medium text-sm">{comment.userName}</div>
                      <p className="text-sm">{comment.text}</p>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {comment.createdAt
                        ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })
                        : "Just now"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet</p>
            )}
          </div>
        </div>
      )}

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for reporting</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="false-information">False information</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReport} disabled={!reportReason}>
              Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
