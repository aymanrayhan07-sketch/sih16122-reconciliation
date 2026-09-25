# 🌐 Permanent Cloud Hosting Guide for SIH26122

This guide explains how to host your SIH26122 AI Construction Reconciliation prototype online **24/7 permanently for free**, so judges or team members can access it at any time from anywhere with zero downtime.

---

## ⚡ Architecture Update: Single-Service Full Stack

To make deployment as easy as possible:
* **FastAPI now serves both the backend API AND the compiled React frontend directly.**
* You only need to host **ONE single web service** instead of managing two separate services!
* Automatic database initialization & realistic seed data are bundled directly.

---

## 🚀 Option 1: Render.com (Recommended - Easiest & 100% Free)

Render provides a generous free tier and automatically builds your repository using the included `Dockerfile` or `render.yaml`.

### Step-by-Step:
1. **Push your code to GitHub**:
   - Go to [github.com/new](https://github.com/new) and create a repository named `sih26122-reconciliation` (Public or Private).
   - Run these commands in your project terminal:
     ```powershell
     cd C:\Users\DELL\.gemini\antigravity\scratch\sih16122-reconciliation
     git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/sih26122-reconciliation.git
     git branch -M main
     git push -u origin main
     ```

2. **Deploy on Render**:
   - Sign up or log into [render.com](https://render.com) (free, sign in with GitHub).
   - Click **New +** → **Web Service**.
   - Select your `sih26122-reconciliation` GitHub repository.
   - Choose:
     - **Runtime / Environment**: `Docker` (or select `render.yaml` blueprint).
     - **Plan**: `Free`.
   - Click **Deploy Web Service**.

3. **Done!**
   - Render will build the container and provide you with a permanent HTTPS link:
     `https://sih26122-reconciliation.onrender.com`

---

## 🤗 Option 2: Hugging Face Spaces (Free Docker, 16 GB RAM)

Hugging Face Spaces is great for AI/ML prototypes because it provides **16 GB RAM for free** and never sleeps during active hackathons.

### Step-by-Step:
1. Create an account at [huggingface.co](https://huggingface.co).
2. Click your profile → **New Space**.
3. Fill in:
   - **Space name**: `sih26122-construction-reconciliation`
   - **License**: `mit`
   - **Space SDK**: Select **Docker** → **Blank**.
4. Clone the space or push your repository:
   ```powershell
   git remote add hf https://huggingface.co/spaces/<YOUR_USERNAME>/sih26122-construction-reconciliation
   git push hf main
   ```
5. Your prototype will be permanently hosted at:
   `https://<YOUR_USERNAME>-sih26122-construction-reconciliation.hf.space`

---

## 🚂 Option 3: Railway.app (Instant 1-Click Deploy)

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select `sih26122-reconciliation`.
4. Railway detects the `Dockerfile` automatically and deploys in 2 minutes with an instant domain!
