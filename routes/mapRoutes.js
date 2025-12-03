const express = require('express');
const router = express.Router();
const { mapController } = require('../controllers');

router.post('/clusters', mapController.getClusters);
router.post('/area-posts', mapController.getAreaPosts);
router.post('/post-locations', mapController.getPostLocations);

module.exports = router;

