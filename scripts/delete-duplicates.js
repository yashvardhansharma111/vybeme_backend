require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('../models/other/Notification');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected');

  const groups = await Notification.aggregate([
    {
      $sort: { created_at: 1 }
    },
    {
      $group: {
        _id: {
          user_id: "$user_id",
          type: "$type",
          source_plan_id: "$source_plan_id"
        },
        ids: { $push: "$_id" },
        count: { $sum: 1 }
      }
    },
    {
      $match: { count: { $gt: 1 } }
    }
  ]);

  let deleteIds = [];

  for (const group of groups) {
    const ids = group.ids;

    // keep first (oldest), delete rest
    const toDelete = ids.slice(1);
    deleteIds.push(...toDelete);
  }

  console.log("🧨 Deleting:", deleteIds.length, "duplicates");

  if (deleteIds.length > 0) {
    await Notification.deleteMany({
      _id: { $in: deleteIds }
    });
  }

  console.log("✅ Done");
  process.exit(0);
}

run();