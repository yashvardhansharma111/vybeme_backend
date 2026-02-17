const { BusinessPlan, Registration, User } = require('../models');
const { sendSuccess, sendError } = require('../utils');

const REGISTERED_STATUSES = ['pending', 'approved'];

/**
 * Per-event analytics
 * GET /analytics/business/event/:plan_id
 * Auth: required; caller must be event owner (user_id or business_id)
 */
exports.getEventAnalytics = async (req, res) => {
  try {
    const { plan_id } = req.params;
    const caller_id = req.user?.user_id;
    if (!caller_id) {
      return sendError(res, 'Unauthorized', 401);
    }

    const plan = await BusinessPlan.findOne({ plan_id }).lean();
    if (!plan) {
      return sendError(res, 'Event not found', 404);
    }
    const owner_id = plan.user_id || plan.business_id;
    if (owner_id !== caller_id) {
      return sendError(res, 'Only the event organizer can view analytics', 403);
    }

    const registrations = await Registration.find({
      plan_id,
      status: { $in: REGISTERED_STATUSES },
    }).lean();

    const total_registered = registrations.length;
    const checked_in_count = registrations.filter((r) => r.checked_in).length;
    const showup_rate = total_registered > 0 ? checked_in_count / total_registered : 0;

    const revenue = registrations.reduce((sum, r) => sum + (Number(r.price_paid) || 0), 0);

    const user_ids = [...new Set(registrations.map((r) => r.user_id))];
    const registrationCountByUser = await Registration.aggregate([
      { $match: { status: { $in: REGISTERED_STATUSES }, user_id: { $in: user_ids } } },
      { $lookup: { from: 'plans', localField: 'plan_id', foreignField: 'plan_id', as: 'plan' } },
      { $unwind: '$plan' },
      { $match: { $or: [{ 'plan.user_id': owner_id }, { 'plan.business_id': owner_id }] } },
      { $group: { _id: '$user_id', count: { $sum: 1 } } },
    ]);
    const countByUser = Object.fromEntries(registrationCountByUser.map((r) => [r._id, r.count]));
    let first_timers_count = 0;
    let returning_count = 0;
    user_ids.forEach((uid) => {
      const c = countByUser[uid] || 0;
      if (c === 1) first_timers_count += 1;
      else if (c > 1) returning_count += 1;
    });
    const first_timers_percent = total_registered > 0 ? (first_timers_count / total_registered) * 100 : 0;
    const returning_percent = total_registered > 0 ? (returning_count / total_registered) * 100 : 0;

    const userIdsForGender = registrations.map((r) => r.user_id);
    const users = await User.find({ user_id: { $in: userIdsForGender } })
      .select('user_id gender')
      .lean();
    const genderMap = { male: 0, female: 0, other: 0 };
    users.forEach((u) => {
      const g = (u.gender || '').toLowerCase();
      if (g === 'male') genderMap.male += 1;
      else if (g === 'female') genderMap.female += 1;
      else genderMap.other += 1;
    });
    const gender_distribution = {
      male: genderMap.male,
      female: genderMap.female,
      other: genderMap.other,
    };
    const total_gender = genderMap.male + genderMap.female + genderMap.other;
    const gender_distribution_percent = {
      male: total_gender > 0 ? (genderMap.male / total_gender) * 100 : 0,
      female: total_gender > 0 ? (genderMap.female / total_gender) * 100 : 0,
      other: total_gender > 0 ? (genderMap.other / total_gender) * 100 : 0,
    };

    const passes = plan.passes || [];
    const passNameById = passes.reduce((acc, p) => {
      acc[p.pass_id] = p.name || 'Pass';
      return acc;
    }, {});
    const byPass = {};
    registrations.forEach((r) => {
      const pid = r.pass_id || 'unknown';
      byPass[pid] = (byPass[pid] || 0) + 1;
    });
    const ticket_distribution = Object.entries(byPass).map(([pass_id, count]) => ({
      pass_id,
      name: passNameById[pass_id] || (pass_id === 'unknown' ? 'Other' : pass_id),
      count,
      percent: total_registered > 0 ? Math.round((count / total_registered) * 10000) / 100 : 0,
    })).sort((a, b) => b.count - a.count);

    return sendSuccess(res, 'Event analytics retrieved', {
      plan_id,
      title: plan.title,
      registered_count: total_registered,
      checked_in_count,
      showup_rate: Math.round(showup_rate * 100) / 100,
      showup_rate_percent: Math.round(showup_rate * 10000) / 100,
      first_timers_count,
      returning_count,
      first_timers_percent: Math.round(first_timers_percent * 100) / 100,
      returning_percent: Math.round(returning_percent * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
      gender_distribution,
      gender_distribution_percent,
      ticket_distribution,
    });
  } catch (error) {
    console.error('Error in getEventAnalytics:', error);
    return sendError(res, error.message || 'Failed to get event analytics', 500);
  }
};

/**
 * Overall business analytics (e.g. last N months)
 * GET /analytics/business/overall?months=1
 * Auth: required; uses req.user.user_id as business owner
 */
exports.getOverallAnalytics = async (req, res) => {
  try {
    const caller_id = req.user?.user_id;
    if (!caller_id) {
      return sendError(res, 'Unauthorized', 401);
    }
    const months = Math.max(1, Math.min(12, parseInt(req.query.months, 10) || 1));
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const plans = await BusinessPlan.find({
      $or: [{ user_id: caller_id }, { business_id: caller_id }],
      created_at: { $gte: since },
    })
      .select('plan_id title created_at')
      .lean();

    const plan_ids = plans.map((p) => p.plan_id);
    if (plan_ids.length === 0) {
      return sendSuccess(res, 'Overall analytics retrieved', {
        since: since.toISOString(),
        months,
        plan_ids: [],
        events_count: 0,
        registered_count: 0,
        checked_in_count: 0,
        showup_rate: 0,
        showup_rate_percent: 0,
        first_timers_count: 0,
        returning_count: 0,
        first_timers_percent: 0,
        returning_percent: 0,
        revenue: 0,
        gender_distribution: { male: 0, female: 0, other: 0 },
        gender_distribution_percent: { male: 0, female: 0, other: 0 },
        per_event: [],
      });
    }

    const registrations = await Registration.find({
      plan_id: { $in: plan_ids },
      status: { $in: REGISTERED_STATUSES },
    }).lean();

    const total_registered = registrations.length;
    const checked_in_count = registrations.filter((r) => r.checked_in).length;
    const showup_rate = total_registered > 0 ? checked_in_count / total_registered : 0;
    const revenue = registrations.reduce((sum, r) => sum + (Number(r.price_paid) || 0), 0);

    const user_ids = [...new Set(registrations.map((r) => r.user_id))];
    const registrationCountByUser = await Registration.aggregate([
      { $match: { status: { $in: REGISTERED_STATUSES }, user_id: { $in: user_ids } } },
      { $lookup: { from: 'plans', localField: 'plan_id', foreignField: 'plan_id', as: 'plan' } },
      { $unwind: '$plan' },
      { $match: { $or: [{ 'plan.user_id': caller_id }, { 'plan.business_id': caller_id }] } },
      { $group: { _id: '$user_id', count: { $sum: 1 } } },
    ]);
    const countByUser = Object.fromEntries(registrationCountByUser.map((r) => [r._id, r.count]));
    let first_timers_count = 0;
    let returning_count = 0;
    user_ids.forEach((uid) => {
      const c = countByUser[uid] || 0;
      if (c === 1) first_timers_count += 1;
      else if (c > 1) returning_count += 1;
    });
    const first_timers_percent = total_registered > 0 ? (first_timers_count / total_registered) * 100 : 0;
    const returning_percent = total_registered > 0 ? (returning_count / total_registered) * 100 : 0;

    const users = await User.find({ user_id: { $in: user_ids } })
      .select('user_id gender')
      .lean();
    const genderMap = { male: 0, female: 0, other: 0 };
    users.forEach((u) => {
      const g = (u.gender || '').toLowerCase();
      if (g === 'male') genderMap.male += 1;
      else if (g === 'female') genderMap.female += 1;
      else genderMap.other += 1;
    });
    const total_gender = genderMap.male + genderMap.female + genderMap.other;
    const gender_distribution_percent = {
      male: total_gender > 0 ? (genderMap.male / total_gender) * 100 : 0,
      female: total_gender > 0 ? (genderMap.female / total_gender) * 100 : 0,
      other: total_gender > 0 ? (genderMap.other / total_gender) * 100 : 0,
    };

    const per_event = await Promise.all(
      plans.map(async (p) => {
        const regs = registrations.filter((r) => r.plan_id === p.plan_id);
        const reg_count = regs.length;
        const check_in = regs.filter((r) => r.checked_in).length;
        const rev = regs.reduce((s, r) => s + (Number(r.price_paid) || 0), 0);
        return {
          plan_id: p.plan_id,
          title: p.title,
          created_at: p.created_at,
          registered_count: reg_count,
          checked_in_count: check_in,
          showup_rate_percent: reg_count > 0 ? Math.round((check_in / reg_count) * 10000) / 100 : 0,
          revenue: Math.round(rev * 100) / 100,
          media: p.media && Array.isArray(p.media) ? p.media : [],
        };
      })
    );

    return sendSuccess(res, 'Overall analytics retrieved', {
      since: since.toISOString(),
      months,
      plan_ids,
      events_count: plans.length,
      registered_count: total_registered,
      checked_in_count,
      showup_rate: Math.round(showup_rate * 100) / 100,
      showup_rate_percent: Math.round(showup_rate * 10000) / 100,
      first_timers_count,
      returning_count,
      first_timers_percent: Math.round(first_timers_percent * 100) / 100,
      returning_percent: Math.round(returning_percent * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
      gender_distribution: { male: genderMap.male, female: genderMap.female, other: genderMap.other },
      gender_distribution_percent,
      per_event,
    });
  } catch (error) {
    console.error('Error in getOverallAnalytics:', error);
    return sendError(res, error.message || 'Failed to get overall analytics', 500);
  }
};
