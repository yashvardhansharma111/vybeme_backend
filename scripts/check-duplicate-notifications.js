require('dotenv').config();
const mongoose = require('mongoose');

const Notification = require('../models/other/Notification'); // adjust path if needed

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const duplicates = await Notification.aggregate([
      {
        $group: {
          _id: {
            user_id: "$user_id",
            type: "$type",
            source_plan_id: "$source_plan_id"
          },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
          notifications: { $push: "$notification_id" },
          created: { $push: "$created_at" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    if (duplicates.length === 0) {
      console.log('🎉 No duplicates found');
      process.exit(0);
    }

    console.log(`🚨 Found ${duplicates.length} duplicate groups\n`);

    let totalDuplicates = 0;

    duplicates.forEach((group, index) => {
      const { user_id, type, source_plan_id } = group._id;

      console.log(`\n#${index + 1}`);
      console.log('----------------------------------------');
      console.log('User:', user_id);
      console.log('Type:', type);
      console.log('Plan:', source_plan_id);
      console.log('Count:', group.count);

      console.log('Notification IDs:', group.notifications);
      console.log('Mongo IDs:', group.ids);

      // Oldest = keep
      const sorted = group.ids
        .map((id, i) => ({
          id,
          created: new Date(group.created[i])
        }))
        .sort((a, b) => a.created - b.created);

      console.log('👉 KEEP:', sorted[0].id);
      console.log('❌ DELETE:', sorted.slice(1).map(x => x.id));

      totalDuplicates += (group.count - 1);
    });

    console.log('\n----------------------------------------');
    console.log(`🔥 Total duplicate rows: ${totalDuplicates}`);
    console.log('----------------------------------------\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

run();