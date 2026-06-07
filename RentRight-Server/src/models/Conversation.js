import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessage: {
      type: String,
      default: '',
    },
    lastType: {
      type: String,
      enum: ['text', 'system', 'call'],
      default: 'text',
    },
    lastSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
)

conversationSchema.index({ participants: 1 })

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema)
export default Conversation
