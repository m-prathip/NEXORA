const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  blockUser,
  unblockUser,
  getBlockedUsers
} = require('../controllers/blockController');

router.use(protect);

router.get('/', getBlockedUsers);
router.post('/:userId', blockUser);
router.delete('/:userId', unblockUser);

module.exports = router;
