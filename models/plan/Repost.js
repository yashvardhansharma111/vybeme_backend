const mongoose = require('mongoose');

const repostSchema = new mongoose.Schema({
  repost_id: {
    type: String,
    required: true,
    unique: true
  },
  original_plan_id: {
    type: String,
    required: true
  },
  repost_author_id: {
    type: String,
    required: true
  },
  added_content: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  cannot_be_reposted: {
    type: Boolean,
    default: true,
    immutable: true
  }
});

repostSchema.index({ original_plan_id: 1 });
repostSchema.index({ repost_author_id: 1 });

module.exports = mongoose.model('Repost', repostSchema);

