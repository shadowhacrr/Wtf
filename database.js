// ═══════════════════════════════════════════════════════════
// 💾 JSON DATABASE MANAGER
// ═══════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const FILES = {
  USERS: path.join(DATA_DIR, "users.json"),
  PROJECTS: path.join(DATA_DIR, "projects.json"),
  STATS: path.join(DATA_DIR, "stats.json"),
  SETTINGS: path.join(DATA_DIR, "settings.json"),
  PENDING: path.join(DATA_DIR, "pending.json")
};

// Initialize files if they don't exist
Object.values(FILES).forEach((filePath) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
});

// Generic read
function readData(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}

// Generic write
function writeData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ═══════════════════════════════════════════════════════════
// 👤 USERS
// ═══════════════════════════════════════════════════════════

function getAllUsers() {
  return readData(FILES.USERS);
}

function getUser(userId) {
  const users = getAllUsers();
  return users.find((u) => u.user_id === userId) || null;
}

function saveUser(user) {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.user_id === user.user_id);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...user };
  } else {
    users.push(user);
  }
  writeData(FILES.USERS, users);
  return user;
}

function updateUser(userId, updates) {
  const user = getUser(userId);
  if (!user) return null;
  const updated = { ...user, ...updates };
  saveUser(updated);
  return updated;
}

function getOrCreateUser(userId, username = "", firstName = "", lastName = "") {
  let user = getUser(userId);
  if (!user) {
    const { CONFIG } = require("./config");
    user = {
      user_id: userId,
      username: username || "",
      first_name: firstName || "",
      last_name: lastName || "",
      joined_at: new Date().toISOString(),
      verified: false,
      daily_limit_reactions: CONFIG.DEFAULT_DAILY_LIMIT.REACTIONS,
      daily_limit_views: CONFIG.DEFAULT_DAILY_LIMIT.VIEWS,
      used_today_reactions: 0,
      used_today_views: 0,
      last_reset_date: new Date().toDateString(),
      credits: 0,
      total_projects: 0,
      total_reactions_sent: 0,
      total_views_sent: 0,
      is_owner: userId === CONFIG.OWNER_ID,
      is_banned: false
    };
    saveUser(user);
  }
  return user;
}

// Reset daily limits if date changed
function checkAndResetDailyLimits(userId) {
  const user = getUser(userId);
  if (!user) return null;
  const today = new Date().toDateString();
  if (user.last_reset_date !== today) {
    user.used_today_reactions = 0;
    user.used_today_views = 0;
    user.last_reset_date = today;
    saveUser(user);
  }
  return user;
}

function incrementUsage(userId, type, amount = 1) {
  const user = getUser(userId);
  if (!user) return null;
  if (type === "reactions") {
    user.used_today_reactions += amount;
    user.total_reactions_sent += amount;
  } else if (type === "views") {
    user.used_today_views += amount;
    user.total_views_sent += amount;
  }
  saveUser(user);
  return user;
}

// ═══════════════════════════════════════════════════════════
// 📁 PROJECTS
// ═══════════════════════════════════════════════════════════

function getAllProjects() {
  return readData(FILES.PROJECTS);
}

function getProject(projectId) {
  const projects = getAllProjects();
  return projects.find((p) => p.project_id === projectId) || null;
}

function getUserProjects(userId) {
  return getAllProjects().filter((p) => p.user_id === userId);
}

function getProjectByChatId(chatId) {
  return getAllProjects().filter((p) => p.target_chat_id === chatId && p.active);
}

function saveProject(project) {
  const projects = getAllProjects();
  const idx = projects.findIndex((p) => p.project_id === project.project_id);
  if (idx >= 0) {
    projects[idx] = { ...projects[idx], ...project };
  } else {
    projects.push(project);
  }
  writeData(FILES.PROJECTS, projects);
  return project;
}

function deleteProject(projectId) {
  let projects = getAllProjects();
  projects = projects.filter((p) => p.project_id !== projectId);
  writeData(FILES.PROJECTS, projects);
}

function generateProjectId() {
  return "proj_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

// ═══════════════════════════════════════════════════════════
// 📊 STATS
// ═══════════════════════════════════════════════════════════

function addStat(record) {
  const stats = readData(FILES.STATS);
  stats.push(record);
  writeData(FILES.STATS, stats);
}

function getProjectStats(projectId) {
  return readData(FILES.STATS).filter((s) => s.project_id === projectId);
}

function getUserStats(userId) {
  return readData(FILES.STATS).filter((s) => s.user_id === userId);
}

function getTodayStats() {
  const today = new Date().toDateString();
  return readData(FILES.STATS).filter((s) => {
    const d = new Date(s.timestamp);
    return d.toDateString() === today;
  });
}

// ═══════════════════════════════════════════════════════════
// ⏳ PENDING ACTIONS (for multi-step flows)
// ═══════════════════════════════════════════════════════════

function setPending(userId, data) {
  const pending = readData(FILES.PENDING);
  const idx = pending.findIndex((p) => p.user_id === userId);
  if (idx >= 0) {
    pending[idx] = { user_id: userId, ...data };
  } else {
    pending.push({ user_id: userId, ...data });
  }
  writeData(FILES.PENDING, pending);
}

function getPending(userId) {
  const pending = readData(FILES.PENDING);
  return pending.find((p) => p.user_id === userId) || null;
}

function clearPending(userId) {
  let pending = readData(FILES.PENDING);
  pending = pending.filter((p) => p.user_id !== userId);
  writeData(FILES.PENDING, pending);
}

module.exports = {
  getAllUsers,
  getUser,
  saveUser,
  updateUser,
  getOrCreateUser,
  checkAndResetDailyLimits,
  incrementUsage,
  getAllProjects,
  getProject,
  getUserProjects,
  getProjectByChatId,
  saveProject,
  deleteProject,
  generateProjectId,
  addStat,
  getProjectStats,
  getUserStats,
  getTodayStats,
  setPending,
  getPending,
  clearPending,
  readData,
  writeData,
  FILES
};
