# LifeApp

A minimalist, mobile-first "super app" for organizing your life. Pick the small apps you need from the Library and they appear as widgets on your Home.

Everything is stored **only on your device** (localStorage). There are no accounts, no servers and no network requests. The font (Geist) is bundled with the app.

## Apps

| App | What it does |
| --- | --- |
| **Tasks** | Today / Upcoming / Someday / Done, due dates, important flag, overdue highlighting |
| **Habits** | Daily check-off, 7-day backfill grid, streaks, icon per habit |
| **Water** | Quick add 150/250/500 ml or custom, goal ring, weekly chart |
| **Caffeine** | Drink presets, live "mg in your system" (5h half-life), decay curve, sleep-safe time, daily limit |
| **Sleep** | Bed/wake log with quality, 7-night chart, sleep debt, late-caffeine warning |
| **Focus** | Pomodoro 25/5/15 that keeps running app-wide, notification + chime when done |
| **Mood** | 5-point check-in with optional note, 5-week calendar, journal |
| **Notes** | Pinned + searchable notes, autosave |
| **Money** | Expenses by category, monthly budget with what is left, currency choice, 7-day chart |
| **Workouts** | Nine workout types, weekly minutes goal ring, history |
| **Reading** | Reading now / want to read / finished shelves, page progress, pages per day |
| **Weight** | Daily weigh-ins in kg or lb, trend chart, 7- and 30-day change, optional goal |
| **Countdowns** | Days until trips, birthdays and deadlines; yearly events roll over |
| **Breathe** | Guided box, 4-7-8 and calm breathing with an animated circle; mindful minutes |

## Experience

- **Home is a launcher**: your apps appear as icons (with badges for tasks due and habits left). Tap one and it opens full screen, zooming out of its icon with a short splash. Press and hold an icon for its options.
- **Inside an app** the tab bar goes away. The pill in the top right has **•••** (about the app, add or remove it from Home) and **✕** (close, zooming back into the icon). Sub-pages like the note editor get a back arrow.
- **Library**: every app, with a detail page to open it or add it to Home.
- **Onboarding** on first launch: welcome, name, choose apps, theme and goals. You can replay it from Settings.
- Neutral glass surfaces, light and dark themes, haptic feedback on Android, undo for every delete, in-app confirmation dialogs.
- Installable as a PWA and works offline (production build).

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN for phone testing)
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## GitHub Pages

A workflow at `.github/workflows/deploy-pages.yml` deploys `dist/` to GitHub Pages on each push to `main`.
If your Pages site is blank, make sure in GitHub repository settings:

- **Pages → Build and deployment → Source** is set to **GitHub Actions**.
- The latest workflow run succeeded.
- If you previously used the `gh-pages` branch or `/docs`, clear old settings and let the workflow manage deployments.


## Structure

```
src/
  lib/          store (persistent useStore), router, dates, settings, feedback (haptics/toasts/dialogs), install, notify
  components/   ui.tsx (Page, AppIcon, Ring, Bars, Sheet, Stepper, …), AppWindow.tsx (full-screen app container),
                AppDetail.tsx (about/add sheet), Overlays.tsx (toasts + dialog)
  modules/      one file per app exporting a Screen; meta.ts holds name/icon/color/description; badges.ts icon badges
  pages/        Home, Library, Settings, Onboarding
```

### Adding an app

1. Add an entry to `modules/meta.ts` (name, icon, color, tagline, description, features).
2. Create `modules/MyThing.tsx` exporting `MyThingScreen`, wrapped in `<Page meta={META.mything}>` (it gets the app header and close pill automatically). Optionally add a badge hook in `modules/badges.ts`.
3. Persist data with `useStore('mything', fallback)`.
4. Register it in `modules/registry.ts`. It shows up in the Library and can be added to Home.

Design rules: no emoji, no gradients, no blue/violet hues. Use Lucide icons and the existing tokens in `styles.css`.
