import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import {
  Image, ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../_context/AuthContext'
import { useCart } from '../../_context/CartContext'
import { getProductRequest } from '../../_context/authApi'

const getImageUri = (item) => {
  if (!item) return ''
  if (typeof item.imageUrl === 'string' && item.imageUrl.trim()) return item.imageUrl
  if (typeof item.image === 'string' && item.image.trim()) return item.image
  const images = Array.isArray(item.images) ? item.images : []
  return images
    .map((img) => (typeof img === 'string' ? img : img?.uri || img?.url))
    .find(Boolean) || ''
}

const Cart = () => {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { cartItems, incrementQty, decrementQty, removeFromCart, clearCart } = useCart()

  const { updateCartItem } = useCart()

  const openOwnerChat = (item) => {
    const rawOwner = item.ownerId || item?.createdBy?._id || item?.createdBy?.id
    const ownerId = rawOwner ? String(rawOwner) : null
    if (!ownerId) return
    const qp = []
    if (item.ownerName || item?.createdBy?.name) qp.push(`name=${encodeURIComponent(item.ownerName || item?.createdBy?.name)}`)
    if (item.ownerAvatar || item?.createdBy?.avatarUrl) qp.push(`avatar=${encodeURIComponent(item.ownerAvatar || item?.createdBy?.avatarUrl)}`)
    const query = qp.length ? `?${qp.join('&')}` : ''
    router.push(`/message/${ownerId}${query}`)
  }

  useEffect(() => {
    let cancelled = false
    const enrichMissingOwners = async () => {
      for (const item of cartItems) {
        const hasOwner = item.ownerId || item?.createdBy?._id || item?.createdBy?.id
        if (hasOwner) continue
        try {
          const resp = await getProductRequest(item.id)
          const product = resp.product || resp
          const createdBy = product?.createdBy
          if (!cancelled && createdBy) {
            updateCartItem(item.id, {
              createdBy,
              ownerId: createdBy._id || createdBy.id || null,
              ownerName: createdBy.name || null,
              ownerAvatar: createdBy.avatarUrl || null,
            })
          }
        } catch (e) {
          // ignore individual fetch errors
        }
      }
    }

    if (cartItems.length > 0) enrichMissingOwners()

    return () => { cancelled = true }
  }, [cartItems, updateCartItem])

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/sign-in')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0)
  const serviceFee = subtotal * 0.02
  const total = subtotal + serviceFee

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="flex-row items-center justify-between bg-white px-4 py-4 shadow-sm shadow-slate-200">
        <TouchableOpacity onPress={() => router.back()} className="rounded-2xl bg-slate-100 p-2">
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-lg font-semibold text-slate-900">My Cart</Text>
          <Text className="text-sm text-slate-500">{cartItems.length} item{cartItems.length === 1 ? '' : 's'}</Text>
        </View>
        <TouchableOpacity onPress={clearCart} className="rounded-2xl bg-slate-100 p-2">
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {cartItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cart-outline" size={80} color="#94a3b8" />
          <Text className="mt-6 text-2xl font-semibold text-slate-900">Your cart is empty</Text>
          <Text className="mt-3 text-center text-sm text-slate-500">
            Browse rentals and add a product to start your booking.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            className="mt-8 rounded-[24px] bg-cyan-600 px-6 py-4 shadow-lg shadow-cyan-500/20"
            onPress={() => router.push('/shop')}
          >
            <Text className="text-base font-semibold text-white">Browse rentals</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 180 }}
          >
            <View className="space-y-4 px-4 pt-4">
              {cartItems.map((item) => (
                <View
                  key={item.id}
                  className="overflow-hidden rounded-[28px] bg-white p-4 shadow-lg shadow-slate-200"
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => router.push(`/details?productId=${encodeURIComponent(String(item._id || item.id))}`)}
                  >
                    <View className="flex-row gap-4">
                      <Image
                        source={{ uri: getImageUri(item) }}
                        className="h-28 w-28 rounded-3xl"
                        resizeMode="cover"
                      />
                      <View className="flex-1 justify-between">
                        <View>
                          <Text className="text-base font-semibold text-slate-900">{item.title}</Text>
                          <Text className="mt-1 text-sm text-slate-500">{item.variant}</Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-lg font-bold text-cyan-700">${(item.price * item.qty).toFixed(2)}</Text>
                          <View className="flex-row items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                            <TouchableOpacity
                              activeOpacity={0.85}
                              className="rounded-full bg-slate-200 p-2"
                              onPress={() => decrementQty(item._id || item.id)}
                            >
                              <Ionicons name="remove" size={16} color="#0f172a" />
                            </TouchableOpacity>
                            <Text className="text-base font-semibold text-slate-900">{item.qty}</Text>
                            <TouchableOpacity
                              activeOpacity={0.85}
                              className="rounded-full bg-cyan-600 p-2"
                              onPress={() => incrementQty(item._id || item.id)}
                            >
                              <Ionicons name="add" size={16} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <View className="flex-row gap-3 mt-4">
                    <TouchableOpacity
                      activeOpacity={0.85}
                      className={`flex-1 rounded-3xl px-4 py-3 items-center ${(item.ownerId || item?.createdBy?._id || item?.createdBy?.id) ? 'bg-cyan-50' : 'bg-slate-100'}`}
                      onPress={() => openOwnerChat(item)}
                      disabled={!(item.ownerId || item?.createdBy?._id || item?.createdBy?.id)}
                    >
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="chatbubble-outline" size={16} color={(item.ownerId || item?.createdBy?._id || item?.createdBy?.id) ? '#0f766e' : '#94a3b8'} />
                        <Text className={`text-sm font-semibold ${(item.ownerId || item?.createdBy?._id || item?.createdBy?.id) ? 'text-teal-700' : 'text-slate-500'}`}>
                          {(item.ownerId || item?.createdBy?._id || item?.createdBy?.id) ? 'Message owner' : 'No owner contact'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      className="flex-1 rounded-3xl bg-rose-50 px-4 py-3 items-center"
                      onPress={() => removeFromCart(item._id || item.id)}
                    >
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        <Text className="text-sm font-semibold text-rose-600">Remove</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 bg-white px-4 pb-6 pt-4 shadow-2xl shadow-slate-300/30">
            <View className="mb-4 rounded-[26px] bg-slate-50 px-4 py-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-500">Subtotal</Text>
                <Text className="text-sm font-semibold text-slate-900">${subtotal.toFixed(2)}</Text>
              </View>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-sm text-slate-500">Service fee</Text>
                <Text className="text-sm font-semibold text-slate-900">${serviceFee.toFixed(2)}</Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-900">Total</Text>
              <Text className="text-2xl font-extrabold text-slate-900">${total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              className="rounded-[28px] bg-cyan-600 px-4 py-4 items-center shadow-lg shadow-cyan-500/20"
              onPress={() => router.push('/checkout')}
            >
              <Text className="text-base font-bold text-white">Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  )
}

export default Cart;
