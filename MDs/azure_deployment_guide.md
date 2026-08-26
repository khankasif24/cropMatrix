# ☁️ Microsoft Azure Deployment Guide — Smart Crop Advisory

> **Full step-by-step guide** to deploy the FastAPI backend + React (Vite) frontend on Azure.

---

## 📋 Prerequisites

Before you begin, make sure you have:

| # | Requirement | Where to get it |
|---|------------|-----------------|
| 1 | **Azure Account** (Free tier works) | [portal.azure.com](https://portal.azure.com/) → Sign up |
| 2 | **GitHub Account** with your repo pushed | [github.com](https://github.com/) |
| 3 | **Supabase Project** (already set up) | [supabase.com](https://supabase.com/) → Your project dashboard |
| 4 | **API Keys ready** (listed below) | See Section 0 |

---

## 🔑 Section 0 — Gather All Your API Keys First

Before touching Azure, collect **every key** you will need. Open a notepad and paste them all in.

### Backend API Keys (for Azure App Service)

| Variable Name | Value / Where to Find | Required? |
|---|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → **Project URL** | ✅ Yes |
| `SUPABASE_KEY` | Supabase Dashboard → Settings → API → **service_role (secret)** key | ✅ Yes |
| `JWT_SECRET` | Any strong random string (e.g. `smartcrop-sih25010-secret-key-2026`) | ✅ Yes |
| `IPSTACK_API_KEY` | [ipstack.com](https://ipstack.com/) → Sign up → Dashboard → **Your API Access Key** | ✅ Yes |
| `OPENWEATHERMAP_API_KEY` | [openweathermap.org/api](https://openweathermap.org/api) → Sign up → API Keys tab | ✅ Yes |
| `BREVO_API_KEY` | [brevo.com](https://www.brevo.com/) → Settings → SMTP & API → API Keys → **Generate** | ⚠️ Optional |
| `BREVO_SENDER_EMAIL` | The email you verified in Brevo (e.g. `smartcrop.alerts@gmail.com`) | ⚠️ Optional |
| `BREVO_SENDER_NAME` | Display name for emails (e.g. `SmartCrop Advisory`) | ⚠️ Optional |
| `SKLEARN_ALLOW_DEPRECATED_SKLEARN_PACKAGE_INSTALL` | Always set to `True` | ✅ Yes |

### Frontend API Keys (for Azure Static Web Apps)

| Variable Name | Value / Where to Find | Required? |
|---|---|---|
| `VITE_API_URL` | Will be your backend URL: `https://<your-app-name>.azurewebsites.net/api` | ✅ Yes |
| `VITE_GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Create API Key | ✅ Yes |
| `VITE_SUPABASE_URL` | Same Supabase URL as backend | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → **anon (public)** key | ✅ Yes |

> [!TIP]
> Save all these keys in a secure notepad. You'll paste them into Azure in the steps below.

---

## 🏗️ Part 1 — Deploy the Backend (Azure App Service)

We use **Azure App Service (Linux)** to host the FastAPI Python backend.

---

### Step 1.1 — Log in to Azure Portal

1. Open your browser and go to **[portal.azure.com](https://portal.azure.com/)**
2. Sign in with your Microsoft account
3. You'll land on the **Azure Portal Home** page

---

### Step 1.2 — Create a Resource Group

A Resource Group is a folder that holds all your Azure resources together.

1. In the Azure Portal, click the **search bar** at the top
2. Type `Resource groups` and click it
3. Click **➕ Create**
4. Fill in:
   - **Subscription**: Select your subscription (usually "Azure for Students" or "Pay-As-You-Go")
   - **Resource group name**: `smartcrop-rg`
   - **Region**: `Central India` (or the region closest to your users)
5. Click **Review + create** → then **Create**

---

### Step 1.3 — Create the Web App (App Service)

1. Click the **search bar** at the top → type `App Services` → click it
2. Click **➕ Create** → select **Web App**
3. Fill in the **Basics** tab:

   | Field | Value |
   |-------|-------|
   | Subscription | Your subscription |
   | Resource Group | `smartcrop-rg` |
   | **Name** | `smartcrop-api` *(must be globally unique — if taken, try `smartcrop-api-sih` etc.)* |
   | Publish | **Code** |
   | Runtime stack | **Python 3.11** |
   | Operating System | **Linux** |
   | Region | **Central India** |

4. Under **Pricing plan**:
   - Click **Create new** or **Change size**
   - Select **Basic B1** ($13.14/month) — has 1.75 GB RAM
   
   > [!WARNING]
   > Do NOT use the **Free F1** plan for this app. TensorFlow Lite + scikit-learn + pandas need ~1 GB RAM at startup. F1 only provides 1 GB and will crash.

5. Click **Next: Deployment** (skip Database, we use Supabase)
6. On the **Deployment** tab:
   - Enable **GitHub Actions** deployment: **Yes**
   - Click **Authorize** to connect your GitHub account
   - Select:
     - **Organization**: Your GitHub username
     - **Repository**: Your repo name (e.g., `SIH25010` or `smart-crop-advisory`)
     - **Branch**: `main`
7. Click **Review + create** → then **Create**
8. ⏳ Wait 1-2 minutes for deployment to complete
9. Click **Go to resource** when it's ready

---

### Step 1.4 — Set the Startup Command

Azure needs to know how to start your Python app.

1. In your App Service (`smartcrop-api`), click **Configuration** in the left sidebar (under *Settings*)
2. Click the **General settings** tab
3. Find the **Startup Command** field and enter:

   ```
   cd api && pip install -r ../requirements.txt && python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

   > [!NOTE]
   > Azure automatically routes external port 80/443 to your container's port 8000. No additional port config needed.

4. Click **Save** at the top

---

### Step 1.5 — Add Environment Variables (API Keys)

This is where you paste all your backend API keys.

1. Still in **Configuration**, click the **Application settings** tab
2. Click **➕ New application setting** for each of these:

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | `https://bnrjhdojbsivjvkwzkcu.supabase.co` *(your Supabase project URL)* |
   | `SUPABASE_KEY` | *(your Supabase **service_role** secret key)* |
   | `JWT_SECRET` | `smartcrop-sih25010-secret-key-2026` |
   | `IPSTACK_API_KEY` | *(your ipstack API key)* |
   | `OPENWEATHERMAP_API_KEY` | *(your OpenWeatherMap API key)* |
   | `BREVO_API_KEY` | *(your Brevo/Sendinblue API key)* |
   | `BREVO_SENDER_EMAIL` | `smartcrop.alerts@gmail.com` |
   | `BREVO_SENDER_NAME` | `SmartCrop Advisory` |
   | `SKLEARN_ALLOW_DEPRECATED_SKLEARN_PACKAGE_INSTALL` | `True` |
   | `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |

   > [!IMPORTANT]
   > For each setting, type the **Name** in the first box and the **Value** in the second box. Then click **OK**.

3. After adding ALL settings, click **Save** at the top
4. Azure will ask you to confirm — click **Continue**

---

### Step 1.6 — Fix the GitHub Actions Workflow

Azure auto-generates a GitHub Actions file, but it defaults to the repo root. Since your backend code is in the `api/` folder, you need to fix it.

1. Go to your GitHub repository
2. Navigate to `.github/workflows/` — you'll see a file like `main_smartcrop-api.yml`
3. Edit the file and make sure the **build** section looks like this:

```yaml
name: Build and deploy Python app to Azure Web App - smartcrop-api

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true   # ← Important! Pulls ML model files via Git LFS

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      # Zip the ENTIRE repo (api/ needs access to datasets/ and latest_model/)
      - name: Zip artifact for deployment
        run: zip -r release.zip . -x ".git/*" "apps/*" "node_modules/*" "__pycache__/*"

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: python-app
          path: release.zip

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: 'Production'
      url: ${{ steps.deploy-to-webapp.outputs.webapp-url }}

    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: python-app

      - name: Unzip artifact
        run: unzip release.zip

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: 'smartcrop-api'
          slot-name: 'Production'
          publish-profile: ${{ secrets.AZUREAPPSERVICE_PUBLISHPROFILE }}
```

4. Commit this change. The workflow will automatically trigger and deploy.

---

### Step 1.7 — Verify Backend Deployment

1. Go back to the Azure Portal → App Services → `smartcrop-api`
2. Click **Overview** to see the URL (e.g., `https://smartcrop-api.azurewebsites.net`)
3. Open in your browser: `https://smartcrop-api.azurewebsites.net/api/health`
   - If you see `{"status":"ok"}` or similar — 🎉 Backend is live!
4. If it shows an error, go to **Log stream** in the left sidebar to see real-time logs

> [!TIP]
> The first startup can take 2-5 minutes while Python installs packages and loads ML models.

---

## 🌐 Part 2 — Deploy the Frontend (Azure Static Web Apps)

We use **Azure Static Web Apps** — it's free, fast, and built for React/Vite apps.

---

### Step 2.1 — Create a Static Web App

1. In the Azure Portal, click the **search bar** → type `Static Web Apps` → click it
2. Click **➕ Create**
3. Fill in the **Basics** tab:

   | Field | Value |
   |-------|-------|
   | Subscription | Your subscription |
   | Resource Group | `smartcrop-rg` |
   | **Name** | `smartcrop-web` |
   | Plan type | **Free** |
   | Region | **Central India** (or closest) |

4. Under **Deployment details**:
   - **Source**: **GitHub**
   - Click **Sign in with GitHub** and authorize
   - Select:
     - **Organization**: Your GitHub username
     - **Repository**: Your repo
     - **Branch**: `main`

5. Under **Build Details**:

   | Field | Value |
   |-------|-------|
   | Build Presets | **Custom** |
   | App location | `apps/web` |
   | Api location | *(leave blank)* |
   | Output location | `dist` |

6. Click **Review + create** → then **Create**
7. ⏳ Wait for deployment

---

### Step 2.2 — Add Frontend Environment Variables

Static Web Apps need environment variables set **before** the build so Vite can inject them.

#### Method A — Via Azure Portal (Recommended)

1. Go to your Static Web App resource (`smartcrop-web`)
2. Click **Environment variables** in the left sidebar (under *Settings*)
3. Make sure you're on the **Production** environment tab
4. Click **➕ Add** for each:

   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `https://smartcrop-api.azurewebsites.net/api` |
   | `VITE_GEMINI_API_KEY` | *(your Google Gemini API key)* |
   | `VITE_SUPABASE_URL` | `https://bnrjhdojbsivjvkwzkcu.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | *(your Supabase **anon/public** key)* |

5. Click **Save** / **Apply**

#### Method B — Via GitHub Secrets (Alternative)

If the Azure Portal method doesn't work:

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** for each:
   - `VITE_API_URL` = `https://smartcrop-api.azurewebsites.net/api`
   - `VITE_GEMINI_API_KEY` = *(your key)*
   - `VITE_SUPABASE_URL` = *(your URL)*
   - `VITE_SUPABASE_ANON_KEY` = *(your key)*
3. Then edit the auto-generated `.github/workflows/azure-static-web-apps-*.yml` file and add env vars to the build step:

```yaml
      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "apps/web"
          output_location: "dist"
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

---

### Step 2.3 — Add SPA Routing Config

React Router needs all routes to fall back to `index.html`.

Create a file at `apps/web/staticwebapp.config.json`:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif}", "/css/*"]
  }
}
```

Commit and push this file to GitHub.

---

### Step 2.4 — Re-trigger Build (If First Build Failed)

If the first build ran before you added the environment variables:

1. Go to GitHub → **Actions** tab
2. Click the latest failed workflow run
3. Click **Re-run all jobs**
4. Wait for it to complete ✅

---

### Step 2.5 — Verify Frontend Deployment

1. Go to Azure Portal → Static Web Apps → `smartcrop-web`
2. Copy the **URL** shown in the Overview (e.g., `https://lively-bush-0ab12345.azurestaticapps.net`)
3. Open it in your browser — you should see the Smart Crop Advisory landing page 🎉

---

## 🔗 Part 3 — Connect Backend CORS

Your backend needs to allow requests from the frontend domain.

1. Open your `api/main.py` file
2. Find the CORS middleware section and add your Azure frontend URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://lively-bush-0ab12345.azurestaticapps.net",  # ← Add your actual URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

3. Or, for easier management, use `allow_origins=["*"]` (allows all origins — less secure but simpler for demos)
4. Commit and push — Azure will auto-redeploy the backend

---

## 🔧 Part 4 — Troubleshooting

### Backend won't start / shows "Application Error"

| Check | Fix |
|-------|-----|
| Open **Log stream** in sidebar | Read the error message |
| `ModuleNotFoundError` | Ensure `requirements.txt` is in the repo root |
| Memory errors | Upgrade from F1 → **B1** pricing plan |
| Port issues | Ensure startup command uses `--port 8000` |
| Missing env vars | Go to Configuration → Application settings → verify all keys |

### Frontend shows blank page

| Check | Fix |
|-------|-----|
| Open browser DevTools (F12) → Console | Check for JS errors |
| API calls failing (CORS) | Add frontend URL to backend CORS list |
| `VITE_API_URL` undefined | Re-add env vars and re-run GitHub Actions |
| Routing broken (404 on refresh) | Add `staticwebapp.config.json` (Step 2.3) |

### How to check GitHub Actions logs

1. Go to your GitHub repo → **Actions** tab
2. Click the latest workflow run
3. Click on the job name → expand each step to see logs
4. Red ❌ = failed step — read the error message

---

## 💰 Part 5 — Cost Overview

| Service | Plan | Cost |
|---------|------|------|
| App Service (Backend) | Basic B1 | ~$13/month |
| Static Web Apps (Frontend) | Free | $0/month |
| Supabase (Database) | Free tier | $0/month |
| **Total** | | **~$13/month** |

> [!TIP]
> Azure for Students gives you **$100 free credits** — enough for ~7 months of B1.

---

## ✅ Final Checklist

- [ ] Azure App Service created with Python 3.11 runtime
- [ ] Startup command set correctly
- [ ] All 9 backend env vars added
- [ ] GitHub Actions workflow updated for `api/` folder + Git LFS
- [ ] Backend API responding at `/api/health`
- [ ] Azure Static Web App created
- [ ] All 4 frontend env vars added
- [ ] `staticwebapp.config.json` added for SPA routing
- [ ] Frontend loading correctly
- [ ] Backend CORS updated with frontend URL
- [ ] Login / Signup working
- [ ] Crop recommendation working
- [ ] Weather data loading

---

## 🔗 Quick Reference — Your Live URLs

| Service | URL |
|---------|-----|
| Backend API | `https://smartcrop-api.azurewebsites.net` |
| API Health Check | `https://smartcrop-api.azurewebsites.net/api/health` |
| Frontend | `https://<generated-name>.azurestaticapps.net` |
| Supabase Dashboard | `https://supabase.com/dashboard/project/bnrjhdojbsivjvkwzkcu` |
