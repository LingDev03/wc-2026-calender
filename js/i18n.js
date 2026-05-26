export const STRINGS = {
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

export let currentLang = localStorage.getItem("wc_lang") || "vi";

export const setLang = (newLang) => {
  currentLang = newLang;
  localStorage.setItem("wc_lang", newLang);
};

export const t = (key) => (STRINGS[currentLang] && STRINGS[currentLang][key]) || STRINGS.en[key] || key;

export const getCurrentLocale = () => (currentLang === "vi" ? "vi-VN" : "en-US");

export const translateDom = () => {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    el.innerHTML = t(key);
  });

  document.querySelectorAll("[data-i18n-btn]").forEach((el) => {
    const key = el.dataset.i18nBtn;
    if (key === "view.week") el.textContent = t("weekView");
    else if (key === "view.day") el.textContent = t("dayView");
  });
};