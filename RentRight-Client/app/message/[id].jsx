import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../_context/AuthContext'
import { getThreadMessages } from '../../_context/chatApi'
import { useChatSocket } from '../../_context/useChatSocket'

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const ChatThread = () => {
  const router = useRouter()
  const { id, name } = useLocalSearchParams()
  const { accessToken, user } = useAuth()

  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [error, setError] = useState(null)

  const flatListRef = useRef(null)
  const ownerName = name ? decodeURIComponent(name) : 'Chat'

  // Validate id parameter
  useEffect(() => {
    if (!id) {
      setError('Conversation not found')
      setIsLoading(false)
    }
  }, [id])

  const { connected, sendMessage, startCall } = useChatSocket(accessToken, {
    onPresence: (statusMap) => {
      setIsOnline(Boolean(statusMap[id]))
    },
    onMessage: (payload, isSent) => {
      if (!payload) return
      const isRelevant =
        payload.senderId === id ||
        payload.receiverId === id ||
        isSent
      if (!isRelevant) return

      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev
        return [
          ...prev,
          {
            id: payload.id || String(Date.now()),
            content: payload.content,
            senderId: payload.senderId,
            createdAt: payload.createdAt || new Date().toISOString(),
            pending: false,
          },
        ]
      })
    },
    onCall: (type, payload) => {
      if (type === 'incoming_call' && payload?.callerId === id) {
        router.push(`/call/${payload.callerId}?type=${payload.callType === 'voice' ? 'audio' : payload.callType}&incoming=1&callId=${payload.id}&name=${encodeURIComponent(ownerName)}`)
      }
    },
  })

  useEffect(() => {
    const load = async () => {
      if (!accessToken || !id) return
      setIsLoading(true)
      try {
        const resp = await getThreadMessages(id, accessToken)
        const msgs = resp.messages || resp || []
        setMessages(msgs)
      } catch (e) {
        console.warn('Failed to load messages', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [accessToken, id])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150)
    }
  }, [messages])

  const handleSend = () => {
    const text = inputText.trim()
    if (!text || isSending) return

    const optimistic = {
      id: `optimistic-${Date.now()}`,
      content: text,
      senderId: user?.id,
      createdAt: new Date().toISOString(),
      pending: true,
    }
    setMessages((prev) => [...prev, optimistic])
    setInputText('')
    setIsSending(true)

    try {
      sendMessage(id, text)
    } catch (e) {
      console.warn('Send failed', e)
    } finally {
      setIsSending(false)
    }
  }

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === user?.id
    return (
      <View
        className={`mb-2 max-w-[78%] px-4 py-3 rounded-[22px] ${
          isMe
            ? 'self-end bg-cyan-600 rounded-br-md'
            : 'self-start bg-white rounded-bl-md shadow-sm shadow-slate-200'
        }`}
      >
        <Text className={`text-sm leading-5 ${isMe ? 'text-white' : 'text-slate-900'}`}>
          {item.content}
        </Text>
        <Text className={`mt-1 text-[10px] ${isMe ? 'text-cyan-200 text-right' : 'text-slate-400'}`}>
          {formatTime(item.createdAt)}
          {item.pending ? '  •  Sending…' : ''}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      {/* Error state */}
      {error ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="alert-circle-outline" size={52} color="#ef4444" />
          <Text className="mt-4 text-base font-semibold text-slate-900">{error}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 rounded-2xl bg-cyan-600 px-6 py-2"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
      {/* Header */}
      <View className="flex-row items-center gap-3 bg-white px-4 py-3 border-b border-slate-100 shadow-sm shadow-slate-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="rounded-2xl bg-slate-100 p-2 mr-1"
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>

        <View className="h-10 w-10 rounded-full bg-cyan-200 items-center justify-center">
          <Text className="text-base font-bold text-cyan-900">
            {ownerName?.slice(0, 2)?.toUpperCase()}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900">{ownerName}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <View className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <Text className="text-xs text-slate-500">{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              startCall(id, 'audio')
              router.push(`/call/${id}?type=audio&name=${encodeURIComponent(ownerName)}`)
            }}
            className="rounded-full bg-slate-100 p-2"
            disabled={!connected}
          >
            <Ionicons name="call" size={18} color={connected ? '#0f766e' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              startCall(id, 'video')
              router.push(`/call/${id}?type=video&name=${encodeURIComponent(ownerName)}`)
            }}
            className="rounded-full bg-slate-100 p-2"
            disabled={!connected}
          >
            <Ionicons name="videocam" size={18} color={connected ? '#0f766e' : '#94a3b8'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages + Input — KeyboardAvoidingView must wrap both */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#22d3ee" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View className="items-center justify-center mt-32">
                <Ionicons name="chatbubble-ellipses-outline" size={52} color="#94a3b8" />
                <Text className="mt-4 text-base font-semibold text-slate-700">No messages yet</Text>
                <Text className="mt-1 text-sm text-slate-400">Say hello to {ownerName}!</Text>
              </View>
            }
          />
        )}

        {/* Input bar — inside KeyboardAvoidingView so it pushes up */}
        <View className="flex-row items-end gap-3 bg-white px-4 py-3 border-t border-slate-100">
          <TextInput
            className="flex-1 rounded-[22px] bg-slate-100 px-4 py-3 text-sm text-slate-900 max-h-28"
            placeholder="Type a message…"
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSend}
            disabled={!inputText.trim() || !connected}
            className={`rounded-full p-3 ${inputText.trim() && connected ? 'bg-cyan-600' : 'bg-slate-200'}`}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() && connected ? '#fff' : '#94a3b8'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  )
}

export default ChatThread
