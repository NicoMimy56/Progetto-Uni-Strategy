# Uni-Strategy (MVP Webapp)

Starter implementation of your Student OS idea:
- exam planning table
- weighted GPA and credits tracking
- target grade simulator ("what grade do I need?")

## Run Locally

This project now uses a Node backend with SQLite DB.

1. Install dependencies:
   - `npm install`
2. Start server:
   - `npm run dev`
3. Open:
   - `http://localhost:3000`

Data is persisted in `unistrategy.db`.

Translations use [i18next](https://www.i18next.com/) with JSON files in `locales/` (`it.json`, `en.json`). The UMD bundle is served from `/vendor/i18next/i18next.min.js`.

## Current Features

- Add exams with `Subject`, `CFU`, `Grade`, `Exam Date`, `Status`
- Auto days remaining from exam date
- Weighted GPA calculation over completed exams
- Acquired and total credits counters
- What-if simulator for next exam required grade
- Weekly study plan with sessions (day/time/subject)
- SQLite persistence for exams, study sessions, and target GPA

## Formula Logic (Implemented)

- Weighted GPA:
  - `SUM(grade * credits) / SUM(credits)` for completed exams
- Required next grade for target:
  - `(target * (currentCredits + nextCredits) - currentWeightedSum) / nextCredits`

## Suggested Next Step (Phase 1 Integration)

Move the same schema and formulas into Google Sheets:
- `DB_Exams`: `Subject_ID`, `Subject`, `Credits_CFU`, `Grade`, `Exam_Date`, `Status`, `Days_Remaining`
- `DB_Config`: user metadata + Telegram token/chat id

Then connect:
1. Google Sheets as source of truth
2. Glide for mobile UI
3. Apps Script for automation and Telegram reminders

## Immediate Enhancements You Can Ask Me To Build

- Export/import CSV with your exam data
- Honors handling (`30L` => `31` internally)
- Graduation score projection (e.g. scale from /30 to /110)
- Apps Script files: `telegramBot.gs` and `checkDeadlines.gs`
- Full React + API version (Next.js) for deployment
