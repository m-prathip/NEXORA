const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Notification = require('../models/Notification');
const BlockedUser = require('../models/BlockedUser');

// @desc   Get user's conversations
// @route  GET /api/messages/conversations
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({ participants: userId })
      .sort('-updatedAt')
      .populate('participants', 'username primaryRole avatar reputationPoints')
      .lean();

    const participantIds = [];
    conversations.forEach(c => {
      c.participants.forEach(p => {
        if (p._id.toString() !== userId.toString()) {
          participantIds.push(p._id);
        }
      });
    });

    const profiles = await Profile.find({ user: { $in: participantIds } }).select('user name profileImage').lean();
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    const formatted = conversations.map(c => {
      const other = c.participants.find(p => p._id.toString() !== userId.toString()) || c.participants[0] || {};
      const prof = profileMap[other._id?.toString()];

      return {
        ...c,
        recipient: {
          ...other,
          name: prof?.name || other.username || 'Builder',
          profileImage: prof?.profileImage || other.avatar || ''
        }
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get messages for a conversation
// @route  GET /api/messages/:conversationId
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Bidirectional block check across conversation participants
    const otherParticipants = conversation.participants.filter(
      p => p.toString() !== userId.toString()
    );
    const hasBlock = await BlockedUser.findOne({
      $or: [
        { user: userId, blockedUser: { $in: otherParticipants } },
        { user: { $in: otherParticipants }, blockedUser: userId }
      ]
    });
    if (hasBlock) {
      return res.status(403).json({ message: 'Messaging is unavailable between blocked accounts' });
    }

    const messages = await Message.find({ conversation: conversationId })
      .sort('createdAt')
      .populate('sender', 'username primaryRole avatar')
      .lean();

    // Mark unread messages as read
    await Message.updateMany(
      { conversation: conversationId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Send a message
// @route  POST /api/messages
const sendMessage = async (req, res) => {
  try {
    const { conversationId, recipientId, content } = req.body;
    const senderId = req.user.id;
    const userId = senderId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }

    let targetConversationId = conversationId;

    // If starting via recipientId or new conversation
    if (!targetConversationId && recipientId) {
      let existing = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [senderId, recipientId] }
      });

      if (!existing) {
        existing = await Conversation.create({
          participants: [senderId, recipientId],
          isGroup: false
        });
      }
      targetConversationId = existing._id;
    }

    const conversation = await Conversation.findOne({
      _id: targetConversationId,
      participants: senderId
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Bidirectional block check across conversation participants
    const otherParticipants = conversation.participants.filter(
      p => p.toString() !== userId.toString()
    );
    const hasBlock = await BlockedUser.findOne({
      $or: [
        { user: userId, blockedUser: { $in: otherParticipants } },
        { user: { $in: otherParticipants }, blockedUser: userId }
      ]
    });
    if (hasBlock) {
      return res.status(403).json({ message: 'Messaging is unavailable between blocked accounts' });
    }

    const message = await Message.create({
      conversation: targetConversationId,
      sender: senderId,
      content: content.trim(),
      readBy: [senderId]
    });

    conversation.lastMessage = {
      text: content.trim().slice(0, 100),
      sender: senderId,
      createdAt: new Date()
    };
    await conversation.save();

    // Notify other participant
    const recipient = conversation.participants.find(p => p.toString() !== senderId.toString());
    if (recipient) {
      await Notification.create({
        recipient,
        sender: senderId,
        type: 'message',
        title: 'New Message',
        message: `${req.user.username}: "${content.slice(0, 45)}..."`,
        link: `/messages/${conversation._id}`
      }).catch(() => {});
    }

    const populated = await Message.findById(message._id)
      .populate('sender', 'username primaryRole avatar')
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Start or find 1:1 conversation with a user
// @route  POST /api/messages/start/:recipientId
const startConversation = async (req, res) => {
  try {
    const senderId = req.user.id;
    const recipientId = req.params.recipientId;

    if (senderId.toString() === recipientId.toString()) {
      return res.status(400).json({ message: 'Cannot start conversation with yourself' });
    }

    // Bidirectional block check
    const isBlocked = await BlockedUser.findOne({
      $or: [
        { user: senderId, blockedUser: recipientId },
        { user: recipientId, blockedUser: senderId }
      ]
    });
    if (isBlocked) {
      return res.status(403).json({ message: 'Messaging is unavailable between blocked accounts' });
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [senderId, recipientId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId],
        isGroup: false
      });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  startConversation
};
