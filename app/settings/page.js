"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [website, setWebsite] = useState("")
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef(null)
  const router = useRouter()

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [messageNotifications, setMessageNotifications] = useState(true)

  // Privacy settings
  const [privateAccount, setPrivateAccount] = useState(false)
  const [showActivity, setShowActivity] = useState(true)
  const [allowTagging, setAllowTagging] = useState(true)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      if (!user) return

      try {
        const profileDoc = await getDoc(doc(db, "users", user.uid))

        if (profileDoc.exists()) {
          const profileData = profileDoc.data()
          setProfile(profileData)
          setName(profileData.name || "")
          setBio(profileData.bio || "")
          setLocation(profileData.location || "")
          setWebsite(profileData.website || "")
          setAvatarPreview(profileData.avatar || "")

          // Set notification settings
          setEmailNotifications(profileData.settings?.emailNotifications !== false)
          setPushNotifications(profileData.settings?.pushNotifications !== false)
          setMessageNotifications(profileData.settings?.messageNotifications !== false)

          // Set privacy settings
          setPrivateAccount(profileData.settings?.privateAccount === true)
          setShowActivity(profileData.settings?.showActivity !== false)
          setAllowTagging(profileData.settings?.allowTagging !== false)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        setError("Failed to load profile data")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchProfile()
    }
  }, [user])

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

  const handleProfileUpdate = async (e) => {
    e.preventDefault()

    if (!user) return

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    setIsSubmitting(true)
    setError("")
    setSuccess("")

    try {
      let avatarUrl = profile?.avatar || ""

      // Upload avatar to Cloudinary if changed
      if (avatar) {
        const formData = new FormData()
        formData.append("file", avatar)
        formData.append("upload_preset", "social_media_app") // Replace with your Cloudinary upload preset

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
      setSuccess("Profile updated successfully")
    } catch (error) {
      console.error("Error updating profile:", error)
      setError(error.message || "Failed to update profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNotificationSettings = async () => {
    if (!user) return

    setIsSubmitting(true)
    setError("")
    setSuccess("")

    try {
      await updateDoc(doc(db, "users", user.uid), {
        "settings.emailNotifications": emailNotifications,
        "settings.pushNotifications": pushNotifications,
        "settings.messageNotifications": messageNotifications,
      })
      setSuccess("Notification settings updated successfully")
    } catch (error) {
      console.error("Error updating notification settings:", error)
      setError(error.message || "Failed to update notification settings")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrivacySettings = async () => {
    if (!user) return

    setIsSubmitting(true)
    setError("")
    setSuccess("")

    try {
      await updateDoc(doc(db, "users", user.uid), {
        "settings.privateAccount": privateAccount,
        "settings.showActivity": showActivity,
        "settings.allowTagging": allowTagging,
      })
      setSuccess("Privacy settings updated successfully")
    } catch (error) {
      console.error("Error updating privacy settings:", error)
      setError(error.message || "Failed to update privacy settings")
    } finally {
      setIsSubmitting(false)
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
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile information and avatar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-2">
                      <AvatarImage src={avatarPreview || "/placeholder.svg?height=96&width=96"} alt="Avatar" />
                      <AvatarFallback className="text-2xl">{name ? name[0].toUpperCase() : "U"}</AvatarFallback>
                    </Avatar>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2"
                    >
                      Change Avatar
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1 space-y-4 w-full">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                        required
                      />
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" onClick={handleProfileUpdate} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} disabled={isSubmitting} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Push Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive push notifications on your device</p>
                </div>
                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} disabled={isSubmitting} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Message Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications for new messages</p>
                </div>
                <Switch
                  checked={messageNotifications}
                  onCheckedChange={setMessageNotifications}
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleNotificationSettings} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Manage your account privacy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Private Account</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Only approved followers can see your posts</p>
                </div>
                <Switch checked={privateAccount} onCheckedChange={setPrivateAccount} disabled={isSubmitting} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Activity Status</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show when you're active on the platform</p>
                </div>
                <Switch checked={showActivity} onCheckedChange={setShowActivity} disabled={isSubmitting} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Allow Tagging</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Allow others to tag you in posts</p>
                </div>
                <Switch checked={allowTagging} onCheckedChange={setAllowTagging} disabled={isSubmitting} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handlePrivacySettings} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
