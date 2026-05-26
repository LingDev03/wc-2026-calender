import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const defaultInputPath = path.resolve(root, "data/matches.json");
const defaultOutputPath = path.resolve(root, "calendar.ics");

const parseCliPath = (value, fallback) => path.resolve(process.cwd(), value ?? fallback);

const escapeIcsText = (value) =>
  String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");

const formatUtcDate = (date) => {
  const iso = new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return iso;
};

const formatStamp = (date) => formatUtcDate(date).replace(/Z$/, "");

const normalizeMatches = (parsed) => {
  const matches = Array.isArray(parsed) ? parsed : parsed?.matches;

  if (!Array.isArray(matches)) {
    throw new Error("Input JSON must be an array or contain a top-level 'matches' array.");
  }

  return matches;
};

const normalizeMatchItem = (item) => {
  const id = item.id != null ? String(item.id) : item.uid || item.matchId || "";

  let startUtc = item.startUtc || item.startUTC || null;
  if (!startUtc && item.date && item.time) {
    // assume date and time are already in UTC
    startUtc = `${item.date}T${item.time}:00Z`;
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
    homeTeam,
    awayTeam,
    stageLabel: item.stageLabel || item.stage || "",
    stadium: item.stadium || "",
    city: item.city || "",
    startUtc,
    durationMinutes: Number.isFinite(item.durationMinutes) ? item.durationMinutes : Number.isFinite(item.duration) ? item.duration : 90,
  };
};

const validateMatch = (match, index) => {
  const requiredStrings = ["id", "homeTeam", "awayTeam", "stageLabel", "stadium", "city", "startUtc"];

  for (const key of requiredStrings) {
    if (typeof match?.[key] !== "string" || match[key].trim() === "") {
      throw new Error(`Match ${index + 1} is missing a valid '${key}' value.`);
    }
  }

  if (!Number.isFinite(match?.durationMinutes) || match.durationMinutes <= 0) {
    throw new Error(`Match ${index + 1} has an invalid 'durationMinutes' value.`);
  }

  const start = new Date(match.startUtc);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`Match ${index + 1} has an invalid 'startUtc' value.`);
  }
};

const loadMatches = async (inputPath) => {
  const raw = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  const matches = normalizeMatches(parsed).map(normalizeMatchItem);

  matches.forEach(validateMatch);

  return matches.slice().sort((left, right) => new Date(left.startUtc) - new Date(right.startUtc));
};

const createCalendar = (matches) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:WC 2026 Schedule",
    "X-WR-TIMEZONE:UTC",
    "PRODID:-//WC 2026 Schedule//EN",
  ];

  const now = formatStamp(new Date());

  for (const match of matches) {
    const start = new Date(match.startUtc);
    const end = new Date(start.getTime() + match.durationMinutes * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${match.id}@wc2026schedule`,
      `DTSTAMP:${now}Z`,
      `DTSTART:${formatUtcDate(start)}`,
      `DTEND:${formatUtcDate(end)}`,
      `SUMMARY:${escapeIcsText(`${match.homeTeam} vs ${match.awayTeam}`)}`,
      `DESCRIPTION:${escapeIcsText(`${match.stageLabel}\n${match.stadium}, ${match.city}`)}`,
      `LOCATION:${escapeIcsText(`${match.stadium}, ${match.city}`)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
};

const run = async () => {
  const [inputArg, outputArg] = process.argv.slice(2);
  const inputPath = parseCliPath(inputArg, defaultInputPath);
  const outputPath = parseCliPath(outputArg, defaultOutputPath);
  const matches = await loadMatches(inputPath);
  const ics = createCalendar(matches);
  await writeFile(outputPath, ics, "utf8");
  console.log(`Wrote ${path.basename(outputPath)} with ${matches.length} matches.`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});