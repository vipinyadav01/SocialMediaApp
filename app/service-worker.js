// This is a service worker file for PWA functionality

// Cache name
const CACHE_NAME = "social-media-app-v1"

// Assets to cache
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting()),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME
            })
            .map((cacheName) => {
              return caches.delete(cacheName)
            }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Fetch event - network first, falling back to cache
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return
  }

  // For HTML pages, use network-first strategy
  if (event.request.headers.get("accept").includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache a copy of the response
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            return caches.match("/")
          })
        }),
    )
    return
  }

  // For other assets, use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((response) => {
          // Cache a copy of the response
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch((error) => {
          console.error("Fetch failed:", error)
          // For image requests, return a placeholder
          if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
            return caches.match("/placeholder.svg")
          }
          throw error
        })
    }),
  )
})

// Push notification event
self.addEventListener("push", (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()

    const options = {
      body: data.body || "New notification",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      data: {
        url: data.url || "/",
      },
      actions: [
        {
          action: "view",
          title: "View",
        },
      ],
    }

    event.waitUntil(self.registration.showNotification(data.title || "Notification", options))
  } catch (error) {
    console.error("Error showing notification:", error)
  }
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "view" || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        const url = event.notification.data.url || "/"

        // If a window is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus()
          }
        }

        // Otherwise open a new window
        return clients.openWindow(url)
      }),
    )
  }
})

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "post-message") {
    event.waitUntil(syncMessages())
  } else if (event.tag === "post-comment") {
    event.waitUntil(syncComments())
  } else if (event.tag === "post-like") {
    event.waitUntil(syncLikes())
  }
})

// Sync functions would be implemented to handle offline actions
async function syncMessages() {
  // Implementation would go here
  console.log("Syncing messages")
}

async function syncComments() {
  // Implementation would go here
  console.log("Syncing comments")
}

async function syncLikes() {
  // Implementation would go here
  console.log("Syncing likes")
}
