const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = path.resolve(__dirname, "..");
const CLIENT_DIR = path.join(ROOT_DIR, "client");
const ADMIN_DIR = path.join(ROOT_DIR, "admin");
const DEMO_DIR = path.join(ROOT_DIR, "demo");
const TASKS_FILE = process.env.TASKS_FILE || path.join(__dirname, "data", "tasks.json");
const USERS_FILE = process.env.USERS_FILE || path.join(__dirname, "data", "users.json");

const TOKEN_SECRET = String(process.env.AUTH_SECRET || "zhilinbianmin-demo-auth-secret");
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_PASSWORD = "123456";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const DEFAULT_USERS = [
  {
    id: "resident-1001",
    name: "Wang Ayi",
    community: "Haitang Community",
    phone: "13800001001"
  },
  {
    id: "resident-1002",
    name: "Li Shushu",
    community: "Lanting Community",
    phone: "13900001002"
  },
  {
    id: "resident-1003",
    name: "Zhang Nushi",
    community: "Guiyuan Community",
    phone: "13700001003"
  }
];

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end(text);
}

function isValidPhone(phone) {
  return /^1\d{10}$/.test(phone);
}

function toDigits(text) {
  return String(text || "").replace(/\D/g, "");
}

function derivePhoneByIdOrIndex(userId, index) {
  const suffix = toDigits(userId).slice(-4).padStart(4, "0");
  if (suffix !== "0000") return "1380000" + suffix;
  return "1380000" + String(index + 1).padStart(4, "0");
}

function maskPhone(phone) {
  if (!isValidPhone(phone)) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(7);
}

function base64urlEncode(data) {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlDecode(text) {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  return Buffer.from(base64 + "=".repeat(padLength), "base64").toString("utf8");
}

function signTokenPayload(encodedPayload) {
  return crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(encodedPayload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function generateToken(userId) {
  const payload = JSON.stringify({
    uid: userId,
    exp: Date.now() + TOKEN_TTL_MS
  });
  const encoded = base64urlEncode(payload);
  const signature = signTokenPayload(encoded);
  return encoded + "." + signature;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const encodedPayload = parts[0];
  const signature = parts[1];
  const expected = signTokenPayload(encodedPayload);

  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expected);
  if (sigA.length !== sigB.length) return null;
  if (!crypto.timingSafeEqual(sigA, sigB)) return null;

  try {
    const decoded = JSON.parse(base64urlDecode(encodedPayload));
    if (!decoded || typeof decoded !== "object") return null;
    if (!decoded.uid || !decoded.exp) return null;
    if (Date.now() > Number(decoded.exp)) return null;
    return decoded;
  } catch (_error) {
    return null;
  }
}

function createPasswordDigest(password) {
  const passwordSalt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.scryptSync(password, passwordSalt, 64).toString("hex");
  return { passwordSalt, passwordHash };
}

function verifyPassword(password, passwordSalt, passwordHash) {
  if (!password || !passwordSalt || !passwordHash) return false;
  const nextHash = crypto.scryptSync(password, passwordSalt, 64).toString("hex");
  const a = Buffer.from(nextHash, "hex");
  const b = Buffer.from(passwordHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isValidStatus(status) {
  return ["pending", "in_progress", "completed"].includes(status);
}

function isValidPriority(priority) {
  return ["low", "normal", "high", "urgent"].includes(priority);
}

function normalizeTaskInput(input) {
  return {
    userId: String(input.userId || "").trim(),
    title: String(input.title || "").trim(),
    detail: String(input.detail || "").trim(),
    category: String(input.category || "其他").trim(),
    priority: String(input.priority || "normal").trim(),
    status: String(input.status || "pending").trim()
  };
}

function toPublicUser(user, mask = false) {
  return {
    id: user.id,
    name: user.name,
    community: user.community || "",
    phone: mask ? maskPhone(user.phone) : user.phone
  };
}

async function readJsonFile(filePath, fallbackObject) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(fallbackObject, null, 2), "utf8");
      return fallbackObject;
    }
    throw error;
  }
}

async function writeUsers(users) {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify({ users }, null, 2), "utf8");
}

function generateUniqueUserId(users) {
  let id = "";
  do {
    id = "resident-" + String(Math.floor(Math.random() * 9000) + 1000);
  } while (users.some((item) => item.id === id));
  return id;
}

async function readUsers() {
  const parsed = await readJsonFile(USERS_FILE, { users: DEFAULT_USERS });
  const list = Array.isArray(parsed.users) ? parsed.users : [];
  const sourceUsers = list.length ? list : DEFAULT_USERS;
  const usedPhones = new Set();
  const normalized = [];
  let changed = !list.length;

  sourceUsers.forEach((user, index) => {
    const next = { ...(user || {}) };
    if (!next.id) {
      next.id = "resident-" + String(1000 + index);
      changed = true;
    }
    if (!next.name) {
      next.name = "居民用户" + (index + 1);
      changed = true;
    }
    if (!next.community) {
      next.community = "未设置社区";
      changed = true;
    }

    const rawPhone = toDigits(next.phone);
    next.phone = isValidPhone(rawPhone) ? rawPhone : derivePhoneByIdOrIndex(next.id, index);
    if (!isValidPhone(rawPhone)) {
      changed = true;
    }

    while (usedPhones.has(next.phone)) {
      const asNumber = Number(next.phone);
      next.phone = String(asNumber + 1);
      changed = true;
    }
    usedPhones.add(next.phone);

    if (!next.passwordSalt || !next.passwordHash) {
      const digest = createPasswordDigest(DEFAULT_PASSWORD);
      next.passwordSalt = digest.passwordSalt;
      next.passwordHash = digest.passwordHash;
      changed = true;
    }

    normalized.push(next);
  });

  if (changed) {
    await writeUsers(normalized);
  }

  return normalized;
}

async function writeTasks(tasks) {
  await fs.mkdir(path.dirname(TASKS_FILE), { recursive: true });
  await fs.writeFile(TASKS_FILE, JSON.stringify({ tasks }, null, 2), "utf8");
}

async function readTasks() {
  const users = await readUsers();
  const parsed = await readJsonFile(TASKS_FILE, { tasks: [] });
  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  const userMap = new Map(users.map((user) => [user.id, user]));
  const defaultUser = users[0];
  let changed = false;

  const normalized = tasks.map((task) => {
    const next = { ...(task || {}) };
    if (!next.id) {
      next.id = crypto.randomUUID();
      changed = true;
    }
    if (!next.userId || !userMap.has(next.userId)) {
      next.userId = defaultUser.id;
      changed = true;
    }

    const owner = userMap.get(next.userId) || defaultUser;
    if (!next.userName || next.userName !== owner.name) {
      next.userName = owner.name;
      changed = true;
    }
    if (!next.title) {
      next.title = "未命名任务";
      changed = true;
    }
    if (!next.category) {
      next.category = "其他";
      changed = true;
    }
    if (!next.priority || !isValidPriority(next.priority)) {
      next.priority = "normal";
      changed = true;
    }
    if (!next.status || !isValidStatus(next.status)) {
      next.status = "pending";
      changed = true;
    }
    if (!next.createdAt) {
      next.createdAt = new Date().toISOString();
      changed = true;
    }
    if (!next.updatedAt) {
      next.updatedAt = next.createdAt;
      changed = true;
    }
    if (typeof next.detail !== "string") {
      next.detail = "";
      changed = true;
    }
    return next;
  });

  if (changed) {
    await writeTasks(normalized);
  }
  return normalized;
}

function resolveSafePath(baseDir, requestPath) {
  const safeRelative = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const resolvedPath = path.join(baseDir, safeRelative);
  if (!resolvedPath.startsWith(baseDir)) {
    return null;
  }
  return resolvedPath;
}

async function serveFile(res, baseDir, relativePath) {
  const filePath = resolveSafePath(baseDir, relativePath);
  if (!filePath) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      sendText(res, 403, "Forbidden");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendText(res, 404, "Not Found");
      return;
    }
    sendText(res, 500, "Server Error");
  }
}

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (_error) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function getBearerToken(req) {
  const auth = String(req.headers.authorization || "");
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

async function requireAuthUser(req, res) {
  const token = getBearerToken(req);
  const payload = verifyToken(token);
  if (!payload) {
    sendJson(res, 401, { message: "Unauthorized" });
    return null;
  }
  const users = await readUsers();
  const user = users.find((item) => item.id === payload.uid);
  if (!user) {
    sendJson(res, 401, { message: "Unauthorized" });
    return null;
  }
  return user;
}

function applyTaskFilters(tasks, searchParams) {
  const status = String(searchParams.get("status") || "").trim();
  const priority = String(searchParams.get("priority") || "").trim();
  const userId = String(searchParams.get("userId") || "").trim();
  const keyword = String(searchParams.get("keyword") || "").trim().toLowerCase();

  let items = tasks.slice();
  if (status && isValidStatus(status)) {
    items = items.filter((task) => task.status === status);
  }
  if (priority && isValidPriority(priority)) {
    items = items.filter((task) => task.priority === priority);
  }
  if (userId) {
    items = items.filter((task) => task.userId === userId);
  }
  if (keyword) {
    items = items.filter((task) => {
      return (
        String(task.title).toLowerCase().includes(keyword) ||
        String(task.detail).toLowerCase().includes(keyword) ||
        String(task.category).toLowerCase().includes(keyword) ||
        String(task.userName).toLowerCase().includes(keyword) ||
        String(task.userId).toLowerCase().includes(keyword)
      );
    });
  }

  items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return items;
}

async function handleApi(req, res, pathname, searchParams) {
  const method = req.method || "GET";
  const taskPathMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  const taskStatusMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/status$/);
  const userTasksMatch = pathname.match(/^\/api\/users\/([^/]+)\/tasks$/);
  const myTaskMatch = pathname.match(/^\/api\/me\/tasks\/([^/]+)$/);

  if (pathname === "/api/health" && method === "GET") {
    sendJson(res, 200, { ok: true, time: new Date().toISOString() });
    return;
  }

  if (pathname === "/api/auth/register" && method === "POST") {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { message: error.message });
      return;
    }

    const phone = toDigits(body.phone);
    const password = String(body.password || "");
    const name = String(body.name || "").trim() || "新用户";
    const community = String(body.community || "").trim() || "未设置社区";

    if (!isValidPhone(phone)) {
      sendJson(res, 400, { message: "手机号格式不正确" });
      return;
    }
    if (password.length < 6) {
      sendJson(res, 400, { message: "密码长度至少 6 位" });
      return;
    }

    const users = await readUsers();
    if (users.some((item) => item.phone === phone)) {
      sendJson(res, 409, { message: "手机号已注册" });
      return;
    }

    const digest = createPasswordDigest(password);
    const newUser = {
      id: generateUniqueUserId(users),
      name: name.slice(0, 30),
      community: community.slice(0, 60),
      phone,
      passwordSalt: digest.passwordSalt,
      passwordHash: digest.passwordHash
    };

    users.push(newUser);
    await writeUsers(users);

    sendJson(res, 201, {
      token: generateToken(newUser.id),
      user: toPublicUser(newUser)
    });
    return;
  }

  if (pathname === "/api/auth/login" && method === "POST") {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { message: error.message });
      return;
    }

    const phone = toDigits(body.phone);
    const password = String(body.password || "");
    if (!isValidPhone(phone)) {
      sendJson(res, 400, { message: "手机号格式不正确" });
      return;
    }
    if (!password) {
      sendJson(res, 400, { message: "请输入密码" });
      return;
    }

    const users = await readUsers();
    const user = users.find((item) => item.phone === phone);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      sendJson(res, 401, { message: "手机号或密码错误" });
      return;
    }

    sendJson(res, 200, {
      token: generateToken(user.id),
      user: toPublicUser(user)
    });
    return;
  }

  if (pathname === "/api/auth/me" && method === "GET") {
    const user = await requireAuthUser(req, res);
    if (!user) return;
    sendJson(res, 200, { user: toPublicUser(user) });
    return;
  }

  if (pathname === "/api/auth/logout" && method === "POST") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/users" && method === "GET") {
    const users = await readUsers();
    sendJson(res, 200, { items: users.map((user) => toPublicUser(user, true)) });
    return;
  }

  if (userTasksMatch && method === "GET") {
    const userId = decodeURIComponent(userTasksMatch[1]);
    const users = await readUsers();
    if (!users.some((item) => item.id === userId)) {
      sendJson(res, 404, { message: "User not found" });
      return;
    }
    const tasks = await readTasks();
    const items = tasks
      .filter((task) => task.userId === userId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    sendJson(res, 200, { items });
    return;
  }

  if (pathname === "/api/me/tasks" && method === "GET") {
    const user = await requireAuthUser(req, res);
    if (!user) return;
    const tasks = await readTasks();
    const items = applyTaskFilters(tasks, searchParams).filter((task) => task.userId === user.id);
    sendJson(res, 200, { items });
    return;
  }

  if (pathname === "/api/me/tasks" && method === "POST") {
    const user = await requireAuthUser(req, res);
    if (!user) return;
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { message: error.message });
      return;
    }

    const input = normalizeTaskInput(body);
    if (!input.title) {
      sendJson(res, 400, { message: "title is required" });
      return;
    }
    if (!input.detail) {
      sendJson(res, 400, { message: "detail is required" });
      return;
    }
    if (!isValidPriority(input.priority)) {
      input.priority = "normal";
    }

    const now = new Date().toISOString();
    const newTask = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      title: input.title,
      detail: input.detail,
      category: input.category || "其他",
      priority: input.priority,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };

    const tasks = await readTasks();
    tasks.unshift(newTask);
    await writeTasks(tasks);
    sendJson(res, 201, newTask);
    return;
  }

  if (myTaskMatch && method === "DELETE") {
    const user = await requireAuthUser(req, res);
    if (!user) return;
    const taskId = decodeURIComponent(myTaskMatch[1]);
    const tasks = await readTasks();
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index < 0) {
      sendJson(res, 404, { message: "Task not found" });
      return;
    }
    if (tasks[index].userId !== user.id) {
      sendJson(res, 403, { message: "Forbidden" });
      return;
    }
    const [removed] = tasks.splice(index, 1);
    await writeTasks(tasks);
    sendJson(res, 200, { ok: true, removed });
    return;
  }

  if (pathname === "/api/tasks" && method === "GET") {
    const tasks = await readTasks();
    sendJson(res, 200, { items: applyTaskFilters(tasks, searchParams) });
    return;
  }

  if (pathname === "/api/tasks" && method === "POST") {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { message: error.message });
      return;
    }

    const users = await readUsers();
    const input = normalizeTaskInput(body);
    const owner = input.userId ? users.find((item) => item.id === input.userId) : users[0];

    if (!owner) {
      sendJson(res, 400, { message: "userId is required and must be valid" });
      return;
    }
    if (!input.title) {
      sendJson(res, 400, { message: "title is required" });
      return;
    }
    if (!input.detail) {
      sendJson(res, 400, { message: "detail is required" });
      return;
    }
    if (!isValidPriority(input.priority)) {
      input.priority = "normal";
    }
    if (!isValidStatus(input.status)) {
      input.status = "pending";
    }

    const now = new Date().toISOString();
    const newTask = {
      id: crypto.randomUUID(),
      userId: owner.id,
      userName: owner.name,
      title: input.title,
      detail: input.detail,
      category: input.category || "其他",
      priority: input.priority,
      status: input.status,
      createdAt: now,
      updatedAt: now
    };

    const tasks = await readTasks();
    tasks.unshift(newTask);
    await writeTasks(tasks);
    sendJson(res, 201, newTask);
    return;
  }

  if (taskPathMatch && method === "GET") {
    const taskId = decodeURIComponent(taskPathMatch[1]);
    const tasks = await readTasks();
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      sendJson(res, 404, { message: "Task not found" });
      return;
    }
    sendJson(res, 200, task);
    return;
  }

  if (taskPathMatch && (method === "PUT" || method === "PATCH")) {
    const taskId = decodeURIComponent(taskPathMatch[1]);
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { message: error.message });
      return;
    }

    const users = await readUsers();
    const tasks = await readTasks();
    const index = tasks.findIndex((item) => item.id === taskId);
    if (index < 0) {
      sendJson(res, 404, { message: "Task not found" });
      return;
    }

    const current = tasks[index];
    const input = normalizeTaskInput(body);
    const nextOwner = input.userId ? users.find((item) => item.id === input.userId) : users.find((item) => item.id === current.userId);
    if (!nextOwner) {
      sendJson(res, 400, { message: "Invalid userId" });
      return;
    }

    const nextTask = {
      ...current,
      userId: nextOwner.id,
      userName: nextOwner.name,
      title: input.title || current.title,
      detail: input.detail || current.detail,
      category: input.category || current.category,
      priority: isValidPriority(input.priority) ? input.priority : current.priority,
      status: isValidStatus(input.status) ? input.status : current.status,
      updatedAt: new Date().toISOString()
    };

    tasks[index] = nextTask;
    await writeTasks(tasks);
    sendJson(res, 200, nextTask);
    return;
  }

  if (taskStatusMatch && method === "PATCH") {
    const taskId = decodeURIComponent(taskStatusMatch[1]);
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { message: error.message });
      return;
    }

    const status = String(body.status || "").trim();
    if (!isValidStatus(status)) {
      sendJson(res, 400, { message: "Invalid status" });
      return;
    }

    const tasks = await readTasks();
    const index = tasks.findIndex((item) => item.id === taskId);
    if (index < 0) {
      sendJson(res, 404, { message: "Task not found" });
      return;
    }

    tasks[index] = {
      ...tasks[index],
      status,
      updatedAt: new Date().toISOString()
    };
    await writeTasks(tasks);
    sendJson(res, 200, tasks[index]);
    return;
  }

  if (taskPathMatch && method === "DELETE") {
    const taskId = decodeURIComponent(taskPathMatch[1]);
    const tasks = await readTasks();
    const index = tasks.findIndex((item) => item.id === taskId);
    if (index < 0) {
      sendJson(res, 404, { message: "Task not found" });
      return;
    }
    const [removed] = tasks.splice(index, 1);
    await writeTasks(tasks);
    sendJson(res, 200, { ok: true, removed });
    return;
  }

  sendJson(res, 404, { message: "API not found" });
}

async function requestHandler(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname, url.searchParams);
      return;
    }

    if (pathname === "/" || pathname === "/index.html") {
      await serveFile(res, CLIENT_DIR, "index.html");
      return;
    }

    if (pathname.startsWith("/assets/")) {
      const relativePath = pathname.replace(/^\/assets\//, "assets/");
      await serveFile(res, CLIENT_DIR, relativePath);
      return;
    }

    if (pathname === "/admin" || pathname === "/admin/") {
      await serveFile(res, ADMIN_DIR, "index.html");
      return;
    }

    if (pathname.startsWith("/admin/assets/")) {
      const relativePath = pathname.replace(/^\/admin\//, "");
      await serveFile(res, ADMIN_DIR, relativePath);
      return;
    }

    if (pathname === "/demo" || pathname === "/demo/" || pathname === "/demo/index.html") {
      await serveFile(res, DEMO_DIR, "index.html");
      return;
    }

    if (pathname.startsWith("/demo/")) {
      const relativePath = pathname.replace(/^\/demo\//, "");
      await serveFile(res, DEMO_DIR, relativePath);
      return;
    }

    sendText(res, 404, "Not Found");
  } catch (error) {
    sendJson(res, 500, { message: "Internal server error", detail: error.message });
  }
}

const server = http.createServer(requestHandler);

server.listen(PORT, () => {
  console.log(`Mock backend is running: http://localhost:${PORT}`);
  console.log(`Client page: http://localhost:${PORT}/`);
  console.log(`Admin page:  http://localhost:${PORT}/admin/`);
  console.log(`Demo page:   http://localhost:${PORT}/demo/`);
  console.log("Auth endpoints: /api/auth/register, /api/auth/login, /api/auth/me");
});
