const express = require('express');
const router = express.Router();
const { categoryController } = require('../controllers');

router.get('/categories', categoryController.getCategories);
router.get('/sub-tags/:tag_id', categoryController.getSubTags);

module.exports = router;

