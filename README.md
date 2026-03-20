# Calendar Merge

A single serverless function that fetches multiple ICS calendar feeds and combines them into one subscription URL.

## Setup (5 minutes)

### 1. Get your ICS URLs

**Google Calendar (personal — private feed):**
1. Calendar Settings → scroll to **Integrate calendar**
2. Copy the **Secret address in iCal format** — looks like:
   `https://calendar.google.com/calendar/ical/you%40gmail.com/private-xxx/basic.ics`

**Google Calendar (shared/public):**
1. Calendar Settings → **Integrate calendar**
2. Copy the **Public address in iCal format** — looks like:
   `https://calendar.google.com/calendar/ical/you%40domain.com/public/basic.ics`

**iCloud (Apple Calendar):**
1. Open [calendar.apple.com](https://calendar.apple.com) in a browser
2. Click the share icon next to a calendar → enable **Public Calendar**
3. Copy the link — change `webcal://` to `https://` before pasting

**Outlook / Exchange:** Settings → View all Outlook settings → Calendar → Shared calendars → Publish a calendar → copy the ICS link

### 2. Deploy to Vercel (free)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo
3. In **Environment Variables**, add:

| Variable | Required | Description |
|---|---|---|
| `CALENDAR_URL_1` | Yes | First ICS feed URL |
| `CALENDAR_URL_2` | No | Second ICS feed URL |
| `CALENDAR_URL_3` | No | Third ICS feed URL |
| `SECRET_TOKEN` | No | Require `?token=xxx` in the URL for privacy |
| `SHOW_DETAILS` | No | Set to `"false"` to anonymize events as "Busy" (default: show real titles) |
| `CAL_NAME` | No | Calendar name shown in apps (default: `"Merged Calendar"`) |

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

**Outlook:** Add calendar → Subscribe from web → paste the URL

---

By default, real event titles and details are included. Set `SHOW_DETAILS=false` to show only **Busy** blocks — useful when sharing availability with others.
