const matchesUrl = new URL("./data/matches.json", import.meta.url);
const scheduleList = document.getElementById("scheduleList");
const scheduleTitle = document.getElementById("scheduleTitle");
const matchesShown = document.getElementById("matchesShown");
const nextFixture = document.getElementById("nextFixture");
const activeTimezone = document.getElementById("activeTimezone");
const scheduleMeta = document.getElementById("scheduleMeta");
const stageFilter = document.getElementById("stageFilter");
const timezoneSelect = document.getElementById("timezoneSelect");
const downloadAllButton = document.getElementById("downloadAllButton");
const subscribeCalendarButton = document.getElementById("subscribeCalendarButton");
const googleCalendarLink = document.getElementById("googleCalendarLink");
const langSelect = document.getElementById("langSelect");
const viewButtons = Array.from(document.querySelectorAll("[data-view]"));
const template = document.getElementById("matchCardTemplate");
const calendarIcsUrl = new URL("./calendar.ics", window.location.href).href;
const googleCalendarAddByUrl = `https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=${encodeURIComponent(calendarIcsUrl)}`;
let subscribeCalendarButtonLabel = subscribeCalendarButton.textContent;

const STRINGS = {
  en: {
    noMatches: "No matches match the current filter.",
    noFixtures: "No fixtures loaded",
    copied: "Copied!",
    weekView: "Week",
    dayView: "Day",
    timesShownPrefix: "Times are shown in",
    downloadAll: "Download .ics",
    copyUrl: "Copy calendar URL",
    addByUrl: "Add by URL to Google Calendar",
    localTimezoneLabel: "Local timezone",
    "hero.eyebrow": "FIFA World Cup 2026",
    "hero.title": "View schedule and export",
    "hero.lead": "Browse the match schedule by day or week, then export the full calendar as <span>.ics</span> or add it to Google Calendar by URL.",
    "guide.download.title": "Download .ics",
    "guide.download.desc": "Use to download the full calendar file and import into any calendar app.",
    "guide.copy.title": "Copy calendar URL",
    "guide.copy.desc": "Copy the share URL for the calendar and paste it into another app or service.",
    "guide.add.title": "Add by URL to Google Calendar",
    "guide.add.desc": "Open Google Calendar and subscribe using the share URL.",
    "toolbar.filter": "Filter by stage",
    "toolbar.timezone": "Timezone",
    "toolbar.lang": "Language",
    "option.all": "All",
    "option.local": "Local timezone",
    "summary.timezone": "Active timezone",
    "summary.matches": "Matches shown",
    "summary.next": "Next match",
    "schedule.eyebrow": "Match schedule",
  },
  vi: {
    noMatches: "Không có trận nào phù hợp bộ lọc.",
    noFixtures: "Chưa có trận đấu",
    copied: "Đã sao chép!",
    weekView: "Xem tuần",
    dayView: "Xem ngày",
    timesShownPrefix: "Thời gian được hiển thị theo",
    downloadAll: "Tải toàn bộ .ics",
    copyUrl: "Sao chép URL lịch",
    addByUrl: "Thêm bằng URL vào Google Calendar",
    localTimezoneLabel: "Múi giờ địa phương",
    "hero.eyebrow": "FIFA World Cup 2026",
    "hero.title": "Xem lịch và xuất lịch",
    "hero.lead": "Duyệt lịch thi đấu theo ngày hoặc tuần, sau đó xuất toàn bộ lịch dưới dạng <span>.ics</span> hoặc thêm vào Google Calendar bằng URL.",
    "guide.download.title": "Tải toàn bộ .ics",
    "guide.download.desc": "Dùng để tải file lịch đầy đủ và nhập vào ứng dụng lịch bất kỳ.",
    "guide.copy.title": "Sao chép URL lịch",
    "guide.copy.desc": "Dùng để sao chép đường dẫn lịch chia sẻ và dán vào ứng dụng khác.",
    "guide.add.title": "Thêm bằng URL vào Google Calendar",
    "guide.add.desc": "Mở Google Calendar và đăng ký lịch bằng URL chia sẻ.",
    "toolbar.filter": "Lọc theo vòng đấu",
    "toolbar.timezone": "Múi giờ",
    "toolbar.lang": "Ngôn ngữ",
    "option.all": "Tất cả",
    "option.local": "Múi giờ địa phương",
    "summary.timezone": "Múi giờ đang dùng",
    "summary.matches": "Số trận hiển thị",
    "summary.next": "Trận tiếp theo",
    "schedule.eyebrow": "Lịch thi đấu",
  },
};

const getStoredLang = () => localStorage.getItem("wc_lang");
// Default site language: Vietnamese
let lang = getStoredLang() || "vi";

const t = (key) => (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;

const getCurrentLocale = () => (lang === "vi" ? "vi-VN" : "en-US");

const applyLanguage = () => {
  // static labels
  downloadAllButton.textContent = t("downloadAll");
  subscribeCalendarButton.textContent = t("copyUrl");
  googleCalendarLink.textContent = t("addByUrl");
  subscribeCalendarButtonLabel = subscribeCalendarButton.textContent;
  // translate DOM nodes with data-i18n attributes
  translateDom();
  // update controls that depend on locale
  updateControls();
  // set document language attribute
  try {
    document.documentElement.lang = lang === "vi" ? "vi" : "en";
  } catch {}
};

const translateDom = () => {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    const value = t(key);
    // allow simple HTML in translations (e.g., <span>.ics</span>)
    el.innerHTML = value;
  });

  document.querySelectorAll("[data-i18n-btn]").forEach((el) => {
    const key = el.dataset.i18nBtn;
    if (key === "view.week") el.textContent = t("weekView");
    else if (key === "view.day") el.textContent = t("dayView");
  });
};

const state = {
  matches: [],
  view: "week",
  stage: "all",
  timezone: "local",
};

const formatterCache = new Map();

const loadSchedule = async () => {
  const response = await fetch(matchesUrl);
  if (!response.ok) {
    throw new Error("Không thể tải dữ liệu trận đấu.");
  }
  const data = await response.json();
  const rawMatches = Array.isArray(data)
    ? data
    : Array.isArray(data.matches)
    ? data.matches
    : [];

  state.matches = rawMatches.map((item) => {
    // Normalize fields from the provided JSON schema
    const id = item.id != null ? String(item.id) : item.uid || item.matchId || "";

    // Combine date + time into UTC ISO if startUtc not present
    let startUtc = item.startUtc || item.startUTC || null;
    if (!startUtc && item.date && item.time) {
      // Treat provided date/time as UTC timestamps (preserve previous behavior)
      // Example: date="2026-06-12", time="02:00" -> "2026-06-12T02:00:00Z"
      startUtc = `${item.date}T${item.time}:00Z`;
    }

    // Split `match` like "Home vs Away" into teams
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

const getStageLabel = (stage) => {
  if (!stage) return "";
  // replace underscores and normalize spaces
  const cleaned = String(stage).replaceAll("_", " ").trim();
  // Title-case each word using locale-aware casing for Vietnamese
  return cleaned
    .split(/\s+/)
    .map((w) => {
      const lower = w.toLocaleLowerCase("vi");
      return lower.charAt(0).toLocaleUpperCase("vi") + lower.slice(1);
    })
    .join(" ");
};

const getLocalTimezoneLabel = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Múi giờ địa phương";

const getFormatter = (locale, timezone, options) => {
  const normalizedTimezone = String(timezone).toLowerCase();
  const cacheKey = JSON.stringify({ locale, timezone, options });
  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(
      cacheKey,
      new Intl.DateTimeFormat(locale, {
        timeZone: normalizedTimezone === "utc" ? "UTC" : undefined,
        ...options,
      }),
    );
  }
  return formatterCache.get(cacheKey);
};

const formatDateTime = (date, timezone) => {
  const formatter = getFormatter(getCurrentLocale(), timezone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return formatter.format(date);
};

const formatCalendarDate = (date, timezone) => {
  const formatter = getFormatter("en-GB", timezone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );

  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
};

const parseMatchDate = (match) => new Date(match.startUtc);

const addDays = (date, days, timezone) => {
  const clone = new Date(date);
  if (timezone === "utc") {
    clone.setUTCDate(clone.getUTCDate() + days);
  } else {
    clone.setDate(clone.getDate() + days);
  }
  return clone;
};

const getWeekBounds = (date, timezone) => {
  const clone = new Date(date);
  const dayIndex = timezone === "utc" ? clone.getUTCDay() : clone.getDay();
  const weekStart = new Date(clone);
  const offset = timezone === "utc" ? clone.getUTCDate() - ((dayIndex + 6) % 7) : clone.getDate() - ((dayIndex + 6) % 7);

  if (timezone === "utc") {
    weekStart.setUTCDate(offset);
    weekStart.setUTCHours(0, 0, 0, 0);
  } else {
    weekStart.setDate(offset);
    weekStart.setHours(0, 0, 0, 0);
  }

  const weekEnd = addDays(weekStart, 6, timezone);
  if (timezone === "utc") {
    weekEnd.setUTCHours(23, 59, 59, 999);
  } else {
    weekEnd.setHours(23, 59, 59, 999);
  }

  return { weekStart, weekEnd };
};

const formatGroupTitle = (date, timezone) => {
  const formatter = getFormatter(getCurrentLocale(), timezone, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return formatter.format(date);
};

const getWeekLabel = (date, timezone) => {
  const { weekStart, weekEnd } = getWeekBounds(date, timezone);
  return `${formatGroupTitle(weekStart, timezone)} - ${formatGroupTitle(weekEnd, timezone)}`;
};

const escapeIcsText = (value) =>
  String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");

const buildIcs = (matches) => {
  const now = formatCalendarDate(new Date(), "UTC");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//WC 2026 Schedule//EN",
  ];

  for (const match of matches) {
    const start = new Date(match.startUtc);
    const end = new Date(start.getTime() + match.durationMinutes * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${match.id}@wc2026schedule`,
      `DTSTAMP:${now}Z`,
      `DTSTART:${formatCalendarDate(start, "UTC")}Z`,
      `DTEND:${formatCalendarDate(end, "UTC")}Z`,
      `SUMMARY:${escapeIcsText(`${match.homeTeam} vs ${match.awayTeam}`)}`,
      `DESCRIPTION:${escapeIcsText(`${match.stageLabel}\n${match.stadium}, ${match.city}`)}`,
      `LOCATION:${escapeIcsText(`${match.stadium}, ${match.city}`)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
};

const getAllMatches = () => state.matches.slice().sort((left, right) => parseMatchDate(left) - parseMatchDate(right));

const downloadFullSchedule = () => {
  const ics = buildIcs(getAllMatches());
  downloadFile(ics, "wc-2026-full-schedule.ics", "text/calendar;charset=utf-8");
};

const downloadFile = (content, fileName, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const getNextMatch = () => {
  const now = Date.now();
  return (
    state.matches
      .slice()
      .sort((left, right) => parseMatchDate(left) - parseMatchDate(right))
      .find((match) => parseMatchDate(match).getTime() >= now) ?? state.matches[0]
  );
};

const getVisibleMatches = () => {
  const filtered = state.matches.filter((match) => state.stage === "all" || match.stage === state.stage);
  return filtered.sort((left, right) => parseMatchDate(left) - parseMatchDate(right));
};

const groupMatches = (matches) => {
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

const renderMatchCard = (match) => {
  const clone = template.content.cloneNode(true);
  const card = clone.querySelector(".match-card");
  const title = clone.querySelector(".match-title");
  const stage = clone.querySelector(".match-stage");
  const id = clone.querySelector(".match-id");
  const time = clone.querySelector(".match-time");
  const location = clone.querySelector(".match-location");

  const startDate = parseMatchDate(match);
  const timezoneLabel = state.timezone === "utc" ? "UTC" : getLocalTimezoneLabel();

  title.textContent = `${match.homeTeam} vs ${match.awayTeam}`;
  stage.textContent = match.stageLabel;
  id.textContent = match.id;
  time.textContent = `${formatDateTime(startDate, state.timezone)} (${timezoneLabel})`;
  location.textContent = `${match.stadium}, ${match.city}`;

  return card;
};

const renderSchedule = () => {
  const visibleMatches = getVisibleMatches();
  matchesShown.textContent = String(visibleMatches.length);
  const nextMatch = getNextMatch();
  nextFixture.textContent = nextMatch
    ? `${nextMatch.homeTeam} vs ${nextMatch.awayTeam}`
    : t("noFixtures");

  scheduleList.innerHTML = "";

  if (visibleMatches.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = t("noMatches");
    scheduleList.append(emptyState);
    return;
  }

  const groups = groupMatches(visibleMatches);
  for (const group of groups) {
    const groupEl = document.createElement("section");
    groupEl.className = "schedule-group";

    const header = document.createElement("header");
    header.className = "schedule-group__header";

    const title = document.createElement("h3");
    title.className = "schedule-group__title";
    title.textContent = group.label;

    const meta = document.createElement("p");
    meta.className = "schedule-group__meta";
    meta.textContent = `${group.matches.length} trận`;

    header.append(title, meta);

    const list = document.createElement("div");
    list.className = "schedule-group__matches";
    for (const match of group.matches) {
      list.append(renderMatchCard(match));
    }

    groupEl.append(header, list);
    scheduleList.append(groupEl);
  }
};

const updateControls = () => {
  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
    // update view button labels to current language
    button.textContent = button.dataset.view === "week" ? t("weekView") : t("dayView");
  });
  const timezoneLabel = state.timezone === "utc" ? "UTC" : getLocalTimezoneLabel();
  activeTimezone.textContent = timezoneLabel;
  scheduleTitle.textContent = state.view === "week" ? t("weekView") : t("dayView");
  scheduleMeta.textContent = `${t("timesShownPrefix")} ${timezoneLabel}.`;
  googleCalendarLink.href = googleCalendarAddByUrl;
};

const copyCalendarUrl = async () => {
  try {
    await navigator.clipboard.writeText(calendarIcsUrl);
    subscribeCalendarButton.textContent = t("copied");
  } catch {
    const fallbackField = document.createElement("input");
    fallbackField.value = calendarIcsUrl;
    document.body.append(fallbackField);
    fallbackField.select();
    document.execCommand("copy");
    fallbackField.remove();
    subscribeCalendarButton.textContent = t("copied");
  }

  window.setTimeout(() => {
    subscribeCalendarButton.textContent = subscribeCalendarButtonLabel;
  }, 1200);
};

const populateStageFilter = () => {
  const stages = Array.from(new Set(state.matches.map((match) => match.stage))).sort();
  for (const stage of stages) {
    const option = document.createElement("option");
    option.value = stage;
    option.textContent = getStageLabel(stage);
    stageFilter.append(option);
  }
};

const bindEvents = () => {
  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      updateControls();
      renderSchedule();
    });
  });

  stageFilter.addEventListener("change", () => {
    state.stage = stageFilter.value;
    renderSchedule();
  });

  timezoneSelect.addEventListener("change", () => {
    state.timezone = timezoneSelect.value;
    updateControls();
    renderSchedule();
  });

  if (langSelect) {
    langSelect.addEventListener("change", () => {
      lang = langSelect.value;
      localStorage.setItem("wc_lang", lang);
      applyLanguage();
      renderSchedule();
    });
  }

  downloadAllButton.addEventListener("click", () => {
    downloadFullSchedule();
  });

  subscribeCalendarButton.addEventListener("click", () => {
    copyCalendarUrl();
  });
};

const init = async () => {
  await loadSchedule();
  populateStageFilter();
  bindEvents();
  if (langSelect) {
    langSelect.value = lang;
  }
  applyLanguage();
  renderSchedule();
};

init().catch((error) => {
  scheduleList.innerHTML = `<div class="empty-state">${error.message}</div>`;
  console.error(error);
});
