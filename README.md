# 🤖 Telegram Auto Reaction + Views Bot

Premium Telegram Bot built in **Node.js** with auto-reactions, auto-views, verification system, daily limits, recharge system, and owner broadcast — all using **JSON files** (no database needed).

---

## ✨ Features

| Feature | Status |
|---------|--------|
| 4-Channel Verification (TG Channel, TG Group, YouTube, WhatsApp) | ✅ |
| Link-based Verification (NOT username) | ✅ |
| Auto Reactions on New Posts | ✅ |
| Auto Views on New Posts | ⚠️ Structure Ready |
| Premium Inline Keyboard UI | ✅ |
| Daily Limits for Users | ✅ |
| Unlimited for Owner | ✅ |
| Recharge System (WhatsApp + Telegram Contact) | ✅ |
| Owner `/addlimit` Command | ✅ |
| Owner `/broadcast` to All Users | ✅ |
| Project Management (Add/Edit/Delete) | ✅ |
| Statistics Dashboard | ✅ |
| JSON File Storage (No DB) | ✅ |
| Polling Mode (No Webhook) | ✅ |

---

## 📁 Project Structure

```
telegram-auto-reaction-bot/
├── index.js              # Main bot file (polling + handlers + engine)
├── config.js             # All owner settings & links
├── database.js           # JSON database manager
├── package.json          # Dependencies
├── utils/
│   ├── messages.js       # All text templates & UI
│   └── keyboards.js      # Inline keyboard layouts
└── data/                 # JSON storage (auto-created)
    ├── users.json
    ├── projects.json
    ├── stats.json
    ├── settings.json
    └── pending.json
```

---

## 🚀 Step-by-Step Setup

### Step 1: Get Bot Token from BotFather

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Give your bot a name and username (must end in `bot`)
4. Copy the **HTTP API Token**
5. Paste it in `config.js`:

```js
BOT_TOKEN: "YOUR_BOT_TOKEN_HERE",
OWNER_ID: 1234567890,  // Get your ID from @userinfobot
```

---

### Step 2: Setup Mandatory Join Channels

You need **4 channels** that users must join:

1. **Telegram Public Channel** — Create a channel, make it public, add your bot as **ADMIN**
2. **Telegram Public Group** — Create a group, make it public, add bot as **ADMIN**
3. **YouTube Channel** — Just your YT channel link
4. **WhatsApp Channel** — Your WA channel/community link

#### Get Chat IDs (very important!)

Add **@getidsbot** to your Telegram channel and group, it will show the ID.

```js
MANDATORY_JOIN: {
  TELEGRAM_CHANNEL: {
    LINK: "https://t.me/yourchannel",
    CHAT_ID: "-1001234567890",  // <-- REQUIRED
    NAME: "Your Channel"
  },
  TELEGRAM_GROUP: {
    LINK: "https://t.me/yourgroup",
    CHAT_ID: "-1001234567891",  // <-- REQUIRED
    NAME: "Your Group"
  },
  YOUTUBE_CHANNEL: {
    LINK: "https://youtube.com/@yourchannel",
    NAME: "Your YouTube"
  },
  WHATSAPP_CHANNEL: {
    LINK: "https://whatsapp.com/channel/yourchannel",
    NAME: "Your WhatsApp"
  }
}
```

> ⚠️ **Bot MUST be admin in your Telegram Channel & Group** — otherwise verification check will fail!

---

### Step 3: Setup Recharge Contact

```js
RECHARGE_CONTACT: {
  WHATSAPP_NUMBER: "+923001234567",
  TELEGRAM_USERNAME: "@yourtelegram"
}
```

---

### Step 4: Install & Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the bot
npm start
```

You should see:
```
🤖 Bot started in POLLING mode (no webhook)
✅ Ready to receive messages...
🚀 Auto-Reaction + Views engine loaded!
```

---

## 🚂 Deploy to Railway (FREE)

Railway gives you free hosting with easy deployment.

### Step 1: Push to GitHub

```bash
# Create a new repo on GitHub, then:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Deploy on Railway

1. Go to **[railway.app](https://railway.app)** and login with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your bot repository
5. Railway will auto-detect Node.js and deploy!

### Step 3: Environment Variables (IMPORTANT!)

In Railway Dashboard → Your Project → Variables:

Add these ONLY if you want to override config.js:
- `BOT_TOKEN` — your Telegram bot token
- `OWNER_ID` — your Telegram numeric ID

But the bot reads from `config.js` directly, so editing the file is easier.

### Step 4: Keep Bot Running

Railway auto-restarts if it crashes. For 24/7 uptime, make sure:
- Your plan allows always-on (Starter plan is enough)
- Or add a credit card for free $5/month usage

### Step 5: Monitor Logs

Railway Dashboard → Your Service → Logs

You can see all bot activity, errors, and deliveries here in real-time.

---

## 📋 Owner Commands

These only work for the `OWNER_ID`:

| Command | Description |
|---------|-------------|
| `/addlimit 123456 500` | Set user 123456 daily limit to 500 |
| `/broadcast` | Start broadcast mode to all users |
| `/ban 123456` | Ban a user |
| `/unban 123456` | Unban a user |

---

## 🔧 How Verification Works (FIXED!)

Old bots used **usernames** which broke easily. This bot uses:

1. **Links** are shown to users (t.me/yourchannel)
2. **Chat IDs** are used internally to check membership via `getChatMember`
3. Bot checks if user is actually in the channel/group
4. YouTube & WhatsApp are just link opens (no API check possible)

**Why verification might still fail?**
- Bot is NOT admin in your channel/group → Add it as admin!
- Chat ID is wrong → Get it from @getidsbot
- Channel is private → Make it public or use exact chat ID

---

## ⚡ How Auto-Reactions Work

1. User adds project with their channel link
2. Bot checks if it's admin in that channel
3. Bot stores: chat ID, emoji pool, reaction count, view count
4. When ANY new post comes to that channel:
   - Bot sends `setMessageReaction` API call
   - Random emojis from pool are applied
5. Stats are saved to JSON

---

## 👁️ About Views

**Important:** Telegram Bot API **CANNOT** directly increase view counts. Views only increase when real users open the post.

This bot has:
- ✅ Full tracking structure for views
- ✅ Stats showing "views delivered"
- ⚠️ Actual view delivery requires **MTProto user accounts** (not Bot API)

To add real views, you need:
1. Telegram API ID & Hash from [my.telegram.org](https://my.telegram.org)
2. A real phone number login (user account, not bot)
3. Use `gramjs` or `telethon` to programmatically "view" posts

The config has a placeholder for this:
```js
MTPROTO_CONFIG: {
  API_ID: 0,
  API_HASH: "",
  PHONE_NUMBER: "",
  STRING_SESSION: ""
}
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Bot is not admin" error | Add bot as admin in user's channel with ALL permissions |
| Verification always fails | Check `CHAT_ID` in config is correct. Use @getidsbot |
| Reactions not sending | Make sure channel is public, or bot is member of private |
| Bot stops on Railway | Check logs, restart service, ensure no duplicate polling |
| "User not found" on `/addlimit` | User must start the bot first before you can set limits |

---

## 📞 Support

If you face issues:
1. Check Railway logs first
2. Verify all chat IDs in config.js
3. Ensure bot is admin in ALL channels it needs to monitor
4. Check that your Bot Token is correct

---

**Made with ❤️ for Telegram Automation**
