/**
 * Deactivates (cancels) business plans whose event start date+time has passed.
 * Uses the same effect as the existing cancel plan API: post_status = 'deleted'.
 * Runs on an interval so that when the start time is reached, the plan is auto-deactivated.
 */

const { BusinessPlan } = require('../models');

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Parse a time string (e.g. "12:00 PM") and combine with a date to get event start Date.
 * @param {Date} date - Plan date
 * @param {string} timeStr - Time string like "12:00 PM"
 * @returns {Date|null} Event start datetime or null if invalid
 */
function getEventStartDate(date, timeStr) {
  if (!date || !timeStr || typeof timeStr !== 'string') return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  hours = Math.min(23, Math.max(0, hours));
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Find published business plans whose event start (date + time) is in the past
 * and set post_status to 'deleted' (same as cancel plan API).
 */
async function deactivatePastEventPlans() {
  try {
    const now = new Date();
    const plans = await BusinessPlan.find({
      post_status: 'published',
      date: { $ne: null },
      time: { $exists: true, $ne: null, $ne: '' },
    }).lean();

    let deactivated = 0;
    for (const plan of plans) {
      const eventStart = getEventStartDate(plan.date, plan.time);
      if (!eventStart) continue;
      if (eventStart.getTime() <= now.getTime()) {
        await BusinessPlan.updateOne(
          { plan_id: plan.plan_id },
          { $set: { post_status: 'deleted', deleted_at: new Date() } }
        );
        deactivated++;
      }
    }
    if (deactivated > 0) {
      console.log(`[deactivatePastEventPlans] Deactivated ${deactivated} plan(s) whose event start time had passed.`);
    }
  } catch (err) {
    console.error('[deactivatePastEventPlans] Error:', err.message);
  }
}

let intervalId = null;

function start() {
  if (intervalId) return;
  deactivatePastEventPlans(); // run once on start
  intervalId = setInterval(deactivatePastEventPlans, INTERVAL_MS);
  console.log('[deactivatePastEventPlans] Scheduler started (every 10 minutes).');
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[deactivatePastEventPlans] Scheduler stopped.');
  }
}

module.exports = { start, stop, deactivatePastEventPlans, getEventStartDate };
