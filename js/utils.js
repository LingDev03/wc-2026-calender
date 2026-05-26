import { getCurrentLocale } from "./i18n.js";

const formatterCache = new Map();

export const getLocalTimezoneLabel = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Múi giờ địa phương";

export const getFormatter = (locale, timezone, options) => {
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

export const formatDateTime = (date, timezone) => {
  const formatter = getFormatter(getCurrentLocale(), timezone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return formatter.format(date);
};

export const formatCalendarDate = (date, timezone) => {
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
    formatter.formatToParts(date).map(({ type, value }) => [type, value])
  );
  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
};

export const addDays = (date, days, timezone) => {
  const clone = new Date(date);
  if (timezone === "utc") {
    clone.setUTCDate(clone.getUTCDate() + days);
  } else {
    clone.setDate(clone.getDate() + days);
  }
  return clone;
};

export const getWeekBounds = (date, timezone) => {
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

export const formatGroupTitle = (date, timezone) => {
  const formatter = getFormatter(getCurrentLocale(), timezone, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return formatter.format(date);
};

export const getWeekLabel = (date, timezone) => {
  const { weekStart, weekEnd } = getWeekBounds(date, timezone);
  return `${formatGroupTitle(weekStart, timezone)} - ${formatGroupTitle(weekEnd, timezone)}`;
};

export const escapeIcsText = (value) =>
  String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");

export const downloadFile = (content, fileName, mimeType) => {
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