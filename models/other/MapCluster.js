const mongoose = require('mongoose');

const centroidSchema = new mongoose.Schema({
  lat: {
    type: Number,
    required: true
  },
  long: {
    type: Number,
    required: true
  }
}, { _id: false });

const boundingBoxSchema = new mongoose.Schema({
  north: {
    type: Number,
    required: true
  },
  south: {
    type: Number,
    required: true
  },
  east: {
    type: Number,
    required: true
  },
  west: {
    type: Number,
    required: true
  }
}, { _id: false });

const mapClusterSchema = new mongoose.Schema({
  cluster_id: {
    type: String,
    required: true,
    unique: true
  },
  centroid: {
    type: centroidSchema,
    required: true
  },
  bounding_box: {
    type: boundingBoxSchema,
    required: true
  },
  total_posts: {
    type: Number,
    default: 0
  },
  category_main: {
    type: String,
    default: ''
  },
  post_ids: {
    type: [String],
    default: []
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  refreshed_at: {
    type: Date,
    default: Date.now
  }
});

mapClusterSchema.index({ centroid: '2dsphere' });
mapClusterSchema.index({ category_main: 1 });

module.exports = mongoose.model('MapCluster', mapClusterSchema);

