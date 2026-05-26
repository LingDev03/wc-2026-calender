import { formatCalendarDate, getWeekLabel, formatGroupTitle, escapeIcsText } from "./utils.js";

export const state = {
  matches: [],
  view: "week",
  stage: "all",
  timezone: "local",
};

export const parseMatchDate = (match) => new Date(match.startUtc);

export const loadSchedule = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Không thể tải dữ liệu trận đấu.");
  }
  const data = await response.json();
  const rawMatches = Array.isArray(data) ? data : Array.isArray(data.matches) ? data.matches : [];

  state.matches = rawMatches.map((item) => {
    const id = item.id != null ? String(item.id) : item.uid || item.matchId || "";
    let startUtc = item.startUtc || item.startUTC || null;
    if (!startUtc && item.date && item.time) {
      startUtc = `${item.date}T${item.time}:00+07:00`;
    }

    let homeTeam = "";
    let awayTeam = "";
    if (item.match && typeof item.match === "string") {
      const parts = item.match.split(/\s+vs\s+|\s+VS\s+|\s+Vs\s+/);
      homeTeam = (parts[0] || "").trim();
      awayTeam = (parts[1] || "").trim();
    } else {
      homeTeam = item.homeTeam || item.home || "";
      awayTeam = item.awayTeam || item.away || "";
    }

    return {
      id,
      stage: item.stage || item.stageLabel || "",
      stageLabel: item.stage || item.stageLabel || "",
      group: item.group || null,
      homeTeam,
      awayTeam,
      startUtc,
      durationMinutes: item.durationMinutes ?? item.duration ?? 90,
      stadium: item.stadium || "",
      city: item.city || "",
    };
  });
};

export const getStageLabel = (stage) => {
  if (!stage) return "";
  const cleaned = String(stage).replaceAll("_", " ").trim();
  return cleaned
    .split(/\s+/)
    .map((w) => {
      const lower = w.toLocaleLowerCase("vi");
      return lower.charAt(0).toLocaleUpperCase("vi") + lower.slice(1);
    })
    .join(" ");
};

export const getVisibleMatches = () => {
  const filtered = state.matches.filter((match) => state.stage === "all" || match.stage === state.stage);
  return filtered.sort((left, right) => parseMatchDate(left) - parseMatchDate(right));
};

export const getNextMatch = () => {
  const now = Date.now();
  return (
    state.matches
      .slice()
      .sort((left, right) => parseMatchDate(left) - parseMatchDate(right))
      .find((match) => parseMatchDate(match).getTime() >= now) ?? state.matches[0]
  );
};

export const groupMatches = (matches) => {
  const timezone = state.timezone;
  const grouped = new Map();

  for (const match of matches) {
    const matchDate = parseMatchDate(match);
    const groupKey = state.view === "day"
      ? (timezone === "utc" ? matchDate.toISOString().slice(0, 10) : matchDate.toDateString())
      : getWeekLabel(matchDate, timezone);

    const label = state.view === "day"
      ? formatGroupTitle(matchDate, timezone)
      : getWeekLabel(matchDate, timezone);

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, { label, matches: [] });
    }
    grouped.get(groupKey).matches.push(match);
  }
  return Array.from(grouped.values());
};

export const buildIcs = (matches) => {
  const now = formatCalendarDate(new Date(), "UTC");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:World Cup 2026 Schedule",
    "X-WR-TIMEZONE:Asia/Ho_Chi_Minh",
    "PRODID:-//WC 2026 Schedule//EN",
  ];

  for (const match of matches) {
    const start = new Date(match.startUtc);
    const end = new Date(start.getTime() + match.durationMinutes * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${match.id}@wc2026schedule`,
      `DTSTAMP:${now}Z`,
      // Áp cấu trúc sửa lỗi Google Calendar tránh bị chuyển về GMT+0 bằng đầu tzid
      `DTSTART;TZID=Asia/Ho_Chi_Minh:${formatCalendarDate(start, state.timezone)}`,
      `DTEND;TZID=Asia/Ho_Chi_Minh:${formatCalendarDate(end, state.timezone)}`,
      `SUMMARY:${escapeIcsText(`${match.homeTeam} vs ${match.awayTeam}`)}`,
      `DESCRIPTION:${escapeIcsText(`${match.stageLabel}\n${match.stadium}, ${match.city}`)}`,
      `LOCATION:${escapeIcsText(`${match.stadium}, ${match.city}`)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
};