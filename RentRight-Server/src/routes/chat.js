import express from 'express'
import User from '../models/User.js'
import Message from '../models/Message.js'
import Conversation from '../models/Conversation.js'
import CallRecord from '../models/CallRecord.js'
import { protect } from '../middleware/protect.js'

const router = express.Router()

function normalizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt,
  }
}

router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      'name email avatarUrl role createdAt',
    )
    res.json({ users: users.map(normalizeUser) })
  } catch (error) {
    console.error('Chat users error:', error)
    res.status(500).json({ message: 'Unable to load users.' })
  }
})

router.get('/conversations', protect, async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('participants', 'name avatarUrl')

    // For each conversation, get the last message preview
    const conversations = await Promise.all(
      convs.map(async (conv) => {
        const lastMsg = await Message.findOne({ conversation: conv._id })
          .sort({ createdAt: -1 })
          .populate('sender receiver', 'name avatarUrl')

        const other = conv.participants.find((p) => p._id.toString() !== req.user._id.toString())
        const unread = await Message.countDocuments({
          conversation: conv._id,
          receiver: req.user._id,
          status: 'delivered',
        })

        return {
          id: conv._id,
          user: normalizeUser(other),
          lastMessage: lastMsg ? lastMsg.content : conv.lastMessage || '',
          lastType: lastMsg ? lastMsg.type : conv.lastType || 'text',
          lastSenderId: lastMsg ? lastMsg.sender._id : conv.lastSender,
          time: lastMsg ? lastMsg.createdAt : conv.updatedAt,
          unread,
        }
      }),
    )

    res.json({ conversations })
  } catch (error) {
    console.error('Chat conversations error:', error)
    res.status(500).json({ message: 'Unable to load conversations.' })
  }
})

router.get('/threads/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params
    if (!userId) {
      return res.status(400).json({ message: 'Target user id is required.' })
    }

    // Find conversation between the two users
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] },
    })

    let messages = []
    if (conversation) {
      messages = await Message.find({ conversation: conversation._id })
        .sort({ createdAt: 1 })
        .populate('sender receiver', 'name avatarUrl')

      await Message.updateMany(
        { conversation: conversation._id, sender: userId, receiver: req.user._id, status: 'delivered' },
        { status: 'read' },
      )
    } else {
      // fallback to older behavior
      messages = await Message.find({
        $or: [
          { sender: req.user._id, receiver: userId },
          { sender: userId, receiver: req.user._id },
        ],
      })
        .sort({ createdAt: 1 })
        .populate('sender receiver', 'name avatarUrl')

      await Message.updateMany(
        {
          sender: userId,
          receiver: req.user._id,
          status: 'delivered',
        },
        { status: 'read' },
      )
    }

    res.json({
      messages: messages.map((message) => ({
        id: message._id,
        sender: normalizeUser(message.sender),
        receiver: normalizeUser(message.receiver),
        content: message.content,
        type: message.type,
        status: message.status,
        metadata: message.metadata,
        conversationId: message.conversation || (conversation ? conversation._id : null),
        createdAt: message.createdAt,
      })),
    })
  } catch (error) {
    console.error('Chat thread error:', error)
    res.status(500).json({ message: 'Unable to load chat thread.' })
  }
})

router.post('/threads/:userId/messages', protect, async (req, res) => {
  try {
    const { userId } = req.params
    const { content, type = 'text', metadata = {} } = req.body

    if (!userId || (type === 'text' && !content?.trim())) {
      return res.status(400).json({ message: 'Valid message content is required.' })
    }

    // ensure a conversation exists
    let conversation = await Conversation.findOne({ participants: { $all: [req.user._id, userId] } })
    if (!conversation) {
      conversation = await Conversation.create({ participants: [req.user._id, userId] })
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver: userId,
      content: content.trim(),
      type,
      status: 'delivered',
      metadata,
      conversation: conversation._id,
    })

    // update conversation metadata
    conversation.lastMessage = message.content
    conversation.lastType = message.type
    conversation.lastSender = req.user._id
    await conversation.save()

    res.status(201).json({
      message: {
        id: message._id,
        sender: normalizeUser(req.user),
        receiver: { id: userId },
        content: message.content,
        type: message.type,
        status: message.status,
        metadata: message.metadata,
        conversationId: conversation._id,
        createdAt: message.createdAt,
      },
    })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({ message: 'Unable to send message.' })
  }
})

router.get('/call-history', protect, async (req, res) => {
  try {
    const calls = await CallRecord.find({
      $or: [{ caller: req.user._id }, { callee: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .populate('caller callee', 'name avatarUrl')

    res.json({
      calls: calls.map((call) => ({
        id: call._id,
        caller: normalizeUser(call.caller),
        callee: normalizeUser(call.callee),
        callType: call.callType,
        status: call.status,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        createdAt: call.createdAt,
      })),
    })
  } catch (error) {
    console.error('Call history error:', error)
    res.status(500).json({ message: 'Unable to load call history.' })
  }
})

export default router
