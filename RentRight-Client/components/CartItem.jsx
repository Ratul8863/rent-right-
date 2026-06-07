import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import {
    Image, ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCart } from '../../_context/CartContext'

const Cart = () => {
  const router = useRouter()
  const { cartItems, incrementQty, decrementQty, removeFromCart } = useCart()

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  )

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-4 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text className="text-lg font-semibold text-gray-800">
          My Cart
        </Text>

        <View className="w-6" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 140,
        }}
      >
        {/* Cart Items */}
        {cartItems.map((item) => (
          <View key={item.id} className="bg-white rounded-xl mt-4 overflow-hidden flex-row p-3 shadow-md shadow-gray-300">
            {/* Product Image */}
            <Image
              source={{ uri: item.image }}
              style={{ width: 95, height: 95, borderRadius: 14 }}
              resizeMode="cover"
            />

            {/* Product Info */}
            <View className="flex-1 ml-3 justify-between">
              <View>
                <Text
                  numberOfLines={1}
                  className="text-sm font-semibold text-gray-800"
                >
                  {item.title}
                </Text>
                <Text className="mt-1 text-xs text-gray-500">{item.variant}</Text>
              </View>

              {/* Price + Quantity */}
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-lg font-semibold text-[#155e75]">
                  ${(item.price * item.qty).toFixed(2)}
                </Text>

                <View className="flex-row items-center">
                  <TouchableOpacity
                    className="w-7 h-7 rounded-lg bg-[#155e75] justify-center items-center"
                    onPress={() => decrementQty(item.id)}
                  >
                    <Ionicons name="remove" size={16} color="#fff" />
                  </TouchableOpacity>

                  <Text className="mx-3 text-base font-semibold text-gray-800">
                    {item.qty}
                  </Text>

                  <TouchableOpacity
                    className="w-7 h-7 rounded-lg bg-[#155e75] justify-center items-center"
                    onPress={() => incrementQty(item.id)}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Delete */}
            <TouchableOpacity
              className="absolute top-2 right-2"
              onPress={() => removeFromCart(item.id)}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color="#ef4444"
              />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Checkout Section */}
      <View className="absolute bottom-0 w-full bg-white px-4 pt-4 pb-6 border-t border-gray-200">
        <View className="flex-row justify-between mb-4">
          <Text className="text-sm font-semibold text-gray-500">
            Total Price
          </Text>
          <Text className="text-2xl font-extrabold text-gray-800">
            ${subtotal.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          className="bg-[#155e75] py-4 rounded-xl items-center"
        >
          <Text className="text-white text-base font-semibold">
            Proceed to Checkout
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default Cart