# Calendar Merge

A single serverless function that fetches multiple ICS calendar feeds and combines them into one subscription URL. Events are anonymized — subscribers only see **Busy** blocks, no meeting details.

## Setup (5 minutes)

### 1. Get your ICS URLs

**iCloud (Apple Calendar):**
1. Open [calendar.apple.com](https://calendar.apple.com) in a browser
2. Click the share icon next to a calendar → enable **Public Calendar**
3. Copy the link — it looks like `webcal://p63-caldav.icloud.com/published/2/...`
4. Change `webcal://` to `https://` before pasting below

**Google Calendar:**
1. Calendar Settings → scroll to **Integrate calendar**
2. Copy the **Secret address in iCal format**

**Outlook / Exchange:** Settings → View all Outlook settings → Calendar → Shared calendars → Publish a calendar → copy the ICS link

### 2. Deploy to Vercel (free)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo
3. In **Environment Variables**, add:
   - `CALENDAR_URL_1` = your first ICS URL
   - `CALENDAR_URL_2` = your second ICS URL
   - `CALENDAR_URL_3` = your third ICS URL
   - `SECRET_TOKEN` = any random string (optional, for privacy)
4. Deploy

### 3. Subscribe

Your merged calendar URL will be:
```
https://your-project.vercel.app/api/calendar
# or with token:
https://your-project.vercel.app/api/calendar?token=your-secret
```

**Apple Calendar:** File → New Calendar Subscription → paste the URL

**Google Calendar:** Other calendars (+) → From URL → paste the URL

---

Events from all your calendars will appear as **Busy** — no titles, locations, or descriptions are shared.
