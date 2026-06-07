import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'system', 'call'],
      default: 'text',
    },
    content: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['delivered', 'read'],
      default: 'delivered',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
  },
  {
    timestamps: true,
  },
)

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema)
export default Message
