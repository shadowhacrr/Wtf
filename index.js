// ═══════════════════════════════════════════════════════════
// 🤖 TELEGRAM AUTO REACTION + VIEWS BOT
// ═══════════════════════════════════════════════════════════

const TelegramBot = require("node-telegram-bot-api");
const { CONFIG } = require("./config");
const DB = require("./database");
const MSG = require("./utils/messages");
const KB = require("./utils/keyboards");

// Import readData for owner stats
const { readData, FILES } = require("./database");

// ═══════════════════════════════════════════════════════════
// 🔧 INIT BOT (POLLING MODE - NO WEBHOOK)
// ═══════════════════════════════════════════════════════════
const bot = new TelegramBot(CONFIG.BOT_TOKEN, {
  polling: {
    interval: CONFIG.POLLING_INTERVAL,
    autoStart: true,
    params: { timeout: 10 }
  }
});

console.log("🤖 Bot started in POLLING mode (no webhook)");
console.log("✅ Ready to receive messages...");

// ═══════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function isUserMember(chatId, userId) {
  try {
    const member = await bot.getChatMember(chatId, userId);
    const status = member.status;
    return ["member", "administrator", "creator"].includes(status);
  } catch (err) {
    console.error("Membership check error:", err.message);
    return false;
  }
}

async function isBotAdmin(chatId) {
  try {
    const botId = (await bot.getMe()).id;
    const member = await bot.getChatMember(chatId, botId);
    return ["administrator", "creator"].includes(member.status);
  } catch (err) {
    console.error("Admin check error:", err.message);
    return false;
  }
}

function extractChatId(link) {
  // Public: https://t.me/channelname → @channelname
  if (link.includes("t.me/")) {
    const parts = link.split("t.me/");
    if (parts[1]) {
      const username = parts[1].split("/")[0].split("?")[0];
      if (username && !username.startsWith("+")) {
        return "@" + username;
      }
    }
  }
  return link;
}

async function resolveChatId(link) {
  const extracted = extractChatId(link);
  if (extracted.startsWith("@")) {
    try {
      const chat = await bot.getChat(extracted);
      return chat.id;
    } catch {
      return null;
    }
  }
  // For invite links, we can't resolve without being a member
  return null;
}

function canSendReactions(user, amount) {
  if (user.is_owner && CONFIG.OWNER_UNLIMITED) return true;
  DB.checkAndResetDailyLimits(user.user_id);
  const updated = DB.getUser(user.user_id);
  return updated.daily_limit_reactions - updated.used_today_reactions >= amount;
}

function canSendViews(user, amount) {
  if (user.is_owner && CONFIG.OWNER_UNLIMITED) return true;
  DB.checkAndResetDailyLimits(user.user_id);
  const updated = DB.getUser(user.user_id);
  return updated.daily_limit_views - updated.used_today_views >= amount;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════════
// 🎯 VERIFICATION FLOW
// ═══════════════════════════════════════════════════════════

async function handleVerification(chatId, userId, messageId = null) {
  const user = DB.getOrCreateUser(userId);
  
  if (user.verified) {
    await sendMainMenu(chatId, userId);
    return;
  }
  
  const text = MSG.welcomeMessage(user.first_name || "User") + "\n" + MSG.verifyMessage();
  const keyboard = KB.verificationKeyboard();
  
  if (messageId) {
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch {
      await bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: keyboard }
    });
  }
}

async function processVerifyCallback(chatId, userId, messageId) {
  const mj = CONFIG.MANDATORY_JOIN;
  const failed = [];
  
  // Check Telegram Channel
  const inChannel = await isUserMember(mj.TELEGRAM_CHANNEL.CHAT_ID, userId);
  if (!inChannel) failed.push(mj.TELEGRAM_CHANNEL.NAME || "Telegram Channel");
  
  // Check Telegram Group
  const inGroup = await isUserMember(mj.TELEGRAM_GROUP.CHAT_ID, userId);
  if (!inGroup) failed.push(mj.TELEGRAM_GROUP.NAME || "Telegram Group");
  
  if (failed.length > 0) {
    const text = MSG.notMemberMessage(failed);
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: KB.verificationKeyboard() }
    });
    return;
  }
  
  // Verified!
  const user = DB.updateUser(userId, { verified: true });
  
  await bot.editMessageText(
    `${MSG.ICONS.check} <b>VERIFICATION SUCCESSFUL!</b>\n\nWelcome! You can now use the bot.`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: `${MSG.ICONS.rocket} CONTINUE`, callback_data: "main_menu" }]] }
    }
  );
}

// ═══════════════════════════════════════════════════════════
// 🏠 MAIN MENU
// ═══════════════════════════════════════════════════════════

async function sendMainMenu(chatId, userId, messageId = null) {
  const user = DB.checkAndResetDailyLimits(userId);
  const text = MSG.mainMenuMessage(user);
  const keyboard = KB.mainMenuKeyboard(user.is_owner);
  
  if (messageId) {
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch {
      await bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: keyboard }
    });
  }
}

// ═══════════════════════════════════════════════════════════
// ➕ ADD PROJECT FLOW
// ═══════════════════════════════════════════════════════════

async function startAddProject(chatId, userId, messageId = null) {
  // Check project limit
  const user = DB.getUser(userId);
  const projects = DB.getUserProjects(userId);
  
  if (projects.length >= CONFIG.MAX_PROJECTS_PER_USER && !user.is_owner) {
    await bot.sendMessage(chatId, `${MSG.ICONS.warning} <b>MAX PROJECTS REACHED</b>\n\nYou can only have ${CONFIG.MAX_PROJECTS_PER_USER} projects. Delete one to add new.`, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [KB.backToMenuButton()] }
    });
    return;
  }
  
  DB.setPending(userId, { action: "waiting_link", step: 1 });
  
  const text = MSG.addProjectWelcome();
  if (messageId) {
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [KB.backToMenuButton()] }
      });
    } catch {
      await bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [KB.backToMenuButton()] }
      });
    }
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [KB.backToMenuButton()] }
    });
  }
}

async function handleProjectLink(chatId, userId, text) {
  const pending = DB.getPending(userId);
  if (!pending || pending.action !== "waiting_link") return;
  
  // Extract link
  const link = text.trim();
  if (!link.includes("t.me/") && !link.startsWith("@")) {
    await bot.sendMessage(chatId, `${MSG.ICONS.error} Invalid link. Please send a valid Telegram channel or group link.\n\nExample: <code>https://t.me/yourchannel</code>`, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [KB.backToMenuButton()] }
    });
    return;
  }
  
  // Normalize link
  let normalized = link;
  if (link.startsWith("@")) normalized = `https://t.me/${link.slice(1)}`;
  
  // Check if bot is admin
  const chatIdResolved = await resolveChatId(normalized);
  if (!chatIdResolved) {
    await bot.sendMessage(chatId, `${MSG.ICONS.error} Could not resolve this chat.\n\n${MSG.ICONS.info} Make sure:\n• The chat is public OR bot is already a member\n• The link is correct`, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [KB.retryAdminKeyboard()] }
    });
    return;
  }
  
  const isAdmin = await isBotAdmin(chatIdResolved);
  if (!isAdmin) {
    await bot.sendMessage(chatId, MSG.adminCheckFailed(normalized), {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: KB.retryAdminKeyboard() }
    });
    return;
  }
  
  // Save and move to emoji selection
  DB.setPending(userId, {
    action: "selecting_emoji",
    step: 2,
    project_link: normalized,
    project_chat_id: chatIdResolved,
    selected_emojis: []
  });
  
  await bot.sendMessage(chatId, MSG.emojiSelectMessage(), {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: KB.emojiKeyboard([]) }
  });
}

async function handleEmojiSelect(chatId, userId, emoji, messageId) {
  const pending = DB.getPending(userId);
  if (!pending || pending.action !== "selecting_emoji") return;
  
  const selected = pending.selected_emojis || [];
  const idx = selected.indexOf(emoji);
  
  if (idx >= 0) {
    selected.splice(idx, 1);
  } else {
    selected.push(emoji);
  }
  
  DB.setPending(userId, { ...pending, selected_emojis: selected });
  
  await bot.editMessageText(MSG.emojiSelectMessage(selected), {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: KB.emojiKeyboard(selected) }
  });
}

async function handleEmojiDone(chatId, userId, messageId) {
  const pending = DB.getPending(userId);
  if (!pending || pending.action !== "selecting_emoji") return;
  
  if (!pending.selected_emojis || pending.selected_emojis.length === 0) {
    await bot.answerCallbackQuery(messageId, { text: "Please select at least 1 emoji!" });
    return;
  }
  
  DB.setPending(userId, {
    ...pending,
    action: "selecting_reaction_count",
    step: 3
  });
  
  await bot.editMessageText(
    `${MSG.ICONS.reactions} <b>SELECT REACTIONS PER POST</b>\n\nHow many reactions should bot send on each new post?`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: KB.reactionsCountKeyboard() }
    }
  );
}

async function handleReactionCount(chatId, userId, count, messageId) {
  const pending = DB.getPending(userId);
  if (!pending || pending.action !== "selecting_reaction_count") return;
  
  DB.setPending(userId, {
    ...pending,
    action: "selecting_view_count",
    step: 4,
    reactions_per_post: count
  });
  
  await bot.editMessageText(
    `${MSG.ICONS.eye} <b>SELECT VIEWS PER POST</b>\n\nHow many views should be delivered on each new post?`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: KB.viewsCountKeyboard() }
    }
  );
}

async function handleViewCount(chatId, userId, count, messageId) {
  const pending = DB.getPending(userId);
  if (!pending || pending.action !== "selecting_view_count") return;
  
  DB.setPending(userId, {
    ...pending,
    action: "confirm_project",
    step: 5,
    views_per_post: count
  });
  
  // Show summary
  const summary = `
${MSG.ICONS.projects} <b>PROJECT SUMMARY</b>

${MSG.ICONS.channel} <b>Channel:</b> ${pending.project_link}
${MSG.ICONS.emoji} <b>Emojis:</b> ${pending.selected_emojis.join(" ")}
${MSG.ICONS.reactions} <b>Reactions/Post:</b> ${pending.reactions_per_post}
${MSG.ICONS.eye} <b>Views/Post:</b> ${count}
${MSG.ICONS.bolt} <b>Delivery:</b> Instant

${MSG.ICONS.check} Confirm to activate auto-delivery!
`;
  
  await bot.editMessageText(summary, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: KB.confirmProjectKeyboard() }
  });
}

async function handleConfirmProject(chatId, userId) {
  const pending = DB.getPending(userId);
  if (!pending || pending.action !== "confirm_project") return;
  
  const projectId = DB.generateProjectId();
  const project = {
    project_id: projectId,
    user_id: userId,
    target_link: pending.project_link,
    target_chat_id: pending.project_chat_id,
    emoji_pool: pending.selected_emojis,
    reactions_per_post: pending.reactions_per_post || 10,
    views_per_post: pending.views_per_post || 10,
    active: true,
    created_at: new Date().toISOString()
  };
  
  DB.saveProject(project);
  DB.clearPending(userId);
  
  // Update user project count
  const user = DB.getUser(userId);
  DB.updateUser(userId, { total_projects: (user.total_projects || 0) + 1 });
  
  await bot.sendMessage(chatId, MSG.projectAddedSuccess(project), {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [KB.backToMenuButton(), [{ text: `${MSG.ICONS.projects} My Projects`, callback_data: "my_projects" }]] }
  });
}

// ═══════════════════════════════════════════════════════════
// 📁 MY PROJECTS
// ═══════════════════════════════════════════════════════════

async function showMyProjects(chatId, userId, messageId = null) {
  const projects = DB.getUserProjects(userId);
  const text = MSG.myProjectsMessage(projects);
  
  const keyboard = [];
  
  if (projects.length > 0) {
    projects.forEach((p, i) => {
      const status = p.active ? "🟢" : "🔴";
      keyboard.push([{ text: `${status} #${i + 1} ${p.target_link.replace("https://", "")}`, callback_data: `project_detail_${p.project_id}` }]);
    });
  }
  
  keyboard.push([{ text: `${MSG.ICONS.add} Add Project`, callback_data: "add_project" }]);
  keyboard.push(KB.backToMenuButton());
  
  if (messageId) {
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch {
      await bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: keyboard }
    });
  }
}

async function showProjectDetail(chatId, projectId, messageId) {
  const project = DB.getProject(projectId);
  if (!project) return;
  
  const stats = DB.getProjectStats(projectId);
  const text = MSG.projectDetailMessage(project, stats);
  
  await bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: KB.projectActionsKeyboard(projectId) }
  });
}

async function handleDeleteProject(chatId, projectId, messageId) {
  const project = DB.getProject(projectId);
  if (!project) return;
  
  await bot.editMessageText(
    `${MSG.ICONS.warning} <b>DELETE PROJECT?</b>\n\n${MSG.ICONS.channel} ${project.target_link}\n\nThis action cannot be undone!`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: KB.deleteConfirmKeyboard(projectId) }
    }
  );
}

async function confirmDeleteProject(chatId, userId, projectId, messageId) {
  const project = DB.getProject(projectId);
  if (!project || project.user_id !== userId) return;
  
  DB.deleteProject(projectId);
  
  const user = DB.getUser(userId);
  DB.updateUser(userId, { total_projects: Math.max(0, (user.total_projects || 1) - 1) });
  
  await bot.editMessageText(
    `${MSG.ICONS.success} <b>PROJECT DELETED</b>\n\nThe project has been removed successfully.`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [KB.backToMenuButton(), [{ text: `${MSG.ICONS.projects} My Projects`, callback_data: "my_projects" }]] }
    }
  );
}

// ═══════════════════════════════════════════════════════════
// 📊 STATISTICS & RECHARGE
// ═══════════════════════════════════════════════════════════

async function showStatistics(chatId, userId, messageId = null) {
  const user = DB.checkAndResetDailyLimits(userId);
  const stats = DB.getUserStats(userId);
  const text = MSG.statsMessage(user, stats);
  
  if (messageId) {
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [KB.backToMenuButton()] }
      });
    } catch {
      await bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [KB.backToMenuButton()] }
      });
    }
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [KB.backToMenuButton()] }
    });
  }
}

async function showRecharge(chatId, messageId = null) {
  const text = MSG.rechargeMessage();
  const keyboard = KB.rechargeInlineKeyboard();
  
  if (messageId) {
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch {
      await bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: keyboard }
    });
  }
}

// ═══════════════════════════════════════════════════════════
// 👑 OWNER PANEL
// ═══════════════════════════════════════════════════════════

async function showOwnerPanel(chatId, userId, messageId = null) {
  if (userId !== CONFIG.OWNER_ID) return;
  
  const users = DB.getAllUsers();
  const projects = DB.getAllProjects();
  const stats = readData(FILES.STATS);
  const text = MSG.ownerStatsMessage(users, projects, stats);
  
  if (messageId) {
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: KB.ownerPanelKeyboard() }
      });
    } catch {
      await bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: KB.ownerPanelKeyboard() }
      });
    }
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: KB.ownerPanelKeyboard() }
    });
  }
}

// ═══════════════════════════════════════════════════════════
// 🤖 COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || "";
  const firstName = msg.from.first_name || "";
  const lastName = msg.from.last_name || "";
  
  DB.getOrCreateUser(userId, username, firstName, lastName);
  await handleVerification(chatId, userId);
});

bot.onText(/\/addlimit\s+(\d+)\s+(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== CONFIG.OWNER_ID) {
    await bot.sendMessage(chatId, `${MSG.ICONS.error} This command is only for owner!`);
    return;
  }
  
  const targetUserId = parseInt(match[1]);
  const amount = parseInt(match[2]);
  
  const user = DB.getUser(targetUserId);
  if (!user) {
    await bot.sendMessage(chatId, `${MSG.ICONS.error} User not found!`);
    return;
  }
  
  DB.updateUser(targetUserId, {
    daily_limit_reactions: amount,
    daily_limit_views: amount,
    credits: (user.credits || 0) + amount
  });
  
  await bot.sendMessage(chatId, `${MSG.ICONS.success} <b>LIMIT UPDATED</b>\n\nUser: <code>${targetUserId}</code>\nNew Limit: <b>${amount}</b> reactions + views/day`, { parse_mode: "HTML" });
  
  // Notify user
  try {
    await bot.sendMessage(targetUserId, `${MSG.ICONS.success} <b>CREDITS RECHARGED!</b>\n\nYour new daily limit:\n${MSG.ICONS.reactions} Reactions: ${amount}\n${MSG.ICONS.eye} Views: ${amount}\n\n${MSG.ICONS.star} Thank you for recharging!`, { parse_mode: "HTML" });
  } catch (e) {
    console.log("Could not notify user:", e.message);
  }
});

bot.onText(/\/broadcast/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== CONFIG.OWNER_ID) return;
  
  DB.setPending(userId, { action: "broadcasting" });
  await bot.sendMessage(chatId, MSG.broadcastMessage(), {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [[{ text: "Cancel", callback_data: "cancel_broadcast" }]] }
  });
});

bot.onText(/\/ban\s+(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== CONFIG.OWNER_ID) return;
  
  const targetId = parseInt(match[1]);
  DB.updateUser(targetId, { is_banned: true });
  await bot.sendMessage(chatId, `${MSG.ICONS.success} User <code>${targetId}</code> has been banned.`, { parse_mode: "HTML" });
});

bot.onText(/\/unban\s+(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== CONFIG.OWNER_ID) return;
  
  const targetId = parseInt(match[1]);
  DB.updateUser(targetId, { is_banned: false });
  await bot.sendMessage(chatId, `${MSG.ICONS.success} User <code>${targetId}</code> has been unbanned.`, { parse_mode: "HTML" });
});

// ═══════════════════════════════════════════════════════════
// 📨 CALLBACK QUERY HANDLER
// ═══════════════════════════════════════════════════════════

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  const data = query.data;
  
  try {
    // Cancel any pending
    if (data === "cancel_broadcast") {
      DB.clearPending(userId);
      await bot.sendMessage(chatId, `${MSG.ICONS.cross} Broadcast cancelled.`, {
        reply_markup: { inline_keyboard: [KB.backToMenuButton()] }
      });
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    // Main navigation
    if (data === "main_menu") {
      await sendMainMenu(chatId, userId, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    if (data === "verify_join") {
      await processVerifyCallback(chatId, userId, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    if (data === "add_project") {
      await startAddProject(chatId, userId, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    if (data === "my_projects") {
      await showMyProjects(chatId, userId, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    if (data === "statistics") {
      await showStatistics(chatId, userId, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    if (data === "recharge") {
      await showRecharge(chatId, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    if (data === "plan_balance") {
      await showStatistics(chatId, userId, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    if (data === "owner_panel") {
      await showOwnerPanel(chatId, userId, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    if (data === "owner_stats") {
      await showOwnerPanel(chatId, userId, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    if (data === "owner_broadcast") {
      DB.setPending(userId, { action: "broadcasting" });
      await bot.editMessageText(MSG.broadcastMessage(), {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "Cancel", callback_data: "cancel_broadcast" }]] }
      });
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    if (data === "users_list") {
      const users = DB.getAllUsers();
      let text = `${MSG.ICONS.group} <b>ALL USERS (${users.length})</b>\n\n`;
      users.slice(0, 20).forEach((u, i) => {
        const status = u.is_banned ? "🔴 BANNED" : (u.verified ? "🟢 Verified" : "🟡 Not Verified");
        text += `${i + 1}. <code>${u.user_id}</code> | @${u.username || "N/A"} | ${status}\n`;
      });
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: KB.ownerPanelKeyboard() }
      });
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    // Retry admin check
    if (data === "retry_admin_check") {
      const pending = DB.getPending(userId);
      if (pending && pending.project_link) {
        const chatIdResolved = await resolveChatId(pending.project_link);
        if (chatIdResolved) {
          const isAdmin = await isBotAdmin(chatIdResolved);
          if (isAdmin) {
            DB.setPending(userId, {
              ...pending,
              action: "selecting_emoji",
              step: 2,
              project_chat_id: chatIdResolved,
              selected_emojis: []
            });
            await bot.editMessageText(MSG.emojiSelectMessage(), {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: KB.emojiKeyboard([]) }
            });
          } else {
            await bot.answerCallbackQuery(query.id, { text: "Still not admin! Please add bot as admin first." });
          }
        } else {
          await bot.answerCallbackQuery(query.id, { text: "Cannot resolve chat!" });
        }
      }
      return;
    }
    
    // Emoji selection
    if (data.startsWith("emoji_")) {
      const emoji = data.replace("emoji_", "");
      if (emoji === "clear") {
        const pending = DB.getPending(userId);
        if (pending) {
          DB.setPending(userId, { ...pending, selected_emojis: [] });
          await bot.editMessageText(MSG.emojiSelectMessage([]), {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: KB.emojiKeyboard([]) }
          });
        }
      } else if (emoji === "done") {
        await handleEmojiDone(chatId, userId, messageId);
      } else {
        await handleEmojiSelect(chatId, userId, emoji, messageId);
      }
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    // Reaction count
    if (data.startsWith("rxn_count_")) {
      const count = parseInt(data.replace("rxn_count_", ""));
      await handleReactionCount(chatId, userId, count, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    // View count
    if (data.startsWith("view_count_")) {
      const count = parseInt(data.replace("view_count_", ""));
      await handleViewCount(chatId, userId, count, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    // Confirm project
    if (data === "confirm_project") {
      await handleConfirmProject(chatId, userId);
      await bot.answerCallbackQuery(query.id, { text: "Project saved!" });
      return;
    }
    
    // Project detail
    if (data.startsWith("project_detail_")) {
      const projectId = data.replace("project_detail_", "");
      await showProjectDetail(chatId, projectId, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    // Delete project
    if (data.startsWith("delete_")) {
      const projectId = data.replace("delete_", "");
      await handleDeleteProject(chatId, projectId, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    // Confirm delete
    if (data.startsWith("confirm_delete_")) {
      const projectId = data.replace("confirm_delete_", "");
      await confirmDeleteProject(chatId, userId, projectId, messageId);
      await bot.answerCallbackQuery(query.id, { text: "Deleted!" });
      return;
    }
    
    // History
    if (data.startsWith("history_")) {
      const projectId = data.replace("history_", "");
      const stats = DB.getProjectStats(projectId);
      let text = `${MSG.ICONS.history} <b>PROJECT HISTORY</b>\n\n`;
      if (stats.length === 0) {
        text += "No deliveries yet. New posts will trigger auto-delivery!";
      } else {
        stats.slice(-10).forEach((s, i) => {
          const time = new Date(s.timestamp).toLocaleTimeString();
          text += `${i + 1}. Msg ${s.message_id} | Rxn:${s.reactions_sent} | Views:${s.views_sent} | ${s.status} | ${time}\n`;
        });
      }
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: MSG.ICONS.back + " Back", callback_data: `project_detail_${projectId}` }]] }
      });
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    // Edit (toggle active)
    if (data.startsWith("edit_")) {
      const projectId = data.replace("edit_", "");
      const project = DB.getProject(projectId);
      if (project && project.user_id === userId) {
        project.active = !project.active;
        DB.saveProject(project);
        await bot.answerCallbackQuery(query.id, { text: project.active ? "Activated!" : "Paused!" });
        await showProjectDetail(chatId, projectId, messageId);
      }
      return;
    }
    
    await bot.answerCallbackQuery(query.id);
  } catch (err) {
    console.error("Callback error:", err);
    await bot.answerCallbackQuery(query.id, { text: "An error occurred!" });
  }
});

// ═══════════════════════════════════════════════════════════
// ✉️ MESSAGE HANDLER (Text inputs)
// ═══════════════════════════════════════════════════════════

bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text.trim();
  
  const pending = DB.getPending(userId);
  if (!pending) return;
  
  // Handle broadcast
  if (pending.action === "broadcasting") {
    if (userId !== CONFIG.OWNER_ID) return;
    
    DB.clearPending(userId);
    
    const users = DB.getAllUsers();
    let sent = 0;
    let failed = 0;
    
    await bot.sendMessage(chatId, `${MSG.ICONS.info} Broadcasting to ${users.length} users...`);
    
    for (const user of users) {
      try {
        await bot.sendMessage(user.user_id, text, { parse_mode: "HTML" });
        sent++;
        await sleep(50); // Rate limit safety
      } catch {
        failed++;
      }
    }
    
    await bot.sendMessage(chatId, `${MSG.ICONS.success} <b>BROADCAST COMPLETE</b>\n\nSent: ${sent}\nFailed: ${failed}`, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [KB.backToMenuButton()] }
    });
    return;
  }
  
  // Handle project link
  if (pending.action === "waiting_link") {
    await handleProjectLink(chatId, userId, text);
    return;
  }
});


// ═══════════════════════════════════════════════════════════
// ⚡ AUTO-REACTION & VIEWS ENGINE
// ═══════════════════════════════════════════════════════════

async function deliverReactions(chatId, messageId, project, user) {
  try {
    const emojis = project.emoji_pool;
    const count = Math.min(project.reactions_per_post, emojis.length);
    
    // Pick random unique emojis
    const shuffled = [...emojis].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    
    // Use setMessageReaction API (Telegram Bot API 7.0+)
    // node-telegram-bot-api may not have direct support, use raw request
    const axios = require("axios");
    
    for (const emoji of selected) {
      try {
        await axios.post(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/setMessageReaction`, {
          chat_id: chatId,
          message_id: messageId,
          reaction: [{ type: "emoji", emoji: emoji }],
          is_big: false
        });
        await sleep(300);
      } catch (rxnErr) {
        console.log(`Reaction failed for ${emoji}:`, rxnErr.response?.data?.description || rxnErr.message);
      }
    }
    
    return selected.length;
  } catch (err) {
    console.error("Deliver reactions error:", err.message);
    return 0;
  }
}

async function deliverViews(chatId, messageId, count) {
  // Bot API CANNOT send views directly.
  // Views require real user accounts via MTProto.
  // This is a placeholder that logs the attempt.
  // For real views, integrate MTProto userbot here.
  
  console.log(`[VIEWS] Would deliver ${count} views to ${chatId}/${messageId}`);
  
  // TODO: Integrate telegram MTProto client here for real views
  // Requires: API_ID, API_HASH, PHONE_NUMBER, STRING_SESSION
  // See: https://github.com/gram-js/gramjs
  
  return count; // Simulated
}

// Listen for new channel posts
bot.on("channel_post", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    
    // Find projects for this channel
    const projects = DB.getProjectByChatId(chatId);
    if (!projects || projects.length === 0) return;
    
    for (const project of projects) {
      if (!project.active) continue;
      
      const user = DB.checkAndResetDailyLimits(project.user_id);
      if (!user || user.is_banned) continue;
      
      // Check limits
      const canReact = canSendReactions(user, project.reactions_per_post);
      const canView = canSendViews(user, project.views_per_post);
      
      let reactionsSent = 0;
      let viewsSent = 0;
      let status = "success";
      
      try {
        if (canReact) {
          reactionsSent = await deliverReactions(chatId, messageId, project, user);
          if (reactionsSent > 0) {
            DB.incrementUsage(project.user_id, "reactions", reactionsSent);
          }
        }
        
        if (canView) {
          viewsSent = await deliverViews(chatId, messageId, project.views_per_post);
          if (viewsSent > 0) {
            DB.incrementUsage(project.user_id, "views", viewsSent);
          }
        }
        
        if (!canReact && !canView) {
          status = "limit_reached";
        }
      } catch (err) {
        console.error("Delivery error:", err);
        status = "failed";
      }
      
      // Save stat
      DB.addStat({
        stat_id: "stat_" + Date.now(),
        project_id: project.project_id,
        user_id: project.user_id,
        message_id: messageId,
        chat_id: chatId,
        reactions_sent: reactionsSent,
        views_sent: viewsSent,
        status,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Channel post handler error:", err);
  }
});

// Also handle regular messages in groups (group posts)
bot.on("message", async (msg) => {
  // Skip if not in a group or channel
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") return;
  if (!msg.text && !msg.photo && !msg.video && !msg.document) return;
  
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  
  const projects = DB.getProjectByChatId(chatId);
  if (!projects || projects.length === 0) return;
  
  for (const project of projects) {
    if (!project.active) continue;
    
    const user = DB.checkAndResetDailyLimits(project.user_id);
    if (!user || user.is_banned) continue;
    
    const canReact = canSendReactions(user, project.reactions_per_post);
    const canView = canSendViews(user, project.views_per_post);
    
    let reactionsSent = 0;
    let viewsSent = 0;
    let status = "success";
    
    try {
      if (canReact) {
        reactionsSent = await deliverReactions(chatId, messageId, project, user);
        if (reactionsSent > 0) {
          DB.incrementUsage(project.user_id, "reactions", reactionsSent);
        }
      }
      
      if (canView) {
        viewsSent = await deliverViews(chatId, messageId, project.views_per_post);
        if (viewsSent > 0) {
          DB.incrementUsage(project.user_id, "views", viewsSent);
        }
      }
      
      if (!canReact && !canView) {
        status = "limit_reached";
      }
    } catch (err) {
      status = "failed";
    }
    
    DB.addStat({
      stat_id: "stat_" + Date.now(),
      project_id: project.project_id,
      user_id: project.user_id,
      message_id: messageId,
      chat_id: chatId,
      reactions_sent: reactionsSent,
      views_sent: viewsSent,
      status,
      timestamp: new Date().toISOString()
    });
  }
});

// ═══════════════════════════════════════════════════════════
// 🚀 KEEP ALIVE & ERROR HANDLING
// ═══════════════════════════════════════════════════════════

bot.on("polling_error", (err) => {
  console.error("Polling error:", err.message || err);
});

bot.on("error", (err) => {
  console.error("Bot error:", err.message || err);
});

// Health check log every 5 minutes
setInterval(() => {
  const users = DB.getAllUsers();
  const projects = DB.getAllProjects();
  console.log(`[${new Date().toISOString()}] Health: ${users.length} users, ${projects.length} projects`);
}, 300000);

console.log("🚀 Auto-Reaction + Views engine loaded!");
console.log("📢 Bot will auto-deliver reactions on new channel/group posts.");
