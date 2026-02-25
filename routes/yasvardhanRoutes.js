const express = require('express');
const router = express.Router();
const yasvardhanAdminController = require('../controllers/yasvardhanAdminController');

// Admin moderation endpoints (admin_key required via query/body or x-admin-key header)
router.get('/reports', yasvardhanAdminController.listReports);
router.patch('/reports/:report_id', yasvardhanAdminController.updateReportStatus);
router.get('/banned-users', yasvardhanAdminController.listBannedUsers);
router.post('/ban/:user_id', yasvardhanAdminController.banUser);
router.post('/unban/:user_id', yasvardhanAdminController.unbanUser);

module.exports = router;
