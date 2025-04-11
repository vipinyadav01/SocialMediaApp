"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ImageIcon, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CreatePostPage() {
  const { user, loading: authLoading } = useAuth()
  const [text, setText] = useState("")
  const [media, setMedia] = useState(null)
  const [mediaPreview, setMediaPreview] = useState("")
  const [mediaType, setMediaType] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef(null)
  const router = useRouter()

  // Redirect if not logged in
  if (!authLoading && !user) {
    router.push("/login")
    return null
  }

  const handleMediaChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB")
      return
    }

    // Check file type
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Only image and video files are allowed")
      return
    }

    setMedia(file)
    setMediaType(file.type.startsWith("image/") ? "image" : "video")

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setMediaPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const removeMedia = () => {
    setMedia(null)
    setMediaPreview("")
    setMediaType("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user) {
      router.push("/login")
      return
    }

    if (!text.trim() && !media) {
      setError("Please add text or media to your post")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      let mediaUrl = ""

      // Upload media to Cloudinary if exists
      if (media) {
        const formData = new FormData()
        formData.append("file", media)
        formData.append("upload_preset", "Hostel") 

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
          {
            method: "POST",
            body: formData,
          },
        )

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error.message)
        }

        mediaUrl = data.secure_url
      }

      // Create post in Firestore
      const postData = {
        text: text.trim(),
        userId: user.uid,
        userName: user.name,
        userAvatar: user.avatar,
        mediaUrl,
        mediaType,
        likes: [],
        likeCount: 0,
        commentCount: 0,
        savedBy: [],
        createdAt: serverTimestamp(),
      }

      await addDoc(collection(db, "posts"), postData)

      // Redirect to home page
      router.push("/")
    } catch (error) {
      console.error("Error creating post:", error)
      setError(error.message || "Failed to create post")
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Post</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Textarea
              placeholder="What's on your mind?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] mb-4"
              disabled={isSubmitting}
            />

            {mediaPreview && (
              <div className="relative mb-4 rounded-lg overflow-hidden">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 z-10 h-8 w-8"
                  onClick={removeMedia}
                >
                  <X size={16} />
                </Button>

                {mediaType === "image" ? (
                  <Image
                    src={mediaPreview || "/placeholder.svg"}
                    alt="Media preview"
                    width={600}
                    height={400}
                    className="w-full object-cover max-h-[400px]"
                  />
                ) : (
                  <video src={mediaPreview} controls className="w-full max-h-[400px]" />
                )}
              </div>
            )}

            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Add Media
              </Button>

              <Button type="submit" disabled={isSubmitting || (!text.trim() && !media)}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post"
                )}
              </Button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleMediaChange}
              accept="image/*,video/*"
              className="hidden"
            />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
