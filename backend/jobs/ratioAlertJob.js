import { runRatioAlertsForAllUsers } from '../services/ratioService.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_HOUR = 13;
const DEFAULT_MINUTE =21;

let isSchedulerStarted = false;

const getDailyRunTime = () => {
  const hour = Number(process.env.RATIO_ALERT_HOUR ?? DEFAULT_HOUR);
  const minute = Number(process.env.RATIO_ALERT_MINUTE ?? DEFAULT_MINUTE);

  const safeHour = Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_HOUR;
  const safeMinute = Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : DEFAULT_MINUTE;

  return { hour: safeHour, minute: safeMinute };
};

const getNextRunAt = (hour, minute) => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
};

const runRatioAlerts = async () => {
  try {
    const startedAt = new Date();
    const result = await runRatioAlertsForAllUsers();
    console.log(
      `[ratio-alert-job] Completed at ${startedAt.toISOString()} | usersChecked=${result.usersChecked} alertsSent=${result.alertsSent}`,
    );
  } catch (error) {
    console.error('[ratio-alert-job] Failed to process ratio alerts:', error.message);
  }
};

export const startRatioAlertScheduler = () => {
  if (isSchedulerStarted) return;
  isSchedulerStarted = true;

  const { hour, minute } = getDailyRunTime();
  const nextRunAt = getNextRunAt(hour, minute);
  const initialDelay = nextRunAt.getTime() - Date.now();

  console.log(
    `[ratio-alert-job] Scheduler started. Daily run at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (server local time). Next run: ${nextRunAt.toISOString()}`,
  );

  setTimeout(() => {
    runRatioAlerts();
    setInterval(runRatioAlerts, DAY_IN_MS);
  }, initialDelay);
};
