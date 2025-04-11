"use client"

import { useState, useEffect, use } from "react" // Added 'use' import
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, MapPin, LinkIcon, Edit, Grid, Bookmark } from "lucide-react"
import PostCard from "@/components/post-card"
import EditProfileModal from "@/components/edit-profile-modal"

export default function ProfilePage({ params }) {
  // Unwrap params with React.use()
  const unwrappedParams = use(params)
  const userId = unwrappedParams.id

  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [savedPosts, setSavedPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)

  const isCurrentUser = user && userId === user.uid

  useEffect(() => {
    async function fetchProfile() {
      try {
        const profileRef = doc(db, "users", userId)
        const profileSnap = await getDoc(profileRef)

        if (profileSnap.exists()) {
          const profileData = profileSnap.data()
          setProfile(profileData)
          setFollowerCount(profileData.followers?.length || 0)
          setFollowingCount(profileData.following?.length || 0)

          if (user) {
            setIsFollowing(profileData.followers?.includes(user.uid) || false)
          }
        }

        // Fetch user's posts
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
        )

        const postsSnap = await getDocs(postsQuery)
        const postsData = postsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setPosts(postsData)

        // Fetch saved posts if current user
        if (isCurrentUser) {
          const savedPostsQuery = query(collection(db, "posts"), where("savedBy", "array-contains", user.uid))

          const savedPostsSnap = await getDocs(savedPostsQuery)
          const savedPostsData = savedPostsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))

          setSavedPosts(savedPostsData)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId, user, isCurrentUser])

  const handleFollow = async () => {
    if (!user) return

    try {
      const profileRef = doc(db, "users", userId)
      const userRef = doc(db, "users", user.uid)

      if (isFollowing) {
        // Unfollow
        await updateDoc(profileRef, {
          followers: profile.followers.filter((id) => id !== user.uid),
        })

        await updateDoc(userRef, {
          following: user.following.filter((id) => id !== userId),
        })

        setIsFollowing(false)
        setFollowerCount((prev) => prev - 1)
      } else {
        // Follow
        const newFollowers = profile.followers ? [...profile.followers, user.uid] : [user.uid]
        await updateDoc(profileRef, {
          followers: newFollowers,
        })

        const newFollowing = user.following ? [...user.following, userId] : [userId]
        await updateDoc(userRef, {
          following: newFollowing,
        })

        setIsFollowing(true)
        setFollowerCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error("Error updating follow status:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">User not found</h2>
        <p className="text-gray-500 dark:text-gray-400">
          The user you're looking for doesn't exist or has been removed.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={profile.avatar} alt={profile.name} />
              <AvatarFallback className="text-2xl">{profile.name ? profile.name[0].toUpperCase() : "U"}</AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold">{profile.name}</h1>

                {isCurrentUser ? (
                  <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <Button variant={isFollowing ? "outline" : "default"} size="sm" onClick={handleFollow}>
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                )}
              </div>

              <div className="flex justify-center md:justify-start space-x-6 mb-4">
                <div className="text-center">
                  <div className="font-bold">{posts.length}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Posts</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{followerCount}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Followers</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{followingCount}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Following</div>
                </div>
              </div>

              <div className="space-y-2">
                {profile.bio && <p>{profile.bio}</p>}

                {profile.location && (
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="mr-2 h-4 w-4" />
                    {profile.location}
                  </div>
                )}

                {profile.website && (
                  <div className="flex items-center text-sm">
                    <LinkIcon className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <a
                      href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}

                {profile.createdAt && (
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="mr-2 h-4 w-4" />
                    Joined{" "}
                    {new Date(profile.createdAt.toDate()).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts">
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="flex-1">
            <Grid className="mr-2 h-4 w-4" />
            Posts
          </TabsTrigger>

          {isCurrentUser && (
            <TabsTrigger value="saved" className="flex-1">
              <Bookmark className="mr-2 h-4 w-4" />
              Saved
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          {posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No posts yet</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {isCurrentUser ? "You haven't created any posts yet" : "This user hasn't created any posts yet"}
              </p>

              {isCurrentUser && (
                <Button asChild className="mt-4">
                  <a href="/create">Create Post</a>
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {isCurrentUser && (
          <TabsContent value="saved" className="mt-6">
            {savedPosts.length > 0 ? (
              <div className="space-y-6">
                {savedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">No saved posts</h3>
                <p className="text-gray-500 dark:text-gray-400">You haven't saved any posts yet</p>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedProfile) => setProfile({ ...profile, ...updatedProfile })}
        />
      )}
    </div>
  )
}