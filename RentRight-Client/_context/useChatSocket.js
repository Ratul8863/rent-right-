import { useEffect, useMemo, useRef, useState } from 'react'
import Constants from 'expo-constants'

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL

const buildWsUrl = (token) => {
  const wsHost = BACKEND_URL.replace(/^http/, 'ws')
  return `${wsHost}/ws?token=${encodeURIComponent(token)}`
}

export const useChatSocket = (accessToken, handlers = {}) => {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState({})

  const sendSocketMessage = (action, payload) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return
    }
    socketRef.current.send(JSON.stringify({ action, payload }))
  }

  const sendMessage = (targetId, content) => {
    sendSocketMessage('send_message', { targetId, content })
  }

  const startCall = (targetId, callType) => {
    const normalizedType = callType === 'audio' ? 'voice' : callType
    sendSocketMessage('start_call', { targetId, callType: normalizedType })
  }

  const answerCall = (callId, accepted) => {
    sendSocketMessage('answer_call', { callId, accepted })
  }

  const endCall = (callId) => {
    sendSocketMessage('end_call', { callId })
  }

  const sendOffer = (callId, sdp) => {
    if (!callId || !sdp) return
    sendSocketMessage('webrtc_offer', { callId, sdp })
  }

  const sendAnswerSDP = (callId, sdp) => {
    if (!callId || !sdp) return
    sendSocketMessage('webrtc_answer', { callId, sdp })
  }

  const sendIceCandidate = (callId, candidate) => {
    if (!callId || !candidate) return
    sendSocketMessage('ice_candidate', { callId, candidate })
  }

  useEffect(() => {
    if (!accessToken) {
      return undefined
    }

    const websocket = new WebSocket(buildWsUrl(accessToken))
    socketRef.current = websocket

    websocket.onopen = () => {
      setConnected(true)
      handlers?.onConnection?.()
    }

    websocket.onmessage = ({ data }) => {
      let message
      try {
        message = JSON.parse(data)
      } catch (_error) {
        return
      }

      switch (message.type) {
        case 'presence_update': {
          const onlineIds = message.payload?.onlineUserIds || []
          const statusMap = onlineIds.reduce((acc, id) => {
            acc[id] = true
            return acc
          }, {})
          setOnlineUsers(statusMap)
          handlers?.onPresence?.(statusMap)
          break
        }
        case 'message_received': {
          handlers?.onMessage?.(message.payload)
          break
        }
        case 'message_sent': {
          handlers?.onMessage?.(message.payload, true)
          break
        }
        case 'incoming_call':
        case 'call_started':
        case 'call_answered':
        case 'call_ended':
        case 'offer':
        case 'answer':
        case 'ice_candidate': {
          handlers?.onCall?.(message.type, message.payload)
          break
        }
        case 'connection_established': {
          const onlineIds = message.payload?.onlineUserIds || []
          const statusMap = onlineIds.reduce((acc, id) => {
            acc[id] = true
            return acc
          }, {})
          setOnlineUsers(statusMap)
          handlers?.onPresence?.(statusMap)
          break
        }
        default:
          break
      }
    }

    websocket.onerror = (error) => {
      console.warn('Chat socket error', error)
    }

    websocket.onclose = () => {
      setConnected(false)
      socketRef.current = null
      handlers?.onClose?.()
    }

    return () => {
      websocket.close()
    }
  }, [accessToken])

  return useMemo(
    () => ({
      connected,
      onlineUsers,
      sendMessage,
      startCall,
      answerCall,
      endCall,
      sendOffer,
      sendAnswerSDP,
      sendIceCandidate,
    }),
    [connected, onlineUsers],
  )
}
