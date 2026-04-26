// ═══════════════════════════════════════════════════════════
// ⚙️ BOT CONFIGURATION - FINAL WORKING VERSION
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  // 🔐 Bot Token from BotFather
  BOT_TOKEN: "8413500859:AAFRpvLVFFdZB4nGiL-sZccwh3Duw9AmK7g",

  // 👑 Owner Telegram User ID
  OWNER_ID: 8627624927, // apna real ID daalo

  // 📢 Mandatory Join Channels / Groups
  MANDATORY_JOIN: {
    TELEGRAM_CHANNEL: {
      LINK: "https://t.me/ssbugchannel",
      CHAT_ID: "-1003740544433", // real channel ID
      NAME: "SHADOW OFFICIAL"
    },

    TELEGRAM_GROUP: {
      LINK: "https://t.me/+ZVEczsZmiWFkNTBl",
      CHAT_ID: "-1003989785950", // real group ID
      NAME: "SHADOW WHATSAPP JAMM GROUP"
    },

    YOUTUBE_CHANNEL: {
      LINK: "https://youtube.com/@shadowhere.460?si=vY16qBn3azUu85U4",
      NAME: "HOW TO BE A HACKER"
    },

    WHATSAPP_CHANNEL: {
      LINK: "https://whatsapp.com/channel/0029VbD54jxEgGfIqPaPSK24",
      NAME: "SHADOW OFFICIAL"
    }
  },

  // 💰 Contact info
  RECHARGE_CONTACT: {
    WHATSAPP_NUMBER: "+923709515870",
    TELEGRAM_USERNAME: "@shadowhacrrr"
  },

  // 📊 Limits (only reactions now)
  DEFAULT_DAILY_LIMIT: {
    REACTIONS: 200,
    VIEWS: 0 // ❌ views off
  },

  OWNER_UNLIMITED: true,

  AVAILABLE_EMOJIS: [
    "👍", "❤️", "🔥", "🎉", "😁", "🤩", "😱", "😢",
    "💯", "⚡", "🚀", "🥳", "😍", "🤣", "👏", "🙏"
  ],

  MAX_PROJECTS_PER_USER: 5,
  POLLING_INTERVAL: 300
};

// ❌ MTProto completely disabled
const MTPROTO_CONFIG = null;

module.exports = { CONFIG, MTPROTO_CONFIG };
