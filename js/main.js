import { t, currentLang as lang, setLang, translateDom } from "./i18n.js";
import { getLocalTimezoneLabel, formatDateTime, downloadFile } from "./utils.js";
import { state, loadSchedule, getVisibleMatches, getNextMatch, groupMatches, buildIcs, getStageLabel, parseMatchDate } from "./state.js";

// DOM References
const matchesUrl = "data/matches.json";
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
const githubRawUrl = "https://raw.githubusercontent.com/lingdev03/wc-2026-calender/main/calendar.ics";
const cleanUrlForGoogle = "cdn.jsdelivr.net/gh/lingdev03/wc-2026-calender@main/calendar.ics";
const googleCalendarAddByUrl = `https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=${cleanUrlForGoogle}`;
let subscribeCalendarButtonLabel = "";

const applyLanguage = () => {
  downloadAllButton.textContent = t("downloadAll");
  subscribeCalendarButton.textContent = t("copyUrl");
  googleCalendarLink.textContent = t("addByUrl");
  subscribeCalendarButtonLabel = subscribeCalendarButton.textContent;
  
  translateDom();
  updateControls();
  try {
    document.documentElement.lang = lang === "vi" ? "vi" : "en";
  } catch {}
};

const updateControls = () => {
  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
    button.textContent = button.dataset.view === "week" ? t("weekView") : t("dayView");
  });
  const timezoneLabel = state.timezone === "utc" ? "UTC" : getLocalTimezoneLabel();
  activeTimezone.textContent = timezoneLabel;
  scheduleTitle.textContent = state.view === "week" ? t("weekView") : t("dayView");
  scheduleMeta.textContent = `${t("timesShownPrefix")} ${timezoneLabel}.`;
  googleCalendarLink.href = googleCalendarAddByUrl;
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
      setLang(langSelect.value);
      applyLanguage();
      renderSchedule();
    });
  }

  downloadAllButton.addEventListener("click", () => {
    const allMatches = state.matches.slice().sort((left, right) => parseMatchDate(left) - parseMatchDate(right));
    const icsContent = buildIcs(allMatches);
    downloadFile(icsContent, "wc-2026-full-schedule.ics", "text/calendar;charset=utf-8");
  });

  subscribeCalendarButton.addEventListener("click", () => {
    copyCalendarUrl();
  });
};

const init = async () => {
  await loadSchedule(matchesUrl);
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