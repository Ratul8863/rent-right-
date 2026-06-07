import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../_context/AuthContext'
import { useCart } from '../../_context/CartContext'
import { getChatUsers, getConversations } from '../../_context/chatApi'
import { useChatSocket } from '../../_context/useChatSocket'

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const Message = () => {
  const router = useRouter()
  const { isAuthenticated, accessToken, user } = useAuth()
  const { cartItems } = useCart()
  const [users, setUsers] = useState([])
  const [conversations, setConversations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState({})

  const { connected } = useChatSocket(accessToken, {
    onPresence: setOnlineUsers,
    onMessage: (payload) => {
      if (!payload) return
      setConversations((current) => {
        const index = current.findIndex(
          (item) => item.user.id === payload.senderId || item.user.id === payload.receiverId,
        )
        const otherId = payload.senderId === user?.id ? payload.receiverId : payload.senderId
        const otherUser = current.find((item) => item.user.id === otherId)?.user

        const incoming = payload.senderId !== user?.id
        const update = {
          user: otherUser || { id: otherId, name: 'Unknown', avatarUrl: null },
          lastMessage: payload.content,
          lastType: payload.type,
          lastSenderId: payload.senderId,
          time: payload.createdAt,
          unread: incoming ? 1 : 0,
        }

        if (index >= 0) {
          const updated = [...current]
          updated[index] = {
            ...updated[index],
            ...update,
            unread: incoming ? updated[index].unread + 1 : updated[index].unread,
          }
          return [updated[index], ...updated.filter((_, idx) => idx !== index)]
        }

        return [update, ...current]
      })
    },
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/sign-in')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    const load = async () => {
      if (!accessToken) return
      setIsLoading(true)
      setError(null)

      try {
        const [usersResponse, conversationsResponse] = await Promise.all([
          getChatUsers(accessToken),
          getConversations(accessToken),
        ])
        setUsers(usersResponse.users)
        setConversations(conversationsResponse.conversations)
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [accessToken])

  const contacts = useMemo(
    () => users.map((item) => ({
      ...item,
      online: Boolean(onlineUsers[item.id]),
    })),
    [users, onlineUsers],
  )

  const cartOwners = useMemo(() => {
    const uniqueOwners = []
    cartItems.forEach((item) => {
      const ownerId = item.ownerId || item.createdBy?._id || item.createdBy?.id
      if (!ownerId) return
      if (!uniqueOwners.some((owner) => owner.id === ownerId)) {
        uniqueOwners.push({
          id: ownerId,
          name: item.ownerName || item.createdBy?.name || 'Member',
          avatarUrl: item.ownerAvatar || item.createdBy?.avatarUrl || null,
          online: Boolean(onlineUsers[ownerId]),
        })
      }
    })
    return uniqueOwners
  }, [cartItems, onlineUsers])

  if (!isAuthenticated) {
    return null
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200">
        <View>
          <Text className="text-xl font-semibold text-slate-900">Messages</Text>
          <Text className="mt-1 text-sm text-slate-500">{connected ? 'Connected' : 'Offline'} • {user?.name || 'Guest'}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          className="rounded-3xl bg-cyan-100 px-4 py-2"
          onPress={() => router.push('/message')}
        >
          <Text className="text-sm font-semibold text-cyan-700">Refresh</Text>
        </TouchableOpacity>
      </View>

      <View className="border-b border-slate-200 bg-white px-4 py-3">
        <Text className="mb-3 text-sm font-semibold uppercase tracking-[1px] text-slate-400">Contacts</Text>
        <FlatList
          data={contacts}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(`/message/${item.id}`)}
              className="mr-3 w-28 rounded-[28px] bg-slate-100 px-4 py-4"
            >
              <View className="flex-row items-center justify-between">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-cyan-200">
                  <Text className="text-base font-bold text-cyan-900">{item.name?.slice(0, 2)?.toUpperCase()}</Text>
                </View>
                <View
                  className={`h-3.5 w-3.5 rounded-full ${item.online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                />
              </View>
              <Text className="mt-3 text-sm font-semibold text-slate-900" numberOfLines={1}>{item.name}</Text>
              <Text className="mt-1 text-xs text-slate-500">{item.online ? 'Online' : 'Offline'}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={(
            <Text className="text-sm text-slate-500">No contacts available yet.</Text>
          )}
        />
      </View>

      {cartOwners.length > 0 ? (
        <View className="border-b border-slate-200 bg-white px-4 py-3">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-[1px] text-slate-400">Your cart member chats</Text>
          <FlatList
            data={cartOwners}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(`/message/${item.id}`)}
                className="mr-3 w-28 rounded-[28px] bg-cyan-50 px-4 py-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-cyan-200">
                    <Text className="text-base font-bold text-cyan-900">{item.name?.slice(0, 2)?.toUpperCase()}</Text>
                  </View>
                  <View
                    className={`h-3.5 w-3.5 rounded-full ${item.online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  />
                </View>
                <Text className="mt-3 text-sm font-semibold text-slate-900" numberOfLines={1}>{item.name}</Text>
                <Text className="mt-1 text-xs text-slate-500">{item.online ? 'Online' : 'Offline'}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-2 text-center text-sm text-rose-600">{error}</Text>
          <TouchableOpacity className="rounded-full bg-cyan-600 px-5 py-3" onPress={() => router.replace('/message')}>
            <Text className="text-sm font-semibold text-white">Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(`/message/${item.user.id}`)}
              className="mb-4 rounded-[28px] bg-white px-5 py-4 shadow-lg shadow-slate-200"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-base font-semibold text-slate-900">{item.user.name}</Text>
                    <View
                      className={`h-2.5 w-2.5 rounded-full ${onlineUsers[item.user.id] ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    />
                  </View>
                  <Text className="mt-2 text-sm text-slate-500 leading-6" numberOfLines={1}>
                    {item.lastMessage || 'No messages yet.'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-slate-400">{formatTime(item.time)}</Text>
                  {item.unread > 0 ? (
                    <View className="mt-3 rounded-full bg-cyan-600 px-2.5 py-1.5">
                      <Text className="text-xs font-semibold text-white">{item.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={(
            <View className="mt-20 items-center px-6">
              <Ionicons name="chatbubble-ellipses-outline" size={60} color="#94a3b8" />
              <Text className="mt-6 text-xl font-semibold text-slate-900">No conversations yet</Text>
              <Text className="mt-2 text-center text-sm text-slate-500">
                Start a message with a contact to see your chat history.
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

export default Message