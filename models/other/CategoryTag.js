const mongoose = require('mongoose');

const subTagSchema = new mongoose.Schema({
  sub_tag_id: {
    type: String,
    required: true
  },
  sub_tag_name: {
    type: String,
    required: true
  }
}, { _id: false });

const categoryTagSchema = new mongoose.Schema({
  tag_id: {
    type: String,
    required: true,
    unique: true
  },
  tag_name: {
    type: String,
    required: true
  },
  sub_tags: {
    type: [subTagSchema],
    default: []
  }
});

module.exports = mongoose.model('CategoryTag', categoryTagSchema);

