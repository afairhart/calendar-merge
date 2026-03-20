// api/calendar.js
// Fetches multiple ICS calendar feeds and merges them into one.
// Events are anonymized — only shows "Busy" blocks, no details.
//
// Configure your source calendars in Vercel env vars:
//   CALENDAR_URL_1, CALENDAR_URL_2, CALENDAR_URL_3
//
// Optional: set SECRET_TOKEN to require ?token=xxx in the URL
// so only people you share the link with can access it.

const KEEP_PROPS = new Set(['BEGIN', 'END', 'UID', 'DURATION', 'STATUS', 'TRANSP']);

function sanitizeEvent(vevent) {
  // Unfold continuation lines (RFC 5545 §3.1)
  const unfolded = vevent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/).filter(Boolean);
  const out = [];

  for (const line of lines) {
    // Property name is everything before the first : or ;
    const prop = line.split(/[:;]/)[0].toUpperCase();
    if (KEEP_PROPS.has(prop) || prop === 'DTSTART' || prop === 'DTEND') {
      out.push(line);
    }
  }

  // Insert SUMMARY:Busy right after BEGIN:VEVENT
  const beginIdx = out.findIndex(l => l === 'BEGIN:VEVENT');
  if (beginIdx !== -1) out.splice(beginIdx + 1, 0, 'SUMMARY:Busy');

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

    // Extract and sanitize VEVENT blocks
    for (const m of ics.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)) {
      events.push(sanitizeEvent(m[0]));
    }
  }

  const output = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//calendar-merge//EN',
    'X-WR-CALNAME:Availability',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...Array.from(timezones.values()),
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="availability.ics"');
  res.setHeader('Cache-Control', 'public, max-age=300'); // Cache 5 minutes
  res.send(output);
};
