# SocialMediaMiniPlatform_Frontend
# ConnectSphere — Social Media Platform

A full-featured Social Media Platform built using **Microservices Architecture** with **ASP.NET Core**, **C#**, and **PostgreSQL**. Inspired by platforms like Instagram and Twitter.

---

## 🌐 Live Architecture

```
Client (Browser / Mobile)
          ↓
    API Gateway (Port 5000)        ← Single Entry Point (YARP Reverse Proxy)
          ↓
┌─────────────────────────────────────────────────────┐
│  AuthService         → Port 5050                   │
│  PostService         → Port 5100                   │
│  LikeService         → Port 5200                   │
│  CommentService      → Port 5300                   │
│  FollowService       → Port 5400                   │
│  NotificationService → Port 5500                   │
│  FeedService         → Port 5600                   │
└─────────────────────────────────────────────────────┘
         ↓                    ↓
    PostgreSQL             Redis Cache
   (per service DB)      (Feed Caching)
```

---

## 🚀 Features

### Authentication
- User Registration and Login
- JWT Token based Authentication (7 day expiry)
- Google OAuth 2.0 Login
- Password Hashing using PBKDF2
- Role based Authorization (User / Admin)
- Profile update, Password change, Account deactivation
- Toggle Public / Private account

### Posts
- Create, Edit, Delete Posts
- Support for Media (Image, Video, GIF)
- Visibility control (Public, Followers Only, Private)
- Hashtag support
- Search posts by content or hashtag
- Trending posts by engagement score
- Soft Delete (posts are never permanently removed)
- Repost / Share support

### Likes
- Like and Unlike Posts and Comments (Polymorphic)
- Toggle Like with database transaction (atomic)
- Real time like count
- View who liked a post

### Comments
- Add Comments on Posts
- Nested Replies (Threaded Comments like YouTube)
- Edit and Soft Delete comments
- Comment count per post

### Follow System
- Follow and Unfollow users
- Private account support — Follow Request goes PENDING
- Accept or Reject follow requests
- Mutual followers detection
- Follower and Following count auto updated

### Notifications
- 9 Notification types: Like, Comment, Reply, Follow, Follow Request, Follow Accepted, Mention, Platform
- Bulk notification sending (used by other services)
- Mark as Read, Mark All as Read
- Unread notification count (for badge)
- Delete notifications

### Feed
- Home Feed using Fanout-on-Write pattern
- Redis Caching with 5 minute TTL
- Explore Feed (posts from non-followed users)
- Trending Hashtags
- Suggested Users

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| C# | Programming Language |
| ASP.NET Core (.NET 10) | Web Framework for all services |
| Entity Framework Core | ORM — C# to SQL mapping |
| PostgreSQL | Relational Database (one per service) |
| JWT (JSON Web Token) | Authentication and Authorization |
| Redis | Feed Caching (in-memory for dev) |
| YARP | API Gateway / Reverse Proxy |
| Google OAuth 2.0 | Social Login |
| Swagger / OpenAPI | API Documentation |
| NUnit | Unit Testing Framework |
| Moq | Mocking Library for Unit Tests |
| PBKDF2 | Password Hashing Algorithm |
| IHttpClientFactory | Service to Service HTTP communication |

---



Each service uses its own database:

| Service | Database Name |
|---|---|
| AuthService | ConnectSphereAuthDb |
| PostService | ConnectSpherePostDb |
| LikeService | ConnectSphereLikeDb |
| CommentService | ConnectSphereCommentDb |
| FollowService | ConnectSphereFollowDb |
| NotificationService | ConnectSphereNotifDb |
| FeedService | ConnectSphereFeedDb |

---

### Configure JWT Settings

---

### Run Migrations

Migrations run automatically on app startup via `db.Database.Migrate()` in each `Program.cs`. No manual steps needed.

---

### Start All Services

Open a separate terminal for each service and run:

```bash
# Terminal 1 — API Gateway
cd ApiGateway
dotnet run

# Terminal 2 — Auth Service
cd AuthService.Api
dotnet run

# Terminal 3 — Post Service
cd PostService.Api
dotnet run

# Terminal 4 — Like Service
cd LikeService.Api
dotnet run

# Terminal 5 — Comment Service
cd CommentService.Api
dotnet run

# Terminal 6 — Follow Service
cd FollowService.Api
dotnet run

# Terminal 7 — Notification Service
cd NotificationService.Api
dotnet run

# Terminal 8 — Feed Service
cd FeedService.Api
dotnet run
```

---

### 6. Access Swagger UI

Each service has Swagger documentation available:

| Service | Swagger URL |
|---|---|
| API Gateway | http://localhost:5000/swagger |
| Auth Service | http://localhost:5050/swagger |
| Post Service | http://localhost:5100/swagger |
| Like Service | http://localhost:5200/swagger |
| Comment Service | http://localhost:5300/swagger |
| Follow Service | http://localhost:5400/swagger |
| Notification Service | http://localhost:5500/swagger |
| Feed Service | http://localhost:5600/swagger |

---

## 🔑 API Endpoints Overview

### Auth Service — `/api/users`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login and get JWT token | No |
| POST | `/logout` | Logout | Yes |
| POST | `/validate-token` | Check if token is valid | No |
| POST | `/refresh-token` | Get new token | No |
| GET | `/{id}` | Get user profile by ID | Yes |
| GET | `/by-username/{name}` | Get profile by username | No |
| PUT | `/{id}/profile` | Update profile | Yes |
| PUT | `/{id}/change-password` | Change password | Yes |
| PUT | `/{id}/toggle-privacy` | Toggle public/private | Yes |
| DELETE | `/{id}/deactivate` | Deactivate account | Yes |
| GET | `/search?q=john` | Search users | No |
| POST | `/google/verify` | Google OAuth login | No |
| GET | `/admin/all` | Get all users | Admin |
| PUT | `/admin/suspend/{id}` | Suspend user | Admin |
| PUT | `/admin/activate/{id}` | Activate user | Admin |
| DELETE | `/admin/delete/{id}` | Permanently delete user | Admin |

### Post Service — `/api/posts`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/` | Create post | Yes |
| GET | `/{id}` | Get post by ID | No |
| GET | `/user/{userId}` | Get posts by user | No |
| GET | `/public` | Get all public posts | No |
| PUT | `/{id}` | Update post | Yes |
| DELETE | `/{id}` | Delete post | Yes |
| GET | `/hashtag/{tag}` | Posts by hashtag | No |
| GET | `/search?q=hello` | Search posts | Yes |
| GET | `/trending` | Trending posts | No |

### Like Service — `/api/likes`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/toggle` | Like or Unlike | Yes |
| GET | `/byTarget/{id}?targetType=POST` | Likes on a target | No |
| GET | `/byUser/{userId}` | Likes by a user | No |
| GET | `/count?targetId=1&targetType=POST` | Like count | No |
| GET | `/hasLiked?userId=1&targetId=1&targetType=POST` | Check if liked | Yes |

### Comment Service — `/api/comments`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/` | Add comment | Yes |
| GET | `/{commentId}` | Get comment by ID | No |
| GET | `/byPost/{postId}` | All comments on a post | No |
| GET | `/topLevel/{postId}` | Top level comments only | No |
| GET | `/replies/{commentId}` | Replies to a comment | No |
| PUT | `/{commentId}` | Edit comment | Yes |
| DELETE | `/{commentId}` | Delete comment | Yes |

### Follow Service — `/api/follows`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/` | Follow a user | Yes |
| DELETE | `/unfollow` | Unfollow a user | Yes |
| PUT | `/accept/{followId}` | Accept follow request | Yes |
| PUT | `/reject/{followId}` | Reject follow request | Yes |
| GET | `/followers/{userId}` | Get followers | No |
| GET | `/following/{userId}` | Get following | No |
| GET | `/isFollowing?followerId=1&followeeId=2` | Check follow status | No |

### Notification Service — `/api/notifications`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/byRecipient/{id}` | All notifications | Yes |
| GET | `/unread/{id}` | Unread notifications | Yes |
| GET | `/unreadCount/{id}` | Unread count | Yes |
| PUT | `/markAsRead/{id}` | Mark one as read | Yes |
| PUT | `/markAllRead/{id}` | Mark all as read | Yes |
| DELETE | `/{id}` | Delete notification | Yes |
| POST | `/sendBulk` | Internal — send bulk notifications | No |

### Feed Service — `/api/feed`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/{userId}` | Get home feed | Yes |
| GET | `/explore/{userId}` | Get explore feed | No |
| POST | `/fanout` | Internal — fanout post to feeds | No |
| GET | `/trending` | Trending hashtags | No |
| GET | `/suggested/{userId}` | Suggested users | Yes |

---

## 🏗️ Design Patterns Used

| Pattern | Where Used | Why |
|---|---|---|
| **Repository Pattern** | All Services | Separates database code from business logic |
| **DTO Pattern** | All Services | API objects are different from database models |
| **Dependency Injection** | All Services | ASP.NET Core built-in DI container |
| **Soft Delete** | Posts, Comments | Records never permanently removed |
| **Fanout-on-Write** | Feed Service | Feed pre-computed at post creation time |
| **Cache-Aside** | Feed Service | Check Redis first, fallback to database |
| **Fire and Forget** | Post Service | Fanout runs in background, user not blocked |
| **Polymorphic Design** | Like Service | One service handles likes for Posts and Comments |

---

## 🧪 Running Tests

```bash
# Run all tests
cd Testing
dotnet test

# Run tests for a specific service
cd Testing/AuthService.Tests
dotnet test

cd Testing/PostService.Tests
dotnet test
```

Tests use **NUnit** as the testing framework and **Moq** for mocking repositories — no real database needed.

---

## 🔄 Service Communication

```
PostService   ──HTTP──►  FollowService    (get followers for fanout)
PostService   ──HTTP──►  FeedService      (fanout new post)
LikeService   ──HTTP──►  NotifService     (send like notification)
CommentService──HTTP──►  NotifService     (send comment notification)
FollowService ──HTTP──►  AuthService      (check IsPrivate + update counters)
FollowService ──HTTP──►  NotifService     (send follow notification)
```

> **Note:** In production, these HTTP calls would be replaced with a Message Queue like **RabbitMQ** for loose coupling, better fault tolerance, and async processing.


---


> Built with ❤️ using ASP.NET Core Microservices
