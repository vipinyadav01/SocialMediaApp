"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export default function EditProfileModal({ profile, onClose, onUpdate }) {
  const { user } = useAuth()
  const [name, setName] = useState(profile.name || "")
  const [bio, setBio] = useState(profile.bio || "")
  const [location, setLocation] = useState(profile.location || "")
  const [website, setWebsite] = useState(profile.website || "")
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef(null)

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar image must be less than 2MB")
      return
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed for avatar")
      return
    }

    setAvatar(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user) return

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      let avatarUrl = profile.avatar

      // Upload avatar to Cloudinary if changed
      if (avatar) {
        const formData = new FormData()
        formData.append("file", avatar)
        
        // Make sure you have a valid upload preset configured in your Cloudinary account
        // The preset should be set to "unsigned" in the Cloudinary settings
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
        
        if (!uploadPreset) {
          throw new Error("Cloudinary upload preset is not configured")
        }
        
        formData.append("upload_preset", uploadPreset)

        // Make sure your cloud name is correctly set in environment variables
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        
        if (!cloudName) {
          throw new Error("Cloudinary cloud name is not configured")
        }

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        )

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error.message)
        }

        avatarUrl = data.secure_url
      }

      // Update profile in Firestore
      const profileData = {
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatar: avatarUrl,
      }

      await updateDoc(doc(db, "users", user.uid), profileData)

      onUpdate(profileData)
      onClose()
    } catch (error) {
      console.error("Error updating profile:", error)
      setError(error.message || "Failed to update profile")
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500 text-sm">{error}</div>}

          <div className="flex flex-col items-center">
            <div className="relative h-24 w-24 mb-2">
              <Image
                src={avatarPreview || "/placeholder.svg?height=96&width=96"}
                alt="Avatar"
                fill
                className="rounded-full object-cover"
              />

              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
              </Button>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />

            <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              Change Avatar
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isSubmitting}
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. example.com"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}