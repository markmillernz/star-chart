# Quinn & Trixie's Star Chart ✨

A mobile-first reward chart for tracking daily good behavior. Built with vanilla JavaScript, no frameworks required.

**Theme:** Princess + Chess + Rainbows
**Goal:** Earn 60 total stars to unlock the pink gymnastics bar!
**Domain:** accretio.com

## Features

- 📱 Mobile-first responsive design
- ☁️ Cloud sync via Supabase (multi-device support)
- 💾 Automatic localStorage fallback when offline
- 🎉 Celebration animations at milestones
- 🔊 Interactive sound effects (Web Audio API)
- 🌈 Original Princess + Chess + Rainbow theme
- ⭐ Each child can earn max 1 star per day
- 🕐 Timezone-aware (America/Los_Angeles)

---

## Quick Start (Local Development)

### 1. Clone/Download Files

You should have these files:
```
├── index.html
├── styles.css
├── app.js
├── supabase.js
├── confetti.js
└── README.md
```

### 2. Run Locally

```bash
# Navigate to the project directory
cd QATSC

# Start a local server (choose one):
python3 -m http.server 8000
# OR
python -m SimpleHTTPServer 8000
# OR
npx serve

# Open browser to:
# http://localhost:8000
```

The app will run in **localStorage mode** initially (offline-only). Follow the Supabase setup below to enable cloud sync.

---

## Supabase Setup (Cloud Sync)

Your Supabase credentials are already configured in `index.html`:
- **Project URL:** `https://rvzsggmowpftgqudjzrs.supabase.co`
- **Anon Key:** `sb_publishable_jFANzjXtVsrv1jDPwnravA_LQ9PISpo`

### Step 1: Create Database Table

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your project: `rvzsggmowpftgqudjzrs`
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Paste this SQL and click **Run**:

```sql
-- Create star_events table
CREATE TABLE star_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  child TEXT NOT NULL CHECK (child IN ('quinn', 'trixie')),
  local_date DATE NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_star_events_date ON star_events(local_date);
CREATE INDEX idx_star_events_child ON star_events(child);
```

### Step 2: Enable Row Level Security (RLS)

This allows **public read/write access** to the `star_events` table (no authentication needed).

In the same SQL Editor, run:

```sql
-- Enable RLS on the table
ALTER TABLE star_events ENABLE ROW LEVEL SECURITY;

-- Allow public SELECT (read)
CREATE POLICY "Allow public read access"
ON star_events FOR SELECT
USING (true);

-- Allow public INSERT (add stars)
CREATE POLICY "Allow public insert access"
ON star_events FOR INSERT
WITH CHECK (true);

-- Allow public DELETE (remove stars)
CREATE POLICY "Allow public delete access"
ON star_events FOR DELETE
USING (true);
```

### Step 3: Verify Configuration

1. Open your local dev site (http://localhost:8000)
2. You should see a banner: "☁️ Connected to Supabase - Syncing across devices"
3. Add a star and check the **Table Editor** in Supabase to confirm the row appears

---

## Deployment (Cloudflare Pages)

### Option 1: Deploy via Dashboard

1. Go to [https://dash.cloudflare.com/](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **Create a project**
3. Connect your Git repository (or use direct upload)
4. **Build settings:**
   - Build command: *(leave empty)*
   - Build output directory: `/`
5. **Environment variables:** *(none needed - credentials in HTML)*
6. Click **Save and Deploy**

### Option 2: Deploy via CLI

```bash
# Install Wrangler (Cloudflare CLI)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler pages deploy . --project-name=star-chart
```

### Custom Domain (accretio.com)

1. In Cloudflare Pages, go to your project settings
2. Navigate to **Custom domains**
3. Click **Set up a custom domain**
4. Enter: `accretio.com` (or `www.accretio.com`)
5. Follow the DNS configuration steps:
   - Add a `CNAME` record pointing to your Pages URL
   - OR if using root domain, add `A` and `AAAA` records
6. SSL/HTTPS is automatic via Cloudflare

**DNS Records Example:**
```
Type: CNAME
Name: @ (or www)
Content: star-chart.pages.dev
Proxy status: Proxied (orange cloud)
```

---

## Alternative Deployment (Netlify)

1. Go to [https://app.netlify.com/](https://app.netlify.com/)
2. Click **Add new site** → **Deploy manually**
3. Drag and drop all files (or connect Git repo)
4. **Build settings:**
   - Build command: *(leave empty)*
   - Publish directory: `/`
5. **Custom domain:**
   - Site settings → Domain management → Add custom domain
   - Follow DNS instructions (similar to Cloudflare)

---

## How It Works

### Data Storage (Event Sourcing)

Stars are stored as individual events in the `star_events` table:

| id | created_at | child | local_date |
|----|-----------|-------|-----------|
| 1  | 2026-02-07 09:00:00 | quinn | 2026-02-07 |
| 2  | 2026-02-07 09:15:00 | trixie | 2026-02-07 |
| 3  | 2026-02-08 10:30:00 | quinn | 2026-02-08 |

- **Total stars:** Count of all rows
- **Today's stars:** Rows where `local_date = today` (per child)
- **Grid display:** Events ordered by `created_at`

### Daily Constraint

Each child can earn **at most 1 star per day**. The day is determined using the **America/Los_Angeles** timezone.

Implementation:
```javascript
const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});
const today = formatter.format(new Date()); // YYYY-MM-DD
```

### Fallback Mode

If Supabase is not configured or unreachable:
- App automatically falls back to **localStorage**
- Same UI and functionality
- Data only persists on the current device
- Banner shows: "💾 Running in offline mode"

### Realtime Sync

The app polls Supabase every 15 seconds to check for changes. If you add a star on one device, it will appear on another device within ~15 seconds.

---

## Milestone Celebrations

- **Row completions:** Every 6 stars (6, 12, 18, ..., 54) triggers a small confetti burst
- **Final completion (60 stars):** Big celebration modal with:
  - Full-screen confetti
  - "YOU DID IT! 🎉" message
  - "You earned the pink gymnastics bar!"
  - Celebratory sound sequence

---

## Testing Multi-Device Sync

1. Open the deployed site on **Device A** (e.g., phone)
2. Open the same URL on **Device B** (e.g., desktop)
3. Add a star on Device A
4. Within ~15 seconds, the star should appear on Device B
5. Try toggling stars on both devices to verify sync

---

## Reset Chart

To reset the chart (for testing or starting fresh):

1. Scroll to the bottom of the page
2. Click **Reset Chart**
3. Type **RESET** in the confirmation dialog
4. Click **Reset All Stars**

This deletes all stars from both Supabase and localStorage.

---

## Troubleshooting

### Supabase connection fails

1. Verify your credentials in `index.html` (lines 10-13):
   ```javascript
   SUPABASE_URL: 'https://rvzsggmowpftgqudjzrs.supabase.co',
   SUPABASE_ANON_KEY: 'sb_publishable_jFANzjXtVsrv1jDPwnravA_LQ9PISpo'
   ```

2. Check the browser console (F12) for error messages

3. Verify the table exists in Supabase **Table Editor**

4. Verify RLS policies are enabled (see Supabase Setup above)

### Stars don't sync across devices

1. Ensure both devices are using the **deployed URL** (not localhost)
2. Wait ~15 seconds for the polling interval
3. Check that Supabase mode is active (banner should say "☁️ Connected to Supabase")
4. Open browser dev tools and check the Network tab for Supabase API calls

### Sound effects not playing

- Some browsers require user interaction before playing audio
- Check browser console for Audio API errors
- Try clicking a star toggle first to "activate" audio context

---

## Technical Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript (ES modules)
- **Backend:** Supabase (PostgreSQL + REST API)
- **Hosting:** Static site (Cloudflare Pages / Netlify)
- **Dependencies:** None (Supabase client loaded from CDN)

---

## Browser Support

- ✅ Modern mobile browsers (iOS Safari, Chrome, Firefox)
- ✅ Desktop browsers (Chrome, Firefox, Safari, Edge)
- ⚠️ IE11 not supported (requires ES6 modules)

---

## License

This is a personal project for Quinn and Trixie. Feel free to adapt for your own family! 🌈

---

## Support

If you encounter issues:
1. Check the browser console (F12) for errors
2. Verify Supabase table and policies are configured
3. Try localStorage fallback mode first (disconnect Supabase to test)
4. Check that the site is served over HTTPS in production

---

**Built with ❤️ for Quinn & Trixie** 🌟👑♟️🌈
