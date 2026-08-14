const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { notify } = require('../services/notificationService');

// GET /api/messages - one entry per conversation with the latest message.
const listConversations = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const conversations = await Message.aggregate([
    { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
    { $sort: { createdAt: -1 } },
    {
      $addFields: {
        partnerId: {
          $cond: [{ $eq: ['$senderId', userId] }, '$receiverId', '$senderId'],
        },
      },
    },
    {
      $group: {
        _id: '$partnerId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$isRead', false] }] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
  ]);

  const partners = await User.find({
    _id: { $in: conversations.map((c) => c._id) },
  }).select('name email role profileImage designation department');
  const partnerMap = new Map(partners.map((p) => [String(p._id), p]));

  const data = conversations.map((c) => ({
    user: partnerMap.get(String(c._id)) || null,
    lastMessage: c.lastMessage,
    unreadCount: c.unreadCount,
  }));

  return ok(res, data);
});

// GET /api/messages/:userId - full thread; marks incoming messages as read.
const getConversation = asyncHandler(async (req, res) => {
  const partner = await User.findById(req.params.userId).select(
    'name email role profileImage designation department'
  );
  if (!partner) throw ApiError.notFound('User not found');

  const messages = await Message.find({
    $or: [
      { senderId: req.user._id, receiverId: partner._id },
      { senderId: partner._id, receiverId: req.user._id },
    ],
  }).sort({ createdAt: 1 });

  await Message.updateMany(
    { senderId: partner._id, receiverId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return ok(res, { user: partner, messages });
});

// POST /api/messages  { receiverId, content }
const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, content } = req.body;
  if (!receiverId || !content) {
    throw ApiError.badRequest('receiverId and content are required');
  }
  if (String(receiverId) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot message yourself');
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) throw ApiError.notFound('Recipient not found');

  const message = await Message.create({
    senderId: req.user._id,
    receiverId: receiver._id,
    content,
  });

  await notify({
    userId: receiver._id,
    title: `New message from ${req.user.name}`,
    message: content.slice(0, 120),
    type: 'message',
    link: `/messages/${req.user._id}`,
  });

  return created(res, message);
});

// GET /api/messages/unread/count
const unreadCount = asyncHandler(async (req, res) => {
  const count = await Message.countDocuments({ receiverId: req.user._id, isRead: false });
  return ok(res, { count });
});

module.exports = { listConversations, getConversation, sendMessage, unreadCount };
