// ═══════════════════════════════════════════════════════════
// 🎨 UI MESSAGES & TEMPLATES
// ═══════════════════════════════════════════════════════════

const { CONFIG } = require("./config");

const ICONS = {
  bot: "🤖",
  fire: "🔥",
  check: "✅",
  cross: "❌",
  warning: "⚠️",
  info: "ℹ️",
  star: "⭐",
  rocket: "🚀",
  crown: "👑",
  settings: "⚙️",
  stats: "📊",
  projects: "📁",
  add: "➕",
  delete: "🗑️",
  edit: "✏️",
  recharge: "💳",
  back: "🔙",
  home: "🏠",
  channel: "📢",
  group: "👥",
  youtube: "📺",
  whatsapp: "💬",
  link: "🔗",
  emoji: "😀",
  views: "👁️",
  reactions: "👍",
  clock: "⏰",
  dollar: "💰",
  limit: "📈",
  history: "📜",
  admin: "🛡️",
  success: "🎉",
  error: "⛔",
  pending: "⏳",
  eye: "👁️",
  bolt: "⚡",
  chart: "📈",
  calender: "📅"
};

function welcomeMessage(firstName) {
  return `
${ICONS.fire} <b>Welcome to AUTO REACTION + VIEWS ${ICONS.fire}</b>

Hey <b>${firstName}</b>! 

This premium bot automatically sends reactions and views to your Telegram channel/group posts.

${ICONS.star} <b>Features:</b>
├ Auto Reactions on every post
├ Auto Views on every post  
├ Multiple Emoji Support
├ Daily Limits & Stats
├ Beautiful Dashboard

${ICONS.warning} <b>To continue, please join all channels below:</b>
`;
}

function mainMenuMessage(user) {
  const isOwner = user.user_id === CONFIG.OWNER_ID;
  const today = new Date().toDateString();
  const isReset = user.last_reset_date === today;
  
  let status = `${ICONS.check} Active`;
  if (user.is_banned) status = `${ICONS.cross} Banned`;
  
  const reactionsLeft = user.daily_limit_reactions - user.used_today_reactions;
  const viewsLeft = user.daily_limit_views - user.used_today_views;
  
  let msg = `
${ICONS.crown} <b>MAIN MENU</b> ${ICONS.crown}

${ICONS.info} <b>Your Status:</b> ${status}
${ICONS.channel} <b>Projects:</b> <code>${user.total_projects}</code>

${ICONS.limit} <b>Daily Limits (Resets Daily)</b>
├ ${ICONS.reactions} Reactions: <b>${Math.max(0, reactionsLeft)}</b> / ${user.daily_limit_reactions}
└ ${ICONS.eye} Views: <b>${Math.max(0, viewsLeft)}</b> / ${user.daily_limit_views}

${ICONS.chart} <b>Total Sent:</b>
├ Reactions: <b>${user.total_reactions_sent}</b>
└ Views: <b>${user.total_views_sent}</b>
`;

  if (isOwner) {
    msg += `\n${ICONS.admin} <b>OWNER PANEL ACCESS</b>\n`;
  }
  
  return msg;
}

function verifyMessage() {
  return `
${ICONS.warning} <b>VERIFICATION REQUIRED</b> ${ICONS.warning}

To use this bot, you must join all 4 channels/groups below:

1️⃣ Telegram Channel
2️⃣ Telegram Group  
3️⃣ YouTube Channel
4️⃣ WhatsApp Channel

Click each button to join, then click ✅ <b>VERIFY</b>.

${ICONS.info} <i>Bot will check if you joined Telegram Channel & Group automatically.</i>
<i>YouTube & WhatsApp links will open in browser.</i>
`;
}

function notMemberMessage(failed) {
  let msg = `${ICONS.cross} <b>VERIFICATION FAILED</b>\n\nYou haven't joined:\n`;
  failed.forEach((f, i) => {
    msg += `${i + 1}. ${f}\n`;
  });
  msg += `\n${ICONS.warning} Please join ALL channels above and try again!`;
  return msg;
}

function addProjectWelcome() {
  return `
${ICONS.add} <b>ADD NEW PROJECT</b> ${ICONS.add}

Follow the steps to setup auto reactions + views:

<b>Step 1/5:</b> Send your Channel or Group link

${ICONS.info} Examples:
├ Public: <code>https://t.me/yourchannel</code>
├ Private: <code>https://t.me/+AbCdEfGh123</code>

${ICONS.warning} <b>Important:</b>
• Bot must be <b>ADMIN</b> in your channel/group
• Give bot these permissions: Post Messages, Edit Messages, Delete Messages
`;
}

function projectAddedSuccess(project) {
  return `
${ICONS.success} <b>PROJECT CREATED!</b> ${ICONS.success}

${ICONS.channel} <b>Target:</b> ${project.target_link}
${ICONS.emoji} <b>Emoji Pool:</b> ${project.emoji_pool.join(" ")}
${ICONS.reactions} <b>Reactions/Post:</b> ${project.reactions_per_post}
${ICONS.eye} <b>Views/Post:</b> ${project.views_per_post}
${ICONS.bolt} <b>Delivery:</b> Instant

${ICONS.rocket} Bot will now auto-deliver on every new post!
`;
}

function myProjectsMessage(projects) {
  if (projects.length === 0) {
    return `${ICONS.info} You don't have any projects yet.\n\nClick "${ICONS.add} Add Project" to create one!`;
  }
  
  let msg = `${ICONS.projects} <b>MY PROJECTS</b> ${ICONS.projects}\n\n`;
  projects.forEach((p, i) => {
    const status = p.active ? `${ICONS.check} Active` : `${ICONS.cross} Paused`;
    msg += `<b>#${i + 1}</b> ${status}\n`;
    msg += `├ Channel: <code>${p.target_link}</code>\n`;
    msg += `├ Reactions: ${p.reactions_per_post}/post\n`;
    msg += `├ Views: ${p.views_per_post}/post\n`;
    msg += `└ Created: ${p.created_at.split("T")[0]}\n\n`;
  });
  return msg;
}

function projectDetailMessage(project, stats) {
  const totalReactions = stats.reduce((a, s) => a + (s.reactions_sent || 0), 0);
  const totalViews = stats.reduce((a, s) => a + (s.views_sent || 0), 0);
  const successCount = stats.filter((s) => s.status === "success").length;
  const failCount = stats.filter((s) => s.status === "failed").length;
  
  return `
${ICONS.projects} <b>PROJECT DETAILS</b>

${ICONS.channel} <b>Channel:</b> ${project.target_link}
${ICONS.emoji} <b>Emoji Pool:</b> ${project.emoji_pool.join(" ")}

📊 <b>Type:</b> Random
${ICONS.reactions} <b>Rxn/Post:</b> ${project.reactions_per_post}
${ICONS.bolt} <b>Delivery:</b> Instant
${ICONS.eye} <b>Views/Post:</b> ${project.views_per_post}
${ICONS.eye} <b>Views Delay:</b> Instant
${ICONS.dollar} <b>Credits Used:</b> ${stats.length * 2}
${ICONS.calender} <b>Created:</b> ${project.created_at.split("T")[0]}

${ICONS.stats} <b>STATUS:</b>
${ICONS.check} <b>Successful:</b> ${successCount}/${stats.length}
${ICONS.dollar} <b>Cost:</b> ${stats.length * (project.reactions_per_post + project.views_per_post)} Credits
${ICONS.eye} <b>Views:</b> ${totalViews}/${stats.length * project.views_per_post}
${ICONS.emoji} <b>Emojis:</b> ${project.emoji_pool.slice(0, 5).map((e, i) => `${e}×${Math.ceil(totalReactions / project.emoji_pool.length)}`).join(", ")}
`;
}

function rechargeMessage() {
  return `
${ICONS.recharge} <b>RECHARGE CREDITS</b> ${ICONS.recharge}

Need more daily reactions and views?

${ICONS.info} Contact Admin to recharge your account:

${ICONS.whatsapp} <b>WhatsApp:</b> <code>${CONFIG.RECHARGE_CONTACT.WHATSAPP_NUMBER}</code>
${ICONS.channel} <b>Telegram:</b> ${CONFIG.RECHARGE_CONTACT.TELEGRAM_USERNAME}

${ICONS.dollar} <b>Payment Methods:</b>
├ Easypaisa / JazzCash
├ Bank Transfer
├ Crypto (USDT)

${ICONS.warning} After payment, admin will use:
<code>/addlimit ${CONFIG.RECHARGE_CONTACT.TELEGRAM_USERNAME} 500</code>

${ICONS.star} Higher limits = More engagement on your posts!
`;
}

function statsMessage(user, allStats) {
  const todayStats = allStats.filter((s) => {
    const d = new Date(s.timestamp);
    return d.toDateString() === new Date().toDateString();
  });
  
  return `
${ICONS.stats} <b>YOUR STATISTICS</b> ${ICONS.stats}

${ICONS.channel} <b>Total Projects:</b> ${user.total_projects}
${ICONS.reactions} <b>Total Reactions Sent:</b> ${user.total_reactions_sent}
${ICONS.eye} <b>Total Views Sent:</b> ${user.total_views_sent}

${ICONS.clock} <b>Today Activity:</b>
├ Deliveries: ${todayStats.length}
├ Reactions: ${todayStats.reduce((a, s) => a + (s.reactions_sent || 0), 0)}
└ Views: ${todayStats.reduce((a, s) => a + (s.views_sent || 0), 0)}

${ICONS.limit} <b>Daily Limit Left:</b>
├ Reactions: ${Math.max(0, user.daily_limit_reactions - user.used_today_reactions)}
└ Views: ${Math.max(0, user.daily_limit_views - user.used_today_views)}
`;
}

function ownerStatsMessage(users, projects, stats) {
  return `
${ICONS.crown} <b>OWNER DASHBOARD</b> ${ICONS.crown}

${ICONS.group} <b>Total Users:</b> ${users.length}
${ICONS.projects} <b>Total Projects:</b> ${projects.length}
${ICONS.reactions} <b>Total Deliveries:</b> ${stats.length}

${ICONS.eye} <b>Today Stats:</b>
├ Active Users: ${users.filter((u) => u.last_reset_date === new Date().toDateString()).length}
└ Deliveries: ${stats.filter((s) => new Date(s.timestamp).toDateString() === new Date().toDateString()).length}

${ICONS.admin} <b>Owner Commands:</b>
<code>/addlimit user_id amount</code>
<code>/broadcast Your message</code>
<code>/ban user_id</code>
<code>/unban user_id</code>
`;
}

function broadcastMessage() {
  return `
${ICONS.admin} <b>BROADCAST MODE</b>

Send me the message you want to broadcast to ALL users.

${ICONS.info} This will send to every user who started the bot.
${ICONS.warning} Max 4000 characters. Supports HTML.

Type /cancel to cancel.
`;
}

function emojiSelectMessage(selected = []) {
  return `
${ICONS.emoji} <b>SELECT EMOJI POOL</b>

Choose emojis for auto-reactions:

${ICONS.info} Currently selected: ${selected.length > 0 ? selected.join(" ") : "None"}

Tap emojis to select/deselect. Then click ✅ Done.
`;
}

function adminCheckFailed(link) {
  return `
${ICONS.error} <b>ADMIN CHECK FAILED</b>

Bot is <b>NOT</b> an admin in:
<code>${link}</code>

${ICONS.warning} Please:
1. Add this bot as <b>ADMIN</b> in your channel/group
2. Give these permissions:
   ├ Post Messages
   ├ Edit Messages  
   └ Delete Messages
3. Then try again

${ICONS.info} After adding admin, click 🔄 Retry
`;
}

function limitMessage() {
  return `
${ICONS.limit} <b>DAILY LIMIT REACHED</b>

You have used your daily limit!

${ICONS.reactions} Reactions: 0 left
${ICONS.eye} Views: 0 left

${ICONS.dollar} <b>Recharge to increase limits:</b>
Contact: ${CONFIG.RECHARGE_CONTACT.TELEGRAM_USERNAME}
`;
}

module.exports = {
  ICONS,
  welcomeMessage,
  mainMenuMessage,
  verifyMessage,
  notMemberMessage,
  addProjectWelcome,
  projectAddedSuccess,
  myProjectsMessage,
  projectDetailMessage,
  rechargeMessage,
  statsMessage,
  ownerStatsMessage,
  broadcastMessage,
  emojiSelectMessage,
  adminCheckFailed,
  limitMessage
};
