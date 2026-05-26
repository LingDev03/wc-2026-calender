import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Set up the root directory for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultInputPath = path.resolve(__dirname, "data/matches.json");
const defaultOutputPath = path.resolve(__dirname, "calendar.ics");

const parseCliPath = (value, fallback) => path.resolve(process.cwd(), value ?? fallback);

/**
 * Escapes special characters according to the iCalendar standard (RFC 5545)
 */
const escapeIcsText = (value) =>
  String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");

/**
 * Formats a Date object into a Local Time string: YYYYMMDDTHHMMSS
 * Excludes the 'Z' suffix to prevent Google Calendar from miscalculating the timezone offset
 */
const formatLocalCalendarDate = (dateObj) => {
  const pad = (num) => String(num).padStart(2, "0");
  
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const minutes = pad(dateObj.getMinutes());
  const seconds = pad(dateObj.getSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
};

/**
 * Formats DTSTAMP to standard UTC, which strictly requires the 'Z' suffix
 */
const formatUtcStamp = (date) => {
  return new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
};

/**
 * Normalizes the match list structure retrieved from the JSON file
 */
const normalizeMatches = (parsed) => {
  const matches = Array.isArray(parsed) ? parsed : parsed?.matches;
  if (!Array.isArray(matches)) {
    throw new Error("Input JSON data must be an array or contain a top-level 'matches' array.");
  }
  return matches;
};

/**
 * Maps properties from the JSON file into a standardized object structure
 */
const normalizeMatchItem = (item) => {
  const id = item.id != null ? String(item.id) : item.uid || item.matchId || "";

  // Create an ISO string containing the Vietnam timezone offset (+07:00) so JS initializes the Date object correctly
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
    homeTeam,
    awayTeam,
    stageLabel: item.stage || item.stageLabel || "", // Maps directly to the "stage" key in your JSON
    stadium: item.stadium || "",
    city: item.city || "",
    startUtc,
    durationMinutes: Number.isFinite(item.durationMinutes) ? item.durationMinutes : Number.isFinite(item.duration) ? item.duration : 90,
  };
};

/**
 * Validates the data integrity of each individual match
 */
const validateMatch = (match, index) => {
  const requiredStrings = ["id", "homeTeam", "awayTeam", "stageLabel", "stadium", "city", "startUtc"];

  for (const key of requiredStrings) {
    if (typeof match?.[key] !== "string" || match[key].trim() === "") {
      throw new Error(`Match #${index + 1} is missing or has an invalid '${key}' field format.`);
    }
  }

  if (!Number.isFinite(match?.durationMinutes) || match.durationMinutes <= 0) {
    throw new Error(`Match #${index + 1} has an invalid 'durationMinutes' value.`);
  }

  const start = new Date(match.startUtc);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`Match #${index + 1} contains an invalid 'startUtc' timestamp.`);
  }
};

/**
 * Reads the JSON file and processes the input data array
 */
const loadMatches = async (inputPath) => {
  const raw = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  const matches = normalizeMatches(parsed).map(normalizeMatchItem);

  matches.forEach(validateMatch);

  // Sort matches chronologically by their start time
  return matches.slice().sort((left, right) => new Date(left.startUtc) - new Date(right.startUtc));
};

/**
 * Generates the iCalendar file structure fully compatible with Google Calendar
 */
const createCalendar = (matches) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:World Cup 2026 Schedule", // Automated calendar folder name displayed upon Google Cal import
    "X-WR-TIMEZONE:Asia/Ho_Chi_Minh",       // Hardcodes the specific target timezone for the calendar view
    "PRODID:-//WC 2026 Schedule//EN",
  ];

  const nowUtc = formatUtcStamp(new Date());

  for (const match of matches) {
    const start = new Date(match.startUtc);
    const end = new Date(start.getTime() + match.durationMinutes * 60_000);
    
    lines.push(
      "BEGIN:VEVENT",
      `UID:${match.id}@wc2026schedule`,
      `DTSTAMP:${nowUtc}`, // System creation/modification timestamp (strictly UTC required)
      `DTSTART:${formatLocalCalendarDate(start)}`, // Local match kick-off time (No 'Z' suffix)
      `DTEND:${formatLocalCalendarDate(end)}`,     // Local match completion time (No 'Z' suffix)
      `SUMMARY:${escapeIcsText(`${match.homeTeam} vs ${match.awayTeam}`)}`,
      `DESCRIPTION:${escapeIcsText(`Stage: ${match.stageLabel}\nStadium: ${match.stadium}\nCity: ${match.city}`)}`,
      `LOCATION:${escapeIcsText(`${match.stadium}, ${match.city}`)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
};

/**
 * Main execution thread
 */
const run = async () => {
  const [inputArg, outputArg] = process.argv.slice(2);
  const inputPath = parseCliPath(inputArg, defaultInputPath);
  const outputPath = parseCliPath(outputArg, defaultOutputPath);
  
  const matches = await loadMatches(inputPath);
  const ics = createCalendar(matches);
  
  await writeFile(outputPath, ics, "utf8");
  console.log(`[Success] Exported ${path.basename(outputPath)} containing ${matches.length} matches.`);
};

run().catch((error) => {
  console.error("[System Error]:", error.message);
  process.exitCode = 1;
});

