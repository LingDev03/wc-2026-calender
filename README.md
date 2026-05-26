# WC 2026 Schedule

A static GitHub Pages site for browsing the FIFA World Cup 2026 schedule and exporting fixtures to Google Calendar.

## Features

- Day and week schedule views.
- Stage filtering.
- Timezone-aware display.
- Downloadable `.ics` export for Google Calendar import.
- A shareable `calendar.ics` URL for subscription-style calendar apps.
- A Google Calendar add-by-URL link for the full schedule.

## Local preview

Run `npm run dev` and open `http://localhost:4173`.

## Updating the schedule

Edit [`data/matches.json`](data/matches.json) to add or update fixtures. Each match should include:

- `id`
- `stage`
- `stageLabel`
- `homeTeam`
- `awayTeam`
- `stadium`
- `city`
- `startUtc`
- `durationMinutes`

Times should stay in UTC so the browser can render the user’s local timezone correctly.

If you change the data, regenerate the shared calendar file with:

```bash
npm run generate:ics
```

That updates [`calendar.ics`](calendar.ics), which is the stable URL you can subscribe to.

You can also pass optional input and output paths if you want to convert a different JSON file.

If you prefer Google Calendar, use the "Add by URL in Google Calendar" button on the page.

## GitHub Pages deployment

This repository is currently set up as a static site. Publish the repository root with GitHub Pages or attach a GitHub Actions workflow later if you want automated deployment.
