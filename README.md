# 🚨 Zwiggy: The Personal Safety App

![Zwiggy](https://img.shields.io/badge/Project-Zwiggy-FC8019?style=for-the-badge&logo=react)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase)

**The Problem:** Traditional safety apps fail because they are obvious. If you are in danger, opening a bright red SOS app can provoke an attacker, and phones are often checked or snatched away. 

**The Solution:** Zwiggy hides in plain sight. On the surface, it looks and functions exactly like a normal food delivery app. But behind a secret PIN, it transforms into a powerful, invisible bodyguard.

---

## 💡 How It Works

1. **The Disguise**: When opened normally, it looks and acts exactly like a food delivery app.
2. **Safety Mode**: Entering the secret PIN (`5678`) on the login screen unlocks the hidden safety features.

**Once unlocked, you can trigger an SOS in 3 ways:**
- 🗣️ **Voice Command**: Say *"help me"* or *"bachao"* to trigger it hands-free.
- 📱 **Triple-Tap**: Tap the Zwiggy logo 3 times.
- 📳 **Shake-to-Escape**: Shake the phone hard to instantly cancel and return to the food menu.

---

## 📐 Architecture Flow

```mermaid
graph TD
    User([User]) -->|Opens App| UI[Food Delivery Interface]
    UI -->|Enters Secret PIN| Safety[Safety Mode Engine]
    Safety -->|Voice / Tap / Shake| SOS{SOS Triggered!}
    
    SOS -->|Grabs Location| GPS[Live GPS Tracking]
    SOS -->|Activates Mic| Audio[Stealth Audio Recording]
    
    GPS --> SMS[Twilio SMS API]
    Audio --> Vault[(Supabase Secure Vault)]
    
    SMS --> Contacts([Emergency Contacts])
    Contacts -.->|Live Map & Replies| UI
```

---

## 🛠️ Tech Stack

<div align="left">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" />
  <br/><br/>
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white" alt="Twilio" />
</div>

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the app locally
npm run dev
```

> **Note**: You must add your Supabase and Twilio keys in a `.env` file for the SOS features to work.
