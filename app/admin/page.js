"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  CheckCircle, 
  Trash2, 
  UserX, 
  Flag, 
  Shield, 
  Users, 
  FileText, 
  AlertTriangle,
  ChevronRight
} from "lucide-react"

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState([])
  const [reportedPosts, setReportedPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      if (!user) return

      try {
        // In a real app, you would check admin status from Firestore
        // For demo purposes, we'll make the creator admin
        setIsAdmin(true)
        setLoading(false)
      } catch (error) {
        console.error("Error checking admin status:", error)
        setLoading(false)
      }
    }

    if (!authLoading) {
      checkAdmin()
    }
  }, [user, authLoading])

  // Fetch users and reported content
  useEffect(() => {
    async function fetchData() {
      if (!isAdmin) return

      try {
        // Fetch users
        const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(20))
        const usersSnapshot = await getDocs(usersQuery)
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setUsers(usersData)

        // Fetch reported posts
        // In a real app, you would have a "reports" collection
        // For demo purposes, we'll simulate some reported posts
        setReportedPosts([
          {
            id: "report1",
            postId: "post1",
            userId: "user1",
            userName: "John Doe",
            userAvatar: "/placeholder.svg?height=40&width=40",
            reason: "Inappropriate content",
            status: "pending",
            createdAt: new Date(),
          },
          {
            id: "report2",
            postId: "post2",
            userId: "user2",
            userName: "Jane Smith",
            userAvatar: "/placeholder.svg?height=40&width=40",
            reason: "Spam",
            status: "resolved",
            createdAt: new Date(),
          },
        ])
      } catch (error) {
        console.error("Error fetching admin data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (isAdmin) {
      fetchData()
    }
  }, [isAdmin])

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !loading && !isAdmin) {
      router.push("/")
    }
  }, [isAdmin, loading, authLoading, router])

  const handleBanUser = async (userId) => {
    try {
      // In a real app, you would update user status in Firestore
      await updateDoc(doc(db, "users", userId), {
        status: "banned",
      })

      // Update local state
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, status: "banned" } : user)))
    } catch (error) {
      console.error("Error banning user:", error)
    }
  }

  const handleResolveReport = async (reportId) => {
    try {
      // In a real app, you would update report status in Firestore
      // For demo purposes, we'll update local state
      setReportedPosts((prev) =>
        prev.map((report) => (report.id === reportId ? { ...report, status: "resolved" } : report)),
      )
    } catch (error) {
      console.error("Error resolving report:", error)
    }
  }

  const handleDeletePost = async (postId) => {
    try {
      // Delete post from Firestore
      await deleteDoc(doc(db, "posts", postId))

      // Update local state
      setReportedPosts((prev) => prev.filter((report) => report.postId !== postId))
    } catch (error) {
      console.error("Error deleting post:", error)
    }
  }

  // Format Firestore timestamp safely
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown"
    
    try {
      // Check if timestamp has toDate method (Firestore Timestamp)
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString()
      }
      
      // Check if timestamp is a Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString()
      }
      
      // Fallback
      return "Unknown"
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Unknown"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-4" />
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4 mb-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <Card className="mb-6 shadow-md border-slate-200">
        <CardHeader className="pb-2 border-b">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center text-xl sm:text-2xl font-bold text-slate-800">
                <Shield className="mr-2 h-5 w-5 text-blue-600" />
                Admin Dashboard
              </CardTitle>
              <CardDescription className="text-slate-500 mt-1">
                Manage users, content, and view platform statistics
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-slate-600 hover:text-slate-900">
                Settings
              </Button>
              <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                Export Data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="users">
            <TabsList className="w-full mb-6 bg-slate-100">
              <TabsTrigger value="users" className="flex-1 data-[state=active]:bg-white data-[state=active]:text-blue-600">
                <Users className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Users Management</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex-1 data-[state=active]:bg-white data-[state=active]:text-blue-600">
                <Flag className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Reported Content</span>
                <span className="sm:hidden">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex-1 data-[state=active]:bg-white data-[state=active]:text-blue-600">
                <FileText className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Platform Statistics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
                <div className="grid grid-cols-12 gap-4 p-4 font-medium border-b bg-slate-50 text-slate-700">
                  <div className="col-span-6 sm:col-span-5">User</div>
                  <div className="col-span-3 sm:col-span-2">Status</div>
                  <div className="hidden sm:block sm:col-span-3">Joined</div>
                  <div className="col-span-3 sm:col-span-2 text-right sm:text-left">Actions</div>
                </div>

                {users.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p>No users found</p>
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="grid grid-cols-12 gap-4 p-4 border-b items-center hover:bg-slate-50 transition-colors">
                      <div className="col-span-6 sm:col-span-5 flex items-center">
                        <Avatar className="h-10 w-10 mr-3 border border-slate-200 shadow-sm">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">{user.name ? user.name[0].toUpperCase() : "U"}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <div className="font-medium text-slate-800">{user.name}</div>
                          <div className="text-sm text-slate-500 truncate">{user.email}</div>
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <Badge
                          variant="outline"
                          className={`
                            ${user.status === "banned" ? "bg-red-50 text-red-600 border-red-200" : ""}
                            ${user.status === "admin" ? "bg-blue-50 text-blue-600 border-blue-200" : ""}
                            ${!user.status || user.status === "active" ? "bg-green-50 text-green-600 border-green-200" : ""}
                          `}
                        >
                          {user.status || "active"}
                        </Badge>
                      </div>
                      <div className="hidden sm:block sm:col-span-3 text-sm text-slate-500">
                        {formatDate(user.createdAt)}
                      </div>
                      <div className="col-span-3 sm:col-span-2 flex justify-end sm:justify-start space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => router.push(`/profile/${user.id}`)}
                          className="h-8 px-2 sm:px-3 text-slate-600 hover:text-slate-900"
                        >
                          <span className="hidden sm:inline mr-1">View</span>
                          <ChevronRight size={16} />
                        </Button>
                        {user.status !== "banned" && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleBanUser(user.id)}
                            className="h-8 px-2 sm:px-3 bg-red-600 hover:bg-red-700"
                          >
                            <UserX size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="reports">
              <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
                <div className="grid grid-cols-12 gap-4 p-4 font-medium border-b bg-slate-50 text-slate-700">
                  <div className="col-span-4 sm:col-span-3">Reported By</div>
                  <div className="col-span-4 sm:col-span-3">Reason</div>
                  <div className="col-span-2">Status</div>
                  <div className="hidden sm:block sm:col-span-2">Date</div>
                  <div className="col-span-2 text-right sm:text-left">Actions</div>
                </div>

                {reportedPosts.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <AlertTriangle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p>No reports found</p>
                  </div>
                ) : (
                  reportedPosts.map((report) => (
                    <div key={report.id} className="grid grid-cols-12 gap-4 p-4 border-b items-center hover:bg-slate-50 transition-colors">
                      <div className="col-span-4 sm:col-span-3 flex items-center">
                        <Avatar className="h-8 w-8 mr-2 border border-slate-200 shadow-sm">
                          <AvatarImage src={report.userAvatar} alt={report.userName} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">{report.userName ? report.userName[0].toUpperCase() : "U"}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm font-medium truncate">{report.userName}</div>
                      </div>
                      <div className="col-span-4 sm:col-span-3">
                        <div className="flex items-center">
                          <Flag size={16} className="mr-2 text-red-500 flex-shrink-0" />
                          <span className="text-sm truncate">{report.reason}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Badge variant="outline" className={`
                          ${report.status === "resolved" ? "bg-green-50 text-green-600 border-green-200" : ""}
                          ${report.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-200" : ""}
                        `}>
                          {report.status}
                        </Badge>
                      </div>
                      <div className="hidden sm:block sm:col-span-2 text-sm text-slate-500">
                        {report.createdAt.toLocaleDateString()}
                      </div>
                      <div className="col-span-2 flex justify-end sm:justify-start space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => router.push(`/post/${report.postId}`)}
                          className="h-8 px-2 sm:px-3 text-slate-600 hover:text-slate-900"
                        >
                          <span className="hidden sm:inline mr-1">View</span>
                          <ChevronRight size={16} />
                        </Button>
                        {report.status === "pending" ? (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleResolveReport(report.id)}
                            className="h-8 px-2 sm:px-3 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle size={16} />
                          </Button>
                        ) : (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeletePost(report.postId)}
                            className="h-8 px-2 sm:px-3 bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="stats">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      <Users className="inline mr-1 h-4 w-4 text-blue-600" />
                      Total Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-800">{users.length}</div>
                    <p className="text-xs text-green-500 mt-1 flex items-center">
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5L12 2M12 2L15 5M12 2V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      +12% from last month
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      <FileText className="inline mr-1 h-4 w-4 text-blue-600" />
                      Active Posts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-800">254</div>
                    <p className="text-xs text-green-500 mt-1 flex items-center">
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5L12 2M12 2L15 5M12 2V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      +8% from last month
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      <Flag className="inline mr-1 h-4 w-4 text-blue-600" />
                      Reports
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-800">{reportedPosts.length}</div>
                    <p className="text-xs text-red-500 mt-1 flex items-center">
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 19L12 22M12 22L15 19M12 22V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      +2% from last month
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="border-b pb-3">
                    <CardTitle className="text-slate-800">Platform Activity</CardTitle>
                    <CardDescription className="text-slate-500">
                      30-day overview of platform usage and engagement
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-md border border-dashed border-slate-200">
                      <div className="text-center p-6">
                        <FileText className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                        <p className="text-slate-600 font-medium">Activity Charts</p>
                        <p className="text-slate-500 text-sm mt-1">
                          Interactive charts would be displayed here showing user activity, content creation, and platform engagement.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}