/**
 * api.js – unit tests
 * All fetch calls are mocked so no real network is needed.
 */

// ── localStorage mock ────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((k) => store[k] ?? null),
    setItem: jest.fn((k, v) => { store[k] = String(v); }),
    removeItem: jest.fn((k) => { delete store[k]; }),
    clear: jest.fn(() => { store = {}; }),
    _store: () => store,
  };
})();
Object.defineProperty(global, "localStorage", { value: localStorageMock });

const BASE_URL = "http://localhost:5000/api";

function mockFetch(body, { status = 200 } = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

// ── imports (after mocks are in place) ───────────────────────────────────────
import {
  getToken, getUser, clearSession,
  authApi, userApi, postApi, likeApi,
  commentApi, followApi, feedApi, notifApi,
} from "../services/api.js";

// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// Helper selectors
// ══════════════════════════════════════════════════════════════════════════════
describe("Session helpers", () => {
  test("getToken returns null when nothing is stored", () => {
    expect(getToken()).toBeNull();
  });

  test("getUser returns null when nothing is stored", () => {
    expect(getUser()).toBeNull();
  });

  test("clearSession removes token and user from localStorage", () => {
    localStorageMock.setItem("token", "tok123");
    localStorageMock.setItem("user", JSON.stringify({ userId: 1 }));
    clearSession();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("token");
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("user");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Auth API
// ══════════════════════════════════════════════════════════════════════════════
describe("authApi", () => {
  const fakeUser = {
    token: "tok-abc",
    userId: 7, userName: "alice", fullName: "Alice Wonder", role: "User",
  };

  test("login calls POST /users/login and saves session", async () => {
    mockFetch(fakeUser);
    const result = await authApi.login({ email: "a@b.com", password: "pass" });

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/users/login`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.token).toBe("tok-abc");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("token", "tok-abc");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "user",
      JSON.stringify({ userId: 7, userName: "alice", fullName: "Alice Wonder", role: "User" }),
    );
  });

  test("register calls POST /users/register and saves session", async () => {
    mockFetch(fakeUser);
    await authApi.register({ email: "a@b.com", password: "pass", userName: "alice" });
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/users/register`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith("token", "tok-abc");
  });

  test("googleLogin calls POST /users/google/verify", async () => {
    mockFetch(fakeUser);
    await authApi.googleLogin("google-id-token");
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/users/google/verify`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("logout clears session without a network call", async () => {
    localStorageMock.setItem("token", "tok");
    await authApi.logout();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("token");
    expect(fetch).not.toHaveBeenCalled();
  });

  test("login throws on non-ok response", async () => {
    mockFetch({ message: "Invalid credentials" }, { status: 401 });
    await expect(authApi.login({ email: "x@x.com", password: "bad" }))
      .rejects.toThrow("Invalid credentials");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// User API
// ══════════════════════════════════════════════════════════════════════════════
describe("userApi", () => {
  test("getById calls GET /users/:id with auth", async () => {
    mockFetch({ userId: 5, userName: "bob" });
    localStorageMock.getItem.mockReturnValue("tok");
    await userApi.getById(5);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/users/5`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      }),
    );
  });

  test("search calls GET /users/search with encoded query", async () => {
    mockFetch([]);
    localStorageMock.getItem.mockReturnValue("tok");
    await userApi.search("hello world");
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/users/search?q=hello%20world`,
      expect.anything(),
    );
  });

  test("exists returns true on 200 response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    localStorageMock.getItem.mockReturnValue("tok");
    const result = await userApi.exists(3);
    expect(result).toBe(true);
  });

  test("exists returns false on network error", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
    const result = await userApi.exists(3);
    expect(result).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Post API
// ══════════════════════════════════════════════════════════════════════════════
describe("postApi", () => {
  test("create throws when content is empty", async () => {
    await expect(postApi.create({ userId: 1, content: "   " }))
      .rejects.toThrow("Post content cannot be empty");
    expect(fetch).not.toHaveBeenCalled();
  });

  test("create sends correct body with default enum strings", async () => {
    mockFetch({ postId: 10 });
    localStorageMock.getItem.mockReturnValue("tok");
    await postApi.create({ userId: 1, content: "Hello!", hashtags: "#test" });

    const [, options] = fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.content).toBe("Hello!");
    expect(body.mediaType).toBe("NONE");
    expect(body.visibility).toBe("PUBLIC");
    expect(body.hashtags).toBe("#test");
  });

  test("getPublic calls correct URL with pagination", async () => {
    mockFetch([]);
    await postApi.getPublic(2, 10);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/posts/public?page=2&pageSize=10`,
      expect.anything(),
    );
  });

  test("search encodes the query in URL", async () => {
    mockFetch([]);
    localStorageMock.getItem.mockReturnValue("tok");
    await postApi.search("cats & dogs");
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/posts/search?q=cats%20%26%20dogs&page=1&pageSize=20`,
      expect.anything(),
    );
  });

  test("delete calls DELETE /posts/:id", async () => {
    mockFetch(null, { status: 204 });
    localStorageMock.getItem.mockReturnValue("tok");
    await postApi.delete(42);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/posts/42`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Like API
// ══════════════════════════════════════════════════════════════════════════════
describe("likeApi", () => {
  test("toggle normalises camelCase response", async () => {
    mockFetch({ liked: true, likeCount: 5 });
    localStorageMock.getItem.mockReturnValue("tok");
    const r = await likeApi.toggle(1, 10, 2);
    expect(r.liked).toBe(true);
    expect(r.likeCount).toBe(5);
  });

  test("toggle normalises PascalCase response from backend", async () => {
    mockFetch({ Liked: false, LikeCount: 3 });
    localStorageMock.getItem.mockReturnValue("tok");
    const r = await likeApi.toggle(1, 10);
    expect(r.liked).toBe(false);
    expect(r.likeCount).toBe(3);
  });

  test("getLikeCount returns 0 on error (silent fail)", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network"));
    const r = await likeApi.getLikeCount(99);
    expect(r.count).toBe(0);
  });

  test("hasLiked returns false when liked field is missing", async () => {
    mockFetch({});
    localStorageMock.getItem.mockReturnValue("tok");
    const r = await likeApi.hasLiked(1, 10);
    expect(r.hasLiked).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Comment API
// ══════════════════════════════════════════════════════════════════════════════
describe("commentApi", () => {
  test("add throws when content is empty", async () => {
    await expect(commentApi.add(1, { userId: 2, content: "  " }))
      .rejects.toThrow("Comment cannot be empty");
  });

  test("add throws when userId is missing", async () => {
    await expect(commentApi.add(1, { userId: 0, content: "hi" }))
      .rejects.toThrow("Not logged in");
  });

  test("add sends correct body with parentCommentId null by default", async () => {
    mockFetch({ commentId: 55 });
    localStorageMock.getItem.mockReturnValue("tok");
    await commentApi.add(10, { userId: 3, content: "Nice post!" });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.postId).toBe(10);
    expect(body.userId).toBe(3);
    expect(body.content).toBe("Nice post!");
    expect(body.parentCommentId).toBeNull();
  });

  test("edit calls PUT /comments/:id", async () => {
    mockFetch({ commentId: 5 });
    localStorageMock.getItem.mockReturnValue("tok");
    await commentApi.edit(5, "Updated!");
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/comments/5`,
      expect.objectContaining({ method: "PUT" }),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Follow API
// ══════════════════════════════════════════════════════════════════════════════
describe("followApi", () => {
  test("follow calls POST /follows with correct body", async () => {
    mockFetch({});
    localStorageMock.getItem.mockReturnValue("tok");
    await followApi.follow(1, 2);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toEqual({ followerId: 1, followeeId: 2 });
  });

  test("unfollow calls DELETE /follows/unfollow", async () => {
    mockFetch({});
    localStorageMock.getItem.mockReturnValue("tok");
    await followApi.unfollow(1, 2);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/follows/unfollow`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  test("isFollowing defaults to false when field missing", async () => {
    mockFetch({});
    localStorageMock.getItem.mockReturnValue("tok");
    const r = await followApi.isFollowing(1, 2);
    expect(r.isFollowing).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Feed API
// ══════════════════════════════════════════════════════════════════════════════
describe("feedApi", () => {
  test("getForUser builds correct URL with page params", async () => {
    mockFetch([]);
    localStorageMock.getItem.mockReturnValue("tok");
    await feedApi.getForUser(7, 3, 15);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/feed/7?page=3&pageSize=15`,
      expect.anything(),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Notifications API
// ══════════════════════════════════════════════════════════════════════════════
describe("notifApi", () => {
  test("getAll calls GET /notifications/byRecipient/:id", async () => {
    mockFetch([]);
    localStorageMock.getItem.mockReturnValue("tok");
    await notifApi.getAll(9);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/notifications/byRecipient/9`,
      expect.anything(),
    );
  });

  test("markAllRead calls PUT /notifications/markAllRead/:id", async () => {
    mockFetch(null, { status: 204 });
    localStorageMock.getItem.mockReturnValue("tok");
    await notifApi.markAllRead(9);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/notifications/markAllRead/9`,
      expect.objectContaining({ method: "PUT" }),
    );
  });

  test("delete calls DELETE /notifications/:id", async () => {
    mockFetch(null, { status: 204 });
    localStorageMock.getItem.mockReturnValue("tok");
    await notifApi.delete(42);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/notifications/42`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
