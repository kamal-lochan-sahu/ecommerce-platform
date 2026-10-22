// "Aaj" aur "is mahine" ka matlab store ke timezone mein hona chahiye, server (UTC) ke nahi.
// India mein UTC se din 5:30 ghante pehle badalta hai: UTC par "aaj" 5:30am IST par reset hota
// tha, aur raat 12 se 5:30 ke beech ke orders pichle din/mahine mein gine jaate the.
//
// White-label: har client apna timezone env STORE_TIMEZONE se de sakta hai.
export const STORE_TIMEZONE = process.env.STORE_TIMEZONE || 'Asia/Kolkata';

// tz mein us pal par UTC se kitne milliseconds aage hai
export const tzOffsetMs = (date, tz = STORE_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const wallClockAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return wallClockAsUtc - (date.getTime() - date.getMilliseconds());
};

export const startOfDayInTz = (date = new Date(), tz = STORE_TIMEZONE) => {
  const offset = tzOffsetMs(date, tz);
  const local = new Date(date.getTime() + offset);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset);
};

export const endOfDayInTz = (date = new Date(), tz = STORE_TIMEZONE) =>
  new Date(startOfDayInTz(date, tz).getTime() + 24 * 60 * 60 * 1000 - 1);

// monthsBack = 0 -> is mahine ki 1 tareekh, 5 -> 5 mahine pehle ki 1 tareekh
export const startOfMonthInTz = (date = new Date(), monthsBack = 0, tz = STORE_TIMEZONE) => {
  const offset = tzOffsetMs(date, tz);
  const local = new Date(date.getTime() + offset);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - monthsBack, 1) - offset);
};

// N din pehle (aaj ko milakar N din ki window shuru hone ka waqt)
export const startOfDaysAgoInTz = (days, date = new Date(), tz = STORE_TIMEZONE) =>
  new Date(startOfDayInTz(date, tz).getTime() - days * 24 * 60 * 60 * 1000);
