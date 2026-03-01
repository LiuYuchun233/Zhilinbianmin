const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = path.resolve(__dirname, "..");
const CLIENT_DIR = path.join(ROOT_DIR, "客户端");
const ADMIN_DIR = path.join(ROOT_DIR, "admin");
const DEMO_DIR = path.join(ROOT_DIR, "demo");
const TASKS_FILE = path.join(__dirname, "data", "tasks.json");
const USERS_FILE = path.join(__dirname, "data", "users.json");

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
  { id: "resident-1001", name: "王阿姨", community: "海棠社区", phone: "138****1001" },
  { id: "resident-1002", name: "李叔叔", community: "兰亭社区", phone: "139****1022" },
  { id: "resident-1003", name: "张女士", community: "桂园社区", phone: "137****1033" }
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

async function readUsers() {
  const parsed = await readJsonFile(USERS_FILE, { users: DEFAULT_USERS });
  const users = Array.isArray(parsed.users) ? parsed.users : [];
  if (!users.length) {
    await writeUsers(DEFAULT_USERS);
    return DEFAULT_USERS;
  }
  return users;
}

async function writeUsers(users) {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify({ users }, null, 2), "utf8");
}

async function readTasks() {
  const users = await readUsers();
  const parsed = await readJsonFile(TASKS_FILE, { tasks: [] });
  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  const userMap = new Map(users.map((user) => [user.id, user]));
  const defaultUser = users[0];

  let changed = false;
  const normalized = tasks.map((task) => {
    const next = { ...task };
    if (!next.id) {
      next.id = randomUUID();
      changed = true;
    }
    if (!next.userId || !userMap.has(next.userId)) {
      next.userId = defaultUser.id;
      changed = true;
    }
    if (!next.userName) {
      next.userName = (userMap.get(next.userId) || defaultUser).name;
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

async function writeTasks(tasks) {
  await fs.mkdir(path.dirname(TASKS_FILE), { recursive: true });
  await fs.writeFile(TASKS_FILE, JSON.stringify({ tasks }, null, 2), "utf8");
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

function getUserById(users, userId) {
  return users.find((item) => item.id === userId) || null;
}

async function handleApi(req, res, pathname, searchParams) {
  const method = req.method || "GET";
  const taskPathMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  const taskStatusMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/status$/);
  const userTasksMatch = pathname.match(/^\/api\/users\/([^/]+)\/tasks$/);

  if (pathname === "/api/health" && method === "GET") {
    sendJson(res, 200, { ok: true, time: new Date().toISOString() });
    return;
  }

  if (pathname === "/api/users" && method === "GET") {
    const users = await readUsers();
    sendJson(res, 200, { items: users });
    return;
  }

  if (userTasksMatch && method === "GET") {
    const userId = decodeURIComponent(userTasksMatch[1]);
    const users = await readUsers();
    if (!getUserById(users, userId)) {
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

  if (pathname === "/api/tasks" && method === "GET") {
    const status = String(searchParams.get("status") || "").trim();
    const priority = String(searchParams.get("priority") || "").trim();
    const userId = String(searchParams.get("userId") || "").trim();
    const keyword = String(searchParams.get("keyword") || "").trim().toLowerCase();
    let items = await readTasks();

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
          task.title.toLowerCase().includes(keyword) ||
          task.detail.toLowerCase().includes(keyword) ||
          task.category.toLowerCase().includes(keyword) ||
          task.userName.toLowerCase().includes(keyword) ||
          task.userId.toLowerCase().includes(keyword)
        );
      });
    }

    items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    sendJson(res, 200, { items });
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
    const owner = input.userId ? getUserById(users, input.userId) : users[0];

    if (!owner) {
      sendJson(res, 400, { message: "userId is required and must be valid" });
      return;
    }
    if (!input.title) {
      sendJson(res, 400, { message: "title is required" });
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
      id: randomUUID(),
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
    const nextOwner = input.userId ? getUserById(users, input.userId) : getUserById(users, current.userId);
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

    if (pathname.startsWith("/demo/")) {
      const relativePath = pathname.replace(/^\/demo\//, "");
      await serveFile(res, DEMO_DIR, relativePath || "index.html");
      return;
    }

    if (pathname === "/demo" || pathname === "/demo/index.html") {
      await serveFile(res, DEMO_DIR, "index.html");
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
});
