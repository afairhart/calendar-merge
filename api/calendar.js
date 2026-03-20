// api/calendar.js
// Fetches multiple ICS calendar feeds and merges them into one.
//
// Configure your source calendars in Vercel env vars:
//   CALENDAR_URL_1, CALENDAR_URL_2, CALENDAR_URL_3, ...
//
// Optional:
//   SECRET_TOKEN  — require ?token=xxx in the URL for privacy
//   SHOW_DETAILS  — set to "false" to anonymize events as "Busy" (default: show real titles)
//   CAL_NAME      — calendar name shown in apps (default: "Merged Calendar")

const ANONYMIZE = process.env.SHOW_DETAILS === 'false';

const ANON_KEEP = new Set(['BEGIN', 'END', 'UID', 'DURATION', 'STATUS', 'TRANSP']);
const FULL_STRIP = new Set(['ORGANIZER', 'ATTENDEE', 'ATTACH', 'X-GOOGLE-CONFERENCE']);

function processEvent(vevent) {
  // Unfold continuation lines (RFC 5545 §3.1)
  const unfolded = vevent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/).filter(Boolean);
  const out = [];

  for (const line of lines) {
    const prop = line.split(/[:;]/)[0].toUpperCase();
    if (ANONYMIZE) {
      if (ANON_KEEP.has(prop) || prop === 'DTSTART' || prop === 'DTEND') {
        out.push(line);
      }
    } else {
      if (!FULL_STRIP.has(prop)) {
        out.push(line);
      }
    }
  }

  if (ANONYMIZE) {
    const beginIdx = out.findIndex(l => l === 'BEGIN:VEVENT');
    if (beginIdx !== -1) out.splice(beginIdx + 1, 0, 'SUMMARY:Busy');
  }

  return out.join('\r\n');
}

module.exports = async function handler(req, res) {
  // Optional token check for privacy
  const secret = process.env.SECRET_TOKEN;
  if (secret && req.query.token !== secret) {
    res.status(401).send('Unauthorized');
    return;
  }

  // Collect source calendar URLs from env vars
  const sources = [
    process.env.CALENDAR_URL_1,
    process.env.CALENDAR_URL_2,
    process.env.CALENDAR_URL_3,
    process.env.CALENDAR_URL_4,
    process.env.CALENDAR_URL_5,
  ].filter(Boolean);

  if (sources.length === 0) {
    res.status(500).send('No calendar sources configured. Set CALENDAR_URL_1 etc. in Vercel env vars.');
    return;
  }

  // Fetch all calendars in parallel
  const results = await Promise.allSettled(
    sources.map(url =>
      fetch(url, { headers: { 'User-Agent': 'CalendarMerge/1.0' } })
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
          return r.text();
        })
    )
  );

  const timezones = new Map(); // tzid -> VTIMEZONE block (deduplicated)
  const events = [];

  for (const result of results) {
    if (result.status !== 'fulfilled') {
      console.error('Failed to fetch calendar:', result.reason?.message);
      continue;
    }

    const ics = result.value;

    // Extract VTIMEZONE blocks
    for (const m of ics.matchAll(/BEGIN:VTIMEZONE[\s\S]*?END:VTIMEZONE/g)) {
      const tzidMatch = m[0].match(/TZID:([^\r\n]+)/);
      if (tzidMatch && !timezones.has(tzidMatch[1].trim())) {
        timezones.set(tzidMatch[1].trim(), m[0]);
      }
    }

    // Extract and process VEVENT blocks
    for (const m of ics.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)) {
      events.push(processEvent(m[0]));
    }
  }

  const calName = process.env.CAL_NAME || 'Merged Calendar';

  const output = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//calendar-merge//EN',
    `X-WR-CALNAME:${calName}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...Array.from(timezones.values()),
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="merged.ics"');
  res.setHeader('Cache-Control', 'public, max-age=300'); // Cache 5 minutes
  res.send(output);
};
