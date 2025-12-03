const { CategoryTag } = require('../models');
const { sendSuccess, sendError } = require('../utils');

/**
 * Get all categories
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await CategoryTag.find({});
    return sendSuccess(res, 'Categories retrieved successfully', categories);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get sub-tags for a category
 */
exports.getSubTags = async (req, res) => {
  try {
    const { tag_id } = req.params;
    const category = await CategoryTag.findOne({ tag_id });
    
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    
    return sendSuccess(res, 'Sub-tags retrieved successfully', {
      sub_tags: category.sub_tags
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

