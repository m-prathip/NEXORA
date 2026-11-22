const router = require('express').Router();
const { 
  getConversations, 
  getMessages, 
  sendMessage, 
  startConversation 
} = require('../controllers/messagesController');
const { protect } = require('../middleware/auth');

router.get('/conversations', protect, getConversations);
router.get('/:conversationId', protect, getMessages);
router.post('/', protect, sendMessage);
router.post('/start/:recipientId', protect, startConversation);

module.exports = router;
