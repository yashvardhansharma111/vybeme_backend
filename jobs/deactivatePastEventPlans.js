/**
 * Deactivates (cancels) business plans whose event start date+time has passed.
 * Uses the same effect as the existing cancel plan API: post_status = 'deleted'.
 * Runs on an interval so that when the start time is reached, the plan is auto-deactivated.
 */

const { BusinessPlan, Registration } = require('../models');
const { createGeneralNotification } = require('../controllers/notificationController');

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
        const plan_id = plan.plan_id;
        const ownerId = plan.user_id;
        const eventTitle = plan.title || 'Event';

        const registeredCount = await Registration.countDocuments({
          plan_id,
          status: { $in: ['pending', 'approved'] }
        });
        const attendedCount = await Registration.countDocuments({
          plan_id,
          checked_in: true
        });

        await BusinessPlan.updateOne(
          { plan_id },
          { $set: { post_status: 'deleted', deleted_at: new Date() } }
        );
        deactivated++;

        if (ownerId) {
          await createGeneralNotification(ownerId, 'event_ended', {
            source_plan_id: plan_id,
            source_user_id: 'system',
            payload: {
              event_title: eventTitle,
              cta_type: 'go_to_event',
              notification_text: `${eventTitle} has ended`
            }
          });
          await createGeneralNotification(ownerId, 'event_ended_registered', {
            source_plan_id: plan_id,
            source_user_id: 'system',
            payload: {
              event_title: eventTitle,
              cta_type: 'go_to_analytics',
              registered_count: registeredCount,
              notification_text: `${registeredCount} people registered for ${eventTitle}`
            }
          });
          await createGeneralNotification(ownerId, 'event_ended_attended', {
            source_plan_id: plan_id,
            source_user_id: 'system',
            payload: {
              event_title: eventTitle,
              cta_type: 'go_to_analytics',
              scanned_count: attendedCount,
              notification_text: `${attendedCount} people attended ${eventTitle}`
            }
          });
        }

        // Notify registrants (regular users): Event ended -> Go to Chat
        const registrations = await Registration.find({
          plan_id,
          status: { $in: ['pending', 'approved'] }
        })
          .select('user_id')
          .lean();
        const groupId = plan.group_id || null;
        for (const reg of registrations) {
          if (reg.user_id && reg.user_id !== ownerId) {
            await createGeneralNotification(reg.user_id, 'event_ended', {
              source_plan_id: plan_id,
              source_user_id: 'system',
              payload: {
                event_title: eventTitle,
                cta_type: 'go_to_chat',
                notification_text: `${eventTitle} has ended`,
                group_id: groupId
              }
            });
          }
        }
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
