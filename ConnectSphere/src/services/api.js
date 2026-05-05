const BASE_URL = "/api";

export const getToken = () => localStorage.getItem("token");
export const getUser  = () => JSON.parse(localStorage.getItem("user") || "null");

function saveSession(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify({
    userId: data.userId, userName: data.userName,
    fullName: data.fullName, role: data.role,
  }));
}
export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

async function request(method, path, body = null, auth = false) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// ── Auth ────────────────────────────────────────────────────────
export const authApi = {
  async register(dto) { const d = await request("POST", "/users/register", dto); saveSession(d); return d; },
  async login(dto)    { const d = await request("POST", "/users/login", dto);    saveSession(d); return d; },
  async googleLogin(accessToken) {
    // Backend GoogleTokenDto has { IdToken } — we send access_token here
    // Backend VerifyWithGoogle() tries userinfo endpoint first (access_token)
    // then falls back to tokeninfo (id_token) — so field name "idToken" is fine
    const d = await request("POST", "/users/google/verify", { idToken: accessToken });
    saveSession(d);
    return d;
  },
  async logout()      { clearSession(); },
};

// ── Users ───────────────────────────────────────────────────────
export const userApi = {
  async getById(id)            { return request("GET", `/users/${id}`, null, true); },
  // Silent check — 404 pe null return karo, console error nahi
  async exists(id) {
    try {
      const res = await fetch(`${BASE_URL}/users/${id}`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      return res.ok;
    } catch { return false; }
  },
  async getByUserName(u)       { return request("GET", `/users/by-username/${u}`); },
  async updateProfile(id, dto) { return request("PUT", `/users/${id}/profile`, dto, true); },
  async changePassword(id,dto) { return request("PUT", `/users/${id}/change-password`, dto, true); },
  async togglePrivacy(id)      { return request("PUT", `/users/${id}/toggle-privacy`, null, true); },
  async search(q)              { return request("GET", `/users/search?q=${encodeURIComponent(q)}`, null, true); },
  // Admin functions
  async getAllUsers()           { return request("GET", `/users/admin/all`, null, true); },
  async suspendUser(id)        { return request("PUT", `/users/admin/suspend/${id}`, null, true); },
  async activateUser(id)       { return request("PUT", `/users/admin/activate/${id}`, null, true); },
  async adminDeleteUser(id)    { return request("DELETE", `/users/admin/delete/${id}`, null, true); },
};

// ── Posts ───────────────────────────────────────────────────────
// FIX: MediaType & Visibility are C# enums with JsonStringEnumConverter
// Send them as strings — PostService has JsonStringEnumConverter so "NONE","PUBLIC" work
export const postApi = {
  async getPublic(page=1,sz=20) { return request("GET", `/posts/public?page=${page}&pageSize=${sz}`); },
  async getTrending(h=48,t=30)  { return request("GET", `/posts/trending?hoursBack=${h}&take=${t}`); },
  async search(q, page=1)       { return request("GET", `/posts/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=20`, null, true); },
  async getByUser(userId)       { return request("GET", `/posts/user/${userId}`, null, true); },
  async create(dto) {
    // Ensure content is not empty — this causes 400
    if (!dto.content?.trim()) throw new Error("Post content cannot be empty");
    return request("POST", "/posts", {
      userId:     dto.userId,
      content:    dto.content.trim(),
      mediaUrl:   dto.mediaUrl   || null,
      mediaType:  dto.mediaType  || "NONE",   // string enum
      hashtags:   dto.hashtags   || "",
      visibility: dto.visibility || "PUBLIC", // string enum
    }, true);
  },
  async delete(postId) { return request("DELETE", `/posts/${postId}`, null, true); },
};

// ── Likes ───────────────────────────────────────────────────────
// FIX: TargetType is C# enum — LikeService has JsonStringEnumConverter
// BUT YARP gateway strips/modifies body sometimes — send numeric value (0=POST) to be safe
// TargetType enum: POST=0, COMMENT=1
export const likeApi = {
  async toggle(userId, targetId, ownerId = null) {
    const result = await request("POST", "/likes/toggle", {
      userId:     Number(userId),
      targetId:   Number(targetId),
      targetType: "POST",
      ownerId:    ownerId ? Number(ownerId) : null,
    }, true);
    // Backend returns { liked, likeCount } — normalize casing
    return {
      liked:     result?.liked     ?? result?.Liked,
      likeCount: result?.likeCount ?? result?.LikeCount,
    };
  },
  async hasLiked(userId, targetId) {
    const d = await request("GET",
      `/likes/hasLiked?userId=${userId}&targetId=${targetId}&targetType=POST`,
      null, true);
    return { hasLiked: d?.liked ?? false };
  },
  async getLikeCount(targetId) {
    // GET /api/likes/count?targetId=5&targetType=POST
    // Gateway ke "like-count" public route pe bhejo — auth optional
    try {
      const d = await request("GET",
        `/likes/count?targetId=${targetId}&targetType=POST`,
        null, true);  // true = token bhejna (agar available) — gateway public route allow karega
      return { count: d?.count ?? 0 };
    } catch {
      return { count: 0 };
    }
  },
};

// ── Comments ────────────────────────────────────────────────────
// Routes: GET /api/comments/byPost/{postId}   POST /api/comments
// AddCommentDto: { postId, userId, content, parentCommentId? }
export const commentApi = {
  async getByPost(postId) {
    return request("GET", `/comments/byPost/${postId}`, null, true);
  },
  async add(postId, dto) {
    const body = {
      postId:          Number(postId),
      userId:          Number(dto.userId),
      content:         String(dto.content).trim(),
      parentCommentId: dto.parentCommentId ? Number(dto.parentCommentId) : null,
    };
    if (!body.content) throw new Error("Comment cannot be empty");
    if (!body.userId)  throw new Error("Not logged in");
    return request("POST", "/comments", body, true);
  },
  async edit(commentId, content) { return request("PUT",    `/comments/${commentId}`, { content }, true); },
  async delete(commentId)        { return request("DELETE", `/comments/${commentId}`, null, true); },
};

// ── Follows ─────────────────────────────────────────────────────
// POST /api/follows body: { followerId, followeeId }
// DELETE /api/follows/unfollow body: { followerId, followeeId }
export const followApi = {
  async follow(followerId, followeeId) {
    return request("POST", "/follows",
      { followerId: Number(followerId), followeeId: Number(followeeId) }, true);
  },
  async unfollow(followerId, followeeId) {
    return request("DELETE", "/follows/unfollow",
      { followerId: Number(followerId), followeeId: Number(followeeId) }, true);
  },
  async accept(followId)  { return request("PUT",  `/follows/accept/${followId}`,  null, true); },
  async reject(followId)  { return request("PUT",  `/follows/reject/${followId}`,  null, true); },
  async getPending(userId){ return request("GET",  `/follows/pending/${userId}`,   null, true); },
  async getFollowers(userId)  { return request("GET", `/follows/followers/${userId}`,  null, true); },
  async getFollowing(userId)  { return request("GET", `/follows/following/${userId}`,  null, true); },
  async isFollowing(followerId, followeeId) {
    const d = await request("GET",
      `/follows/isFollowing?followerId=${followerId}&followeeId=${followeeId}`, null, true);
    return { isFollowing: d?.isFollowing ?? false };
  },
  async getFollowerCount(userId) {
    const d = await request("GET", `/follows/followerCount/${userId}`, null, true);
    return { followerCount: d?.followerCount ?? 0 };
  },
  async getFollowingCount(userId) {
    const d = await request("GET", `/follows/followingCount/${userId}`, null, true);
    return { followingCount: d?.followingCount ?? 0 };
  },
};

// ── Feed ────────────────────────────────────────────────────────
export const feedApi = {
  async getForUser(userId, page=1, sz=20) {
    return request("GET", `/feed/${userId}?page=${page}&pageSize=${sz}`, null, true);
  },
};

// ── Notifications ───────────────────────────────────────────────
// Backend routes:
//   GET  /api/notifications/byRecipient/{recipientId}
//   GET  /api/notifications/unread/{recipientId}
//   GET  /api/notifications/unreadCount/{recipientId}
//   PUT  /api/notifications/markAsRead/{notifId}
//   PUT  /api/notifications/markAllRead/{recipientId}
//   DELETE /api/notifications/{notifId}
export const notifApi = {
  async getAll(userId)        { return request("GET",    `/notifications/byRecipient/${userId}`,  null, true); },
  async getUnread(userId)     { return request("GET",    `/notifications/unread/${userId}`,        null, true); },
  async getUnreadCount(userId){ return request("GET",    `/notifications/unreadCount/${userId}`,   null, true); },
  async markRead(notifId)     { return request("PUT",    `/notifications/markAsRead/${notifId}`,   null, true); },
  async markAllRead(userId)   { return request("PUT",    `/notifications/markAllRead/${userId}`,   null, true); },
  async delete(notifId)       { return request("DELETE", `/notifications/${notifId}`,              null, true); },
};