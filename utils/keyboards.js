// ═══════════════════════════════════════════════════════════
// ⌨️ INLINE KEYBOARDS (PREMIUM UI)
// ═══════════════════════════════════════════════════════════

const { CONFIG } = require("../config");
const { ICONS } = require("./messages");

function verificationKeyboard() {
  const mj = CONFIG.MANDATORY_JOIN;
  return [
    [
      { text: `${ICONS.channel} Telegram Channel`, url: mj.TELEGRAM_CHANNEL.LINK },
      { text: `${ICONS.group} Telegram Group`, url: mj.TELEGRAM_GROUP.LINK }
    ],
    [
      { text: `${ICONS.youtube} YouTube Channel`, url: mj.YOUTUBE_CHANNEL.LINK },
      { text: `${ICONS.whatsapp} WhatsApp Channel`, url: mj.WHATSAPP_CHANNEL.LINK }
    ],
    [
      { text: `${ICONS.check} ✅ VERIFY JOINED`, callback_data: "verify_join" }
    ]
  ];
}

function mainMenuKeyboard(isOwner = false) {
  const keyboard = [
    [
      { text: `${ICONS.add} ADD PROJECT`, callback_data: "add_project" },
      { text: `${ICONS.projects} MY PROJECTS`, callback_data: "my_projects" }
    ],
    [
      { text: `${ICONS.stats} STATISTICS`, callback_data: "statistics" },
      { text: `${ICONS.recharge} RECHARGE`, callback_data: "recharge" }
    ],
    [
      { text: `${ICONS.limit} PLAN & BALANCE`, callback_data: "plan_balance" }
    ]
  ];
  
  if (isOwner) {
    keyboard.push([
      { text: `${ICONS.admin} OWNER PANEL`, callback_data: "owner_panel" }
    ]);
  }
  
  return keyboard;
}

function backToMenuButton() {
  return [
    { text: `${ICONS.home} Main Menu`, callback_data: "main_menu" }
  ];
}

function backButton(callbackData = "main_menu") {
  return [
    { text: `${ICONS.back} Back`, callback_data }
  ];
}

function projectActionsKeyboard(projectId) {
  return [
    [
      { text: `${ICONS.history} History`, callback_data: `history_${projectId}` },
      { text: `${ICONS.edit} Edit`, callback_data: `edit_${projectId}` }
    ],
    [
      { text: `${ICONS.delete} Delete`, callback_data: `delete_${projectId}` }
    ],
    [
      { text: `${ICONS.back} Back`, callback_data: "my_projects" }
    ]
  ];
}

function emojiKeyboard(selectedEmojis = []) {
  const emojis = CONFIG.AVAILABLE_EMOJIS;
  const rows = [];
  
  // 4 emojis per row
  for (let i = 0; i < emojis.length; i += 4) {
    const row = [];
    for (let j = i; j < i + 4 && j < emojis.length; j++) {
      const emoji = emojis[j];
      const isSelected = selectedEmojis.includes(emoji);
      const text = isSelected ? `${emoji} ✓` : emoji;
      row.push({ text, callback_data: `emoji_${emoji}` });
    }
    rows.push(row);
  }
  
  rows.push([
    { text: `${ICONS.cross} Clear All`, callback_data: "emoji_clear" },
    { text: `${ICONS.check} ✅ Done`, callback_data: "emoji_done" }
  ]);
  
  rows.push(backButton("add_project"));
  
  return rows;
}

function reactionsCountKeyboard() {
  const counts = [5, 10, 20, 30, 50, 100];
  const rows = [];
  
  for (let i = 0; i < counts.length; i += 3) {
    const row = [];
    for (let j = i; j < i + 3 && j < counts.length; j++) {
      row.push({ text: `${counts[j]}`, callback_data: `rxn_count_${counts[j]}` });
    }
    rows.push(row);
  }
  
  rows.push(backButton("emoji_done"));
  return rows;
}

function viewsCountKeyboard() {
  const counts = [10, 20, 30, 50, 100, 200, 500];
  const rows = [];
  
  for (let i = 0; i < counts.length; i += 3) {
    const row = [];
    for (let j = i; j < i + 3 && j < counts.length; j++) {
      row.push({ text: `${counts[j]}`, callback_data: `view_count_${counts[j]}` });
    }
    rows.push(row);
  }
  
  rows.push(backButton("rxn_done"));
  return rows;
}

function confirmProjectKeyboard() {
  return [
    [
      { text: `${ICONS.check} ✅ CONFIRM & SAVE`, callback_data: "confirm_project" }
    ],
    [
      { text: `${ICONS.back} Start Over`, callback_data: "add_project" }
    ],
    [
      { text: `${ICONS.home} Cancel`, callback_data: "main_menu" }
    ]
  ];
}

function retryAdminKeyboard() {
  return [
    [
      { text: `🔄 Retry`, callback_data: "retry_admin_check" }
    ],
    [
      { text: `${ICONS.home} Cancel`, callback_data: "main_menu" }
    ]
  ];
}

function deleteConfirmKeyboard(projectId) {
  return [
    [
      { text: `${ICONS.cross} Yes, Delete`, callback_data: `confirm_delete_${projectId}` }
    ],
    [
      { text: `${ICONS.back} No, Keep It`, callback_data: `project_detail_${projectId}` }
    ]
  ];
}

function ownerPanelKeyboard() {
  return [
    [
      { text: `${ICONS.stats} Stats`, callback_data: "owner_stats" },
      { text: `${ICONS.admin} Broadcast`, callback_data: "owner_broadcast" }
    ],
    [
      { text: `${ICONS.group} Users List`, callback_data: "users_list" }
    ],
    [
      { text: `${ICONS.home} Main Menu`, callback_data: "main_menu" }
    ]
  ];
}

function paginationKeyboard(currentPage, totalPages, baseCallback) {
  const row = [];
  
  if (currentPage > 1) {
    row.push({ text: "◀️ Prev", callback_data: `${baseCallback}_${currentPage - 1}` });
  }
  
  row.push({ text: `📄 ${currentPage}/${totalPages}`, callback_data: "noop" });
  
  if (currentPage < totalPages) {
    row.push({ text: "Next ▶️", callback_data: `${baseCallback}_${currentPage + 1}` });
  }
  
  return [row];
}

function rechargeInlineKeyboard() {
  return [
    [
      { text: `${ICONS.whatsapp} WhatsApp`, url: `https://wa.me/${CONFIG.RECHARGE_CONTACT.WHATSAPP_NUMBER.replace(/\+/g, "")}` },
      { text: `${ICONS.channel} Telegram`, url: `https://t.me/${CONFIG.RECHARGE_CONTACT.TELEGRAM_USERNAME.replace("@", "")}` }
    ],
    backToMenuButton()
  ];
}

module.exports = {
  verificationKeyboard,
  mainMenuKeyboard,
  backToMenuButton,
  backButton,
  projectActionsKeyboard,
  emojiKeyboard,
  reactionsCountKeyboard,
  viewsCountKeyboard,
  confirmProjectKeyboard,
  retryAdminKeyboard,
  deleteConfirmKeyboard,
  ownerPanelKeyboard,
  paginationKeyboard,
  rechargeInlineKeyboard
};
