import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import http from 'http'
import jwt from 'jsonwebtoken'
import { WebSocketServer } from 'ws'
import { connectDb } from './src/config/db.js'
import authRoutes from './src/routes/auth.js'
import productRoutes from './src/routes/products.js'
import chatRoutes from './src/routes/chat.js'
import User from './src/models/User.js'
import Message from './src/models/Message.js'
import CallRecord from './src/models/CallRecord.js'
import Conversation from './src/models/Conversation.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:19006'

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
)

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/chat', chatRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'RentRight auth server is running.' })
})

const server = http.createServer(app)

const onlineClients = new Map()

function broadcast(payload) {
  const json = JSON.stringify(payload)
  onlineClients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(json)
    }
  })
}

function getUserFromToken(token) {
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded.userId
  } catch (error) {
    return null
  }
}

function notifyPresence() {
  broadcast({
    type: 'presence_update',
    payload: {
      onlineUserIds: Array.from(onlineClients.keys()),
    },
  })
}

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', async (socket, req) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const token = url.searchParams.get('token')
    const userId = getUserFromToken(token)
    if (!userId) {
      socket.close(1008, 'Unauthorized')
      return
    }

    const user = await User.findById(userId).select('-password -refreshToken')
    if (!user) {
      socket.close(1008, 'Unauthorized')
      return
    }

    onlineClients.set(userId.toString(), socket)
    notifyPresence()

    socket.send(
      JSON.stringify({
        type: 'connection_established',
        payload: {
          userId: user._id.toString(),
          onlineUserIds: Array.from(onlineClients.keys()),
        },
      }),
    )

    socket.on('message', async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString())
        const { action, payload } = message

        switch (action) {
          case 'send_message': {
            const { targetId, content } = payload
            if (!targetId || !content?.trim()) {
              return
            }

            // Ensure a conversation exists between the two users
            let conversation = await Conversation.findOne({ participants: { $all: [user._id, targetId] } })
            if (!conversation) {
              conversation = await Conversation.create({ participants: [user._id, targetId] })
            }

            const savedMessage = await Message.create({
              sender: user._id,
              receiver: targetId,
              content: content.trim(),
              type: 'text',
              status: 'delivered',
              metadata: {},
              conversation: conversation._id,
            })

            // update conversation metadata
            conversation.lastMessage = savedMessage.content
            conversation.lastType = savedMessage.type
            conversation.lastSender = user._id
            await conversation.save()

            const chatMessage = {
              id: savedMessage._id,
              senderId: user._id.toString(),
              receiverId: targetId,
              content: savedMessage.content,
              type: savedMessage.type,
              status: savedMessage.status,
              conversationId: conversation._id,
              createdAt: savedMessage.createdAt,
            }

            const receiverSocket = onlineClients.get(targetId)
            if (receiverSocket?.readyState === receiverSocket.OPEN) {
              receiverSocket.send(
                JSON.stringify({ type: 'message_received', payload: chatMessage }),
              )
            }

            socket.send(JSON.stringify({ type: 'message_sent', payload: chatMessage }))
            break
          }
          case 'start_call': {
            const { targetId, callType } = payload
            if (!targetId || !['voice', 'video'].includes(callType)) {
              return
            }

            const callRecord = await CallRecord.create({
              caller: user._id,
              callee: targetId,
              callType,
              status: 'pending',
              startedAt: new Date(),
            })

            const callPayload = {
              id: callRecord._id,
              callerId: user._id.toString(),
              calleeId: targetId,
              callType,
              status: callRecord.status,
              startedAt: callRecord.startedAt,
            }

            const targetSocket = onlineClients.get(targetId)
            if (targetSocket?.readyState === targetSocket.OPEN) {
              targetSocket.send(
                JSON.stringify({ type: 'incoming_call', payload: callPayload }),
              )
            }

            socket.send(JSON.stringify({ type: 'call_started', payload: callPayload }))
            break
          }
          case 'answer_call': {
            const { callId, accepted } = payload
            const call = await CallRecord.findById(callId)
            if (!call) return

            call.status = accepted ? 'connected' : 'rejected'
            if (accepted) {
              call.startedAt = call.startedAt || new Date()
            } else {
              call.endedAt = new Date()
            }
            await call.save()

            const counterpartId = call.caller.toString() === userId ? call.callee.toString() : call.caller.toString()
            const counterpartSocket = onlineClients.get(counterpartId)
            const responsePayload = {
              id: call._id,
              callerId: call.caller.toString(),
              calleeId: call.callee.toString(),
              callType: call.callType,
              status: call.status,
              startedAt: call.startedAt,
              endedAt: call.endedAt,
            }

            if (counterpartSocket?.readyState === counterpartSocket.OPEN) {
              counterpartSocket.send(
                JSON.stringify({ type: 'call_answered', payload: responsePayload }),
              )
            }
            socket.send(JSON.stringify({ type: 'call_answered', payload: responsePayload }))
            break
          }
          case 'end_call': {
            const { callId } = payload
            const call = await CallRecord.findById(callId)
            if (!call) return
            call.status = 'ended'
            call.endedAt = new Date()
            await call.save()

            const counterpartId = call.caller.toString() === userId ? call.callee.toString() : call.caller.toString()
            const counterpartSocket = onlineClients.get(counterpartId)
            const responsePayload = {
              id: call._id,
              callerId: call.caller.toString(),
              calleeId: call.callee.toString(),
              callType: call.callType,
              status: call.status,
              startedAt: call.startedAt,
              endedAt: call.endedAt,
            }

            if (counterpartSocket?.readyState === counterpartSocket.OPEN) {
              counterpartSocket.send(
                JSON.stringify({ type: 'call_ended', payload: responsePayload }),
              )
            }
            socket.send(JSON.stringify({ type: 'call_ended', payload: responsePayload }))
            break
          }
          case 'webrtc_offer': {
            const { callId, sdp } = payload
            if (!callId || !sdp) return
            const call = await CallRecord.findById(callId)
            if (!call) return
            const counterpartId = call.caller.toString() === userId ? call.callee.toString() : call.caller.toString()
            const counterpartSocket = onlineClients.get(counterpartId)
            if (counterpartSocket?.readyState === counterpartSocket.OPEN) {
              counterpartSocket.send(JSON.stringify({ type: 'offer', payload: { callId, sdp } }))
            }
            break
          }
          case 'webrtc_answer': {
            const { callId, sdp } = payload
            if (!callId || !sdp) return
            const call = await CallRecord.findById(callId)
            if (!call) return
            const counterpartId = call.caller.toString() === userId ? call.callee.toString() : call.caller.toString()
            const counterpartSocket = onlineClients.get(counterpartId)
            if (counterpartSocket?.readyState === counterpartSocket.OPEN) {
              counterpartSocket.send(JSON.stringify({ type: 'answer', payload: { callId, sdp } }))
            }
            break
          }
          case 'ice_candidate': {
            const { callId, candidate } = payload
            if (!callId || !candidate) return
            const call = await CallRecord.findById(callId)
            if (!call) return
            const counterpartId = call.caller.toString() === userId ? call.callee.toString() : call.caller.toString()
            const counterpartSocket = onlineClients.get(counterpartId)
            if (counterpartSocket?.readyState === counterpartSocket.OPEN) {
              counterpartSocket.send(JSON.stringify({ type: 'ice_candidate', payload: { callId, candidate } }))
            }
            break
          }
          default:
            break
        }
      } catch (error) {
        console.error('WebSocket message handler error:', error)
      }
    })

    socket.on('close', () => {
      onlineClients.delete(userId.toString())
      notifyPresence()
    })
  } catch (error) {
    console.error('WebSocket connection error:', error)
    socket.close(1011, 'Internal server error')
  }
})

connectDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Auth server listening on port ${PORT}`)
      console.log(`WebSocket server ready at ws://localhost:${PORT}/ws`)
    })
  })
  .catch((error) => {
    console.error('Unable to start server:', error)
    process.exit(1)
  })
