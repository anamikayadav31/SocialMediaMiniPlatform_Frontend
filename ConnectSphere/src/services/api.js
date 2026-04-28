// All API calls go through the ApiGateway at localhost:5000
// Vite proxies /api → http://localhost:5000

const BASE_URL = "/api";

// ── Token helpers ──────────────────────────────────────────────────────

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

// ── Core fetch wrapper ─────────────────────────────────────────────────

async function request(method, path, body = null, auth = false) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);

  return data;
}

// ── Auth API → /api/users/* → AuthService :5050 ───────────────────────
// FIX: Was calling /api/auth/* — backend route is /api/users/*

export const authApi = {
  // POST /api/users/register
  async register(dto) {
    const data = await request("POST", "/users/register", dto);
    saveSession(data);
    return data;
  },

  // POST /api/users/login
  async login(dto) {
    const data = await request("POST", "/users/login", dto);
    saveSession(data);
    return data;
  },

  // Logout — just clears local session (no backend endpoint)
  // FIX: Removed /api/auth/logout call — endpoint doesn't exist in backend
  async logout() {
    clearSession();
  },

  // POST /api/users/validate-token
  async validateToken(token) {
    return request("POST", "/users/validate-token", { token });
  },
};

// ── User API → /api/users/* → AuthService :5050 ───────────────────────

export const userApi = {
  // GET /api/users/:id
  async getById(id) {
    return request("GET", `/users/${id}`, null, true);
  },

  // GET /api/users/by-username/:userName
  async getByUserName(userName) {
    return request("GET", `/users/by-username/${userName}`);
  },

  // PUT /api/users/:id/profile
  async updateProfile(id, dto) {
    return request("PUT", `/users/${id}/profile`, dto, true);
  },

  // PUT /api/users/:id/change-password
  async changePassword(id, dto) {
    return request("PUT", `/users/${id}/change-password`, dto, true);
  },

  // PUT /api/users/:id/toggle-privacy
  async togglePrivacy(id) {
    return request("PUT", `/users/${id}/toggle-privacy`, null, true);
  },

  // DELETE /api/users/:id/deactivate
  async deactivateAccount(id) {
    return request("DELETE", `/users/${id}/deactivate`, null, true);
  },

  // GET /api/users/search?q=...
  async search(q) {
    return request("GET", `/users/search?q=${encodeURIComponent(q)}`, null, true);
  },

  // GET /api/users/:id/suggested
  async getSuggested(id) {
    return request("GET", `/users/${id}/suggested`, null, true);
  },
};

// ── Post API → /api/posts/* → PostService :5100 ───────────────────────

export const postApi = {
  async getPublic(page = 1, pageSize = 10) {
    return request("GET", `/posts/public?page=${page}&pageSize=${pageSize}`);
  },

  async getTrending(hoursBack = 24, take = 20) {
    return request("GET", `/posts/trending?hoursBack=${hoursBack}&take=${take}`);
  },

  async search(q, page = 1) {
    return request("GET", `/posts/search?q=${encodeURIComponent(q)}&page=${page}`, null, true);
  },

  async getByUser(userId) {
    return request("GET", `/posts/user/${userId}`, null, true);
  },

  async getById(postId) {
    return request("GET", `/posts/${postId}`);
  },

  async create(dto) {
    return request("POST", "/posts", dto, true);
  },

  async update(postId, dto) {
    return request("PUT", `/posts/${postId}`, dto, true);
  },

  async delete(postId) {
    return request("DELETE", `/posts/${postId}`, null, true);
  },
};

// ── Like API → /api/likes/* → LikeService :5200 ───────────────────────

export const likeApi = {
  async toggle(userId, targetId) {
    return request("POST", "/likes/toggle", {
      userId,
      targetId,
      targetType: "POST",
    }, true);
  },

  async hasLiked(userId, targetId) {
    return request(
      "GET",
      `/likes/hasLiked?userId=${userId}&targetId=${targetId}&targetType=POST`,
      null,
      true
    );
  },

  async getCount(targetId) {
    return request("GET", `/likes/count?targetId=${targetId}&targetType=POST`);
  },

  async getLikedPosts(userId) {
    return request("GET", `/likes/likedPosts/${userId}`, null, true);
  },
};

// ── Comment API → /api/comments/* → CommentService :5300 ──────────────
// FIX: Was calling /api/posts/:id/comments — gateway route is /api/comments/*

export const commentApi = {
  // GET /api/comments/post/:postId
  async getByPost(postId) {
    
  },

  // POST /api/comments  (dto includes postId)
  async add(postId, dto) {
    return request("POST", "/comments", { ...dto, postId }, true);
  },

  // PUT /api/comments/:commentId
  async edit(commentId, content) {
    return request("PUT", `/comments/${commentId}`, { content }, true);
  },

  // DELETE /api/comments/:commentId
  async delete(commentId) {
    return request("DELETE", `/comments/${commentId}`, null, true);
  },
};

// ── Follow API → /api/follows/* → FollowService :5400 ─────────────────

export const followApi = {
  async follow(followerId, followingId) {
    return request("POST", `/follows/${followerId}/follow/${followingId}`, null, true);
  },

  async unfollow(followerId, followingId) {
    return request("DELETE", `/follows/${followerId}/unfollow/${followingId}`, null, true);
  },

  async getFollowers(userId) {
    return request("GET", `/follows/${userId}/followers`, null, true);
  },

  async getFollowing(userId) {
    return request("GET", `/follows/${userId}/following`, null, true);
  },

  async isFollowing(followerId, followingId) {
    return request("GET", `/follows/isFollowing?followerId=${followerId}&followingId=${followingId}`, null, true);
  },
};

// ── Feed API → /api/feed/* → FeedService :5600 ────────────────────────

export const feedApi = {
  async getForUser(userId, page = 1, pageSize = 10) {
    return request("GET", `/feed/${userId}?page=${page}&pageSize=${pageSize}`, null, true);
  },

  async getExplore(userId) {
    return request("GET", `/feed/explore/${userId}`, null, true);
  },

  async getTrending() {
    return request("GET", "/feed/trending", null, true);
  },

  async getSuggested(userId) {
    return request("GET", `/feed/suggested/${userId}`, null, true);
  },
};

// ── Notification API → /api/notifications/* → NotifService :5500 ──────

export const notifApi = {
  async getAll(userId) {
    return request("GET", `/notifications/${userId}`, null, true);
  },

  async markRead(notificationId) {
    return request("POST", `/notifications/${notificationId}/read`, null, true);
  },
};