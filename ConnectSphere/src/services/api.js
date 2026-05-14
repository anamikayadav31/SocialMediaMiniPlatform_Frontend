const BASE_URL = "http://localhost:5000/api";

export const getToken = () => localStorage.getItem("token");
export const getUser  = () => JSON.parse(localStorage.getItem("user") || "null");

function saveSession(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify({
    userId:   data.userId,
    userName: data.userName,
    fullName: data.fullName,
    role:     data.role,
  }));
}
export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// ────────────────────────────────────────────────────────────
// CORE FETCHER
// Rules:
//  • Login / register / google-verify endpoints — 401 is
//    just "wrong credentials", never auto-logout here.
//  • All other protected endpoints — 401 = expired/missing
//    token → clear session and dispatch auth:logout ONLY if
//    user was already logged in (token existed).
// ────────────────────────────────────────────────────────────
const AUTH_PATHS = [
  "/users/login",
  "/users/register",
  "/users/google/verify",
  "/users/validate-token",
  "/users/refresh-token",
];

// GET requests never trigger logout on 401 — they are read-only fetches
// (notifications, feed, likes, follows) and silently failing is correct.
// Only POST/PUT/DELETE 401s mean the session is truly expired/invalid.
const LOGOUT_ON_401_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

async function request(method, path, body = null, auth = false) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error("Network error — is the server running?");
  }

  if (res.status === 204) return null;

  // Parse body once
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }

  if (res.status === 401) {
    const isAuthPath    = AUTH_PATHS.some(p => path.startsWith(p));
    const isMutating    = LOGOUT_ON_401_METHODS.includes(method.toUpperCase());

    // Only force-logout when:
    //  - NOT a login/register endpoint (those 401 = wrong credentials)
    //  - IS a mutating request (POST/PUT/DELETE) — GET 401s are silent
    //  - AND the user had an active session token
    if (!isAuthPath && isMutating && getToken()) {
      clearSession();
      setTimeout(() => window.dispatchEvent(new CustomEvent("auth:logout")), 0);
    }
    throw new Error(data?.message || (isAuthPath ? "Invalid email or password." : "Session expired. Please login again."));
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return data;
}

// ── Auth ────────────────────────────────────────────────────
export const authApi = {
  async register(dto) {
    const d = await request("POST", "/users/register", dto);
    saveSession(d);
    return d;
  },
  async login(dto) {
    const d = await request("POST", "/users/login", dto);
    saveSession(d);
    return d;
  },
  async googleLogin(idToken) {
    const d = await request("POST", "/users/google/verify", { idToken });
    saveSession(d);
    return d;
  },
  async logout() {
    clearSession();
  },
};

// ── Users ───────────────────────────────────────────────────
export const userApi = {
  async getById(id)             { return request("GET", `/users/${id}`, null, true); },
  async exists(id) {
    try { await this.getById(id); return true; }
    catch { return false; }
  },
  async getByUserName(u)        { return request("GET", `/users/by-username/${u}`, null, true); },
  async updateProfile(id, dto)  { return request("PUT", `/users/${id}/profile`, dto, true); },
  async changePassword(id, dto) { return request("PUT", `/users/${id}/change-password`, dto, true); },
  async togglePrivacy(id)       { return request("PUT", `/users/${id}/toggle-privacy`, null, true); },
  async search(q)               { return request("GET", `/users/search?q=${encodeURIComponent(q)}`, null, true); },
  async getAllUsers()            { return request("GET", `/users/admin/all`, null, true); },
  async suspendUser(id)         { return request("PUT", `/users/admin/suspend/${id}`, null, true); },
  async activateUser(id)        { return request("PUT", `/users/admin/activate/${id}`, null, true); },
  async adminDeleteUser(id)     { return request("DELETE", `/users/admin/delete/${id}`, null, true); },
};

// ── Posts ───────────────────────────────────────────────────
export const postApi = {
  async getPublic(page = 1, sz = 20)  { return request("GET", `/posts/public?page=${page}&pageSize=${sz}`, null, false); },
  async getTrending(h = 48, t = 30)   { return request("GET", `/posts/trending?hoursBack=${h}&take=${t}`, null, false); },
  async search(q, page = 1)           { return request("GET", `/posts/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=20`, null, true); },
  async getByUser(userId)             { return request("GET", `/posts/user/${userId}`, null, true); },
  async getById(postId)               { return request("GET", `/posts/${postId}`, null, true); },
  async create(dto) {
    if (!dto.content?.trim()) throw new Error("Post content cannot be empty");
    return request("POST", "/posts", {
      userId:     dto.userId,
      content:    dto.content.trim(),
      mediaUrl:   dto.mediaUrl   || null,
      mediaType:  dto.mediaType  || "NONE",
      hashtags:   dto.hashtags   || "",
      visibility: dto.visibility || "PUBLIC",
    }, true);
  },
  async delete(postId) { return request("DELETE", `/posts/${postId}`, null, true); },
  async getFeed(followingIds, page = 1, sz = 10) {
    const q = followingIds.map(id => `followingIds=${id}`).join("&");
    return request("GET", `/posts/feed?${q}&page=${page}&pageSize=${sz}`, null, true);
  },
};

// ── Likes ───────────────────────────────────────────────────
export const likeApi = {
  async toggle(userId, targetId, ownerId = null) {
    const result = await request("POST", "/likes/toggle", {
      userId:     Number(userId),
      targetId:   Number(targetId),
      targetType: "POST",
      ownerId:    ownerId ? Number(ownerId) : null,
    }, true);
    return {
      liked:     result?.liked     ?? result?.Liked     ?? false,
      likeCount: result?.likeCount ?? result?.LikeCount ?? 0,
    };
  },
  async hasLiked(userId, targetId) {
    try {
      const d = await request("GET",
        `/likes/hasLiked?userId=${userId}&targetId=${targetId}&targetType=POST`,
        null, true);
      return { hasLiked: d?.liked ?? d?.hasLiked ?? false };
    } catch { return { hasLiked: false }; }
  },
  async getLikeCount(targetId) {
    try {
      const d = await request("GET",
        `/likes/count?targetId=${targetId}&targetType=POST`,
        null, false);
      return { count: d?.count ?? 0 };
    } catch { return { count: 0 }; }
  },
};

// ── Comments ────────────────────────────────────────────────
export const commentApi = {
  async getByPost(postId) {
    // byPost is public — no auth needed
    return request("GET", `/comments/byPost/${postId}`, null, false);
  },
  async add(postId, dto) {
    const body = {
      postId:          Number(postId),
      userId:          Number(dto.userId),
      content:         String(dto.content).trim(),
      parentCommentId: dto.parentCommentId ? Number(dto.parentCommentId) : null,
      postOwnerId:     dto.postOwnerId     ? Number(dto.postOwnerId)     : null,
    };
    if (!body.content) throw new Error("Comment cannot be empty");
    if (!body.userId)  throw new Error("Not logged in");
    return request("POST", "/comments", body, true);
  },
  async edit(commentId, content) { return request("PUT",    `/comments/${commentId}`, { content }, true); },
  async delete(commentId)        { return request("DELETE", `/comments/${commentId}`, null, true); },
};

// ── Follows ─────────────────────────────────────────────────
export const followApi = {
  async follow(followerId, followeeId) {
    return request("POST", "/follows",
      { followerId: Number(followerId), followeeId: Number(followeeId) }, true);
  },
  async unfollow(followerId, followeeId) {
    return request("DELETE", "/follows/unfollow",
      { followerId: Number(followerId), followeeId: Number(followeeId) }, true);
  },
  async accept(followId)       { return request("PUT", `/follows/accept/${followId}`,  null, true); },
  async reject(followId)       { return request("PUT", `/follows/reject/${followId}`,  null, true); },
  async getPending(userId)     { return request("GET", `/follows/pending/${userId}`,   null, true); },
  async getFollowers(userId)   { return request("GET", `/follows/followers/${userId}`, null, true); },
  async getFollowing(userId)   { return request("GET", `/follows/following/${userId}`, null, true); },
  async isFollowing(followerId, followeeId) {
    try {
      const d = await request("GET",
        `/follows/isFollowing?followerId=${followerId}&followeeId=${followeeId}`, null, true);
      return { isFollowing: d?.isFollowing ?? false };
    } catch { return { isFollowing: false }; }
  },
  async getFollowerCount(userId) {
    try {
      const d = await request("GET", `/follows/followerCount/${userId}`, null, true);
      return { followerCount: d?.followerCount ?? 0 };
    } catch { return { followerCount: 0 }; }
  },
  async getFollowingCount(userId) {
    try {
      const d = await request("GET", `/follows/followingCount/${userId}`, null, true);
      return { followingCount: d?.followingCount ?? 0 };
    } catch { return { followingCount: 0 }; }
  },
  async getFollowingIds(userId) {
    return request("GET", `/follows/followingIds/${userId}`, null, true);
  },
  async getFollowerIds(userId) {
    // Currently no dedicated endpoint for IDs only, so we map the full list
    const list = await request("GET", `/follows/followers/${userId}`, null, true);
    return (Array.isArray(list) ? list : []).map(f => f.followerId || f.FollowerId);
  },
};

// ── Feed ────────────────────────────────────────────────────
export const feedApi = {
  async getForUser(userId, page = 1, sz = 20) {
    return request("GET", `/feed/${userId}?page=${page}&pageSize=${sz}`, null, true);
  },
};

// ── Notifications ───────────────────────────────────────────
export const notifApi = {
  async getAll(userId)         { return request("GET",    `/notifications/byRecipient/${userId}`, null, true); },
  async getUnread(userId)      { return request("GET",    `/notifications/unread/${userId}`,       null, true); },
  async getUnreadCount(userId) { return request("GET",    `/notifications/unreadCount/${userId}`,  null, true); },
  async markRead(notifId)      { return request("PUT",    `/notifications/markAsRead/${notifId}`,  null, true); },
  async markAllRead(userId)    { return request("PUT",    `/notifications/markAllRead/${userId}`,  null, true); },
  async delete(notifId)        { return request("DELETE", `/notifications/${notifId}`,             null, true); },
};