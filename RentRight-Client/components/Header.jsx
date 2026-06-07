import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'
import { useCart } from '../_context/CartContext'

const Header = ({
  title,
  showBack,
  showSearch,
  showCart,
  showMenu,
  showLogo,
}) => {
  const router = useRouter()
  const { cartItems } = useCart()
  const itemsCount = cartItems.reduce((sum, item) => sum + item.qty, 0)

  return (
    <View className="bg-white px-4 py-4 flex-row items-center justify-between border-b border-slate-200 shadow-sm shadow-slate-100">
      <View className="flex-row items-center">
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 rounded-2xl bg-slate-100 p-2"
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
        )}

        {showMenu && (
          <TouchableOpacity className="mr-3 rounded-2xl bg-slate-100 p-2">
            <Ionicons name="menu-outline" size={22} color="#0f172a" />
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-1 items-center justify-center">
        {showLogo ? (
          <Text className="text-2xl font-bold text-cyan-700">RentRight</Text>
        ) : title ? (
          <Text className="text-lg font-semibold text-slate-900">{title}</Text>
        ) : null}
      </View>

      <View className="flex-row items-center gap-3">
        {showSearch && (
          <TouchableOpacity className="rounded-2xl bg-slate-100 p-2">
            <Ionicons name="search-outline" size={22} color="#0f172a" />
          </TouchableOpacity>
        )}

        {showCart && (
          <TouchableOpacity
            onPress={() => router.push('/cart')}
            className="relative rounded-2xl bg-slate-100 p-2"
          >
            <Ionicons name="cart-outline" size={22} color="#0f172a" />
            {itemsCount > 0 && (
              <View className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-red-500 px-1.5 items-center justify-center">
                <Text className="text-[10px] font-bold text-white">{itemsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default Header