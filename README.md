# 🚨 Zwiggy: The Personal Safety App

![Zwiggy](https://img.shields.io/badge/Project-Zwiggy-FC8019?style=for-the-badge&logo=react)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase)

**Zwiggy** is a personal safety app cleverly disguised as a typical food delivery service. It allows users in distress to discreetly trigger SOS alerts and record evidence without an aggressor noticing.

---

## 💡 How It Works

1. **The Disguise**: When opened normally, it looks and acts exactly like a food delivery app.
2. **Safety Mode**: Entering the secret PIN (`5678`) on the login screen unlocks the hidden safety features.

**Once unlocked, you can trigger an SOS in 3 ways:**
- 🗣️ **Voice Command**: Say *"help me"* or *"bachao"* to trigger it hands-free.
- 📱 **Triple-Tap**: Tap the Zwiggy logo 3 times.
- 📳 **Shake-to-Escape**: Shake the phone hard to instantly cancel and return to the food menu.

**What happens during an SOS?**
- Instantly grabs your exact GPS location.
- Sends an emergency SMS with a live-tracking link to your trusted contacts.
- Secretly records 60 seconds of audio and saves it safely to a cloud Vault.

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Mobile Wrapper**: Capacitor.js
- **Database & Auth**: Supabase
- **Maps**: React-Leaflet
- **SMS Integration**: Twilio API

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the app locally
npm run dev
```

> **Note**: You must add your Supabase and Twilio keys in a `.env` file for the SOS features to work.
