import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../_context/AuthContext'
import { useCart } from '../../_context/CartContext'

const MyBookings = () => {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { bookings, removeBooking } = useCart()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/sign-in')
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return null
  }

  const totalPrice = bookings.reduce((acc, item) => acc + item.price * item.qty, 0)

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="flex-row items-center justify-between bg-white px-4 py-4 shadow-sm shadow-slate-200">
        <TouchableOpacity onPress={() => router.back()} className="rounded-2xl bg-slate-100 p-2">
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-lg font-semibold text-slate-900">My Bookings</Text>
          <Text className="text-sm text-slate-500">{bookings.length} booking{bookings.length === 1 ? '' : 's'}</Text>
        </View>
        <View className="w-8" />
      </View>

      {bookings.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="bookmark-outline" size={80} color="#94a3b8" />
          <Text className="mt-6 text-2xl font-semibold text-slate-900">No bookings yet</Text>
          <Text className="mt-3 text-center text-sm text-slate-500">
            Start booking products from our shop to see them here.
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
              {bookings.map((item) => (
                <View
                  key={item.id}
                  className="overflow-hidden rounded-[28px] bg-white shadow-lg shadow-slate-200"
                >
                  {/* Booking Header Card */}
                  <View className="flex-row items-center justify-between bg-gradient-to-r from-cyan-50 to-teal-50 px-4 py-3">
                    <View className="flex-row items-center gap-2">
                      <View className="h-2 w-2 rounded-full bg-green-500" />
                      <Text className="text-xs font-semibold text-slate-600">Active Booking</Text>
                    </View>
                    <Text className="text-xs font-semibold text-cyan-700">Qty: {item.qty}</Text>
                  </View>

                  {/* Booking Content */}
                  <View className="p-4">
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => router.push(`/details?productId=${encodeURIComponent(String(item.id))}`)}
                    >
                      <View className="flex-row gap-4">
                        <Image
                          source={{ uri: item.image }}
                          className="h-28 w-28 rounded-3xl"
                          resizeMode="cover"
                        />
                        <View className="flex-1 justify-between">
                          <View>
                            <Text className="text-base font-semibold text-slate-900">{item.title}</Text>
                            <Text className="mt-1 text-sm text-slate-500">{item.variant}</Text>
                          </View>
                          <View className="flex-row items-center justify-between">
                            <View>
                              <Text className="text-xs text-slate-400">Total</Text>
                              <Text className="text-lg font-bold text-cyan-700">${(item.price * item.qty).toFixed(2)}</Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-xs text-slate-400">Unit price</Text>
                              <Text className="text-sm font-semibold text-slate-700">${item.price}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Booking Info */}
                    <View className="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <Ionicons name="calendar-outline" size={16} color="#64748b" />
                          <Text className="text-xs text-slate-500">Booking Date</Text>
                        </View>
                        <Text className="text-xs font-semibold text-slate-700">{new Date().toLocaleDateString()}</Text>
                      </View>
                      <View className="mt-2 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
                          <Text className="text-xs text-slate-500">Status</Text>
                        </View>
                        <Text className="text-xs font-semibold text-green-600">Confirmed</Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="mt-3 flex-row gap-2">
                      <TouchableOpacity
                        activeOpacity={0.85}
                        className="flex-1 rounded-2xl bg-cyan-50 px-3 py-3 items-center"
                        onPress={() => router.push(`/details?productId=${encodeURIComponent(String(item.id))}`)}
                      >
                        <Text className="text-sm font-semibold text-cyan-700">View Details</Text>
                      </TouchableOpacity>

                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Bottom Summary */}
          <View className="absolute bottom-0 left-0 right-0 bg-white px-4 pb-6 pt-4 shadow-2xl shadow-slate-300/30">
            <View className="mb-4 rounded-[26px] bg-slate-50 px-4 py-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-500">Total booking value</Text>
                <Text className="text-sm font-semibold text-slate-900">${totalPrice.toFixed(2)}</Text>
              </View>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-sm text-slate-500">Number of items</Text>
                <Text className="text-sm font-semibold text-slate-900">{bookings.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.85} 
              className="rounded-[28px] bg-cyan-600 px-4 py-4 items-center shadow-lg shadow-cyan-500/20"
              onPress={() => router.push('/cart')}
            >
              <Text className="text-base font-bold text-white">Go to Cart</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  )
}

export default MyBookings
