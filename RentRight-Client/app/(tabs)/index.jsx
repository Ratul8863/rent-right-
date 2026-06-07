import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'

import Carousel from 'react-native-reanimated-carousel'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useCart } from '../../_context/CartContext'
import { getProductsRequest } from '../../_context/authApi'
import Footer from '../../components/Footer'
import Header from '../../components/Header'
import SectionHeader from '../../components/SectionHeader'

import Banner2 from '../../assets/images/car-rent.jpg'
import Banner4 from '../../assets/images/expo_link.webp'
import Banner1 from '../../assets/images/hero-image.jpg'
import Banner3 from '../../assets/images/Party-center.jpg'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 52) / 2

const BACKEND_URL = (Constants.expoConfig?.extra?.BACKEND_URL || 'http://192.168.0.105:4000').replace(/\/+$/, '')
const PLACEHOLDER_IMAGE = 'https://placehold.co/300x300/e2e8f0/94a3b8?text=No+Image'

const normalizeImageUri = (uri) => {
  if (!uri || typeof uri !== 'string') return null
  const trimmed = uri.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `${BACKEND_URL}/${trimmed.replace(/^\/+/, '')}`
}

const getImageUri = (item) => {
  if (!item) return PLACEHOLDER_IMAGE
  const rawImage =
    (typeof item.imageUrl === 'string' && item.imageUrl.trim() && item.imageUrl) ||
    (typeof item.image === 'string' && item.image.trim() && item.image) ||
    (Array.isArray(item.images)
      ? item.images
          .map((img) => (typeof img === 'string' ? img : img?.uri || img?.url))
          .find(Boolean)
      : null)
  return normalizeImageUri(rawImage) || PLACEHOLDER_IMAGE
}

const banners = [
  {
    image: Banner1,
    title: 'Find safe home',
    subtitle: 'Everything you need in one place — fast, easy & trusted.',
    button: 'Explore Now',
  },
  {
    image: Banner2,
    title: 'Find Your Dream Car',
    subtitle: 'Rent cars at affordable prices anytime you want.',
    button: 'Book Now',
  },
  {
    image: Banner3,
    title: 'Perfect Party Venues',
    subtitle: 'Book halls, centers & event spaces easily.',
    button: 'View Places',
  },
  {
    image: Banner4,
    title: 'All-in-One Rental Hub',
    subtitle: 'Cars, homes, equipment & more in one app.',
    button: 'Get Started',
  },
]

const categories = [
  'All',
  'Cars',
  'Houses',
  'Apartments',
  'Party Center',
  'Tools',
  'Bikes',
  'Electronics',
  'Furniture',
  'Dress',
]

const Home = () => {
  const router = useRouter()
  const { addToCart } = useCart()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getProductsRequest()
        setProducts(data.products || [])
      } catch (err) {
        setError(err.message || 'Unable to load products.')
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [])

  const popularProducts = useMemo(() => products.slice(0, 9), [products])

  const filteredProducts = useMemo(() => {
    return popularProducts.filter((item) => {
      const queryMatch = item.title.toLowerCase().includes(search.toLowerCase())
      if (activeCategory === 'All') return queryMatch
      return queryMatch && item.category?.toLowerCase() === activeCategory.toLowerCase()
    })
  }, [activeCategory, popularProducts, search])

  const featuredItems = useMemo(() => products.slice(0, 4), [products])

  const extractPrice = (price) => {
    if (typeof price === 'number' && Number.isFinite(price)) {
      return price
    }

    if (typeof price !== 'string') {
      return 0
    }

    const match = price.match(/\d+/)
    return parseInt(match ? match[0] : 0, 10)
  }

  const handleBookPress = (product) => {
    const cartItem = {
      id: product._id || product.id,
      title: product.title,
      price: extractPrice(product.price),
      qty: 1,
      image: getImageUri(product),
      variant: product.price,
      ownerId: product?.createdBy?._id || product?.createdBy?.id || null,
      ownerName: product?.createdBy?.name || null,
      ownerAvatar: product?.createdBy?.avatarUrl || null,
    }
    addToCart(cartItem)
  }

  const rows = []
  for (let i = 0; i < filteredProducts.length; i += 2) {
    rows.push(filteredProducts.slice(i, i + 2))
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Header showMenu showCart showLogo showSearch />
        <Carousel
          loop
          width={width}
          height={260}
          autoPlay
          data={banners}
          scrollAnimationDuration={900}
          autoPlayInterval={3500}
          renderItem={({ item }) => (
            <View className="relative mx-4 overflow-hidden rounded-[28px] bg-slate-100 shadow-lg shadow-slate-200/60">
              <Image
                source={item.image}
                style={{ width: '100%', height: 260 }}
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/35" />
              <View className="absolute inset-0 justify-between p-6">
                <View className="rounded-full bg-white/10 px-3 py-1">
                  <Text className="text-xs font-semibold uppercase tracking-[1px] text-cyan-100">Featured</Text>
                </View>
                <View>
                  <Text className="text-2xl font-extrabold leading-[36px] text-white">{item.title}</Text>
                  <Text className="mt-3 text-sm leading-6 text-white/90">{item.subtitle}</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    className="mt-5 rounded-full border border-cyan-200 bg-white px-4 py-2 shadow-lg shadow-slate-900/10 self-start"
                    onPress={() => router.push('/shop')}
                  >
                    <Text className="text-sm font-semibold text-slate-900 text-center">{item.button}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />

        <View className="mx-4 mt-6 space-y-5">
          <View className="rounded-[28px] bg-white px-4 py-4 shadow-sm shadow-slate-200/60">
            <Text className="text-sm font-semibold text-slate-700">Search rentals</Text>
            <View className="mt-3 flex-row items-center rounded-[20px] bg-slate-100 px-4 py-3">
              <Text className="text-2xl">🔎</Text>
              <TextInput
                placeholder="Search cars, homes, tools..."
                placeholderTextColor="#94a3b8"
                className="ml-3 flex-1 text-slate-900"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          {error ? (
            <View className="rounded-[24px] bg-rose-50 px-4 py-3 shadow-sm shadow-rose-100 mb-4 mx-4">
              <Text className="text-sm font-medium text-rose-700">{error}</Text>
            </View>
          ) : null}

          <SectionHeader
            title="Browse categories"
            subtitle="Explore rentals by category"
            actionLabel="View all"
            onAction={() => router.push('/shop')}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
          >
            {categories.map((item) => {
              const active = item === activeCategory
              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.85}
                  onPress={() => {
                    setActiveCategory(item)
                    router.push(`/shop?category=${encodeURIComponent(item)}`)
                  }}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? '#0891b2' : '#e2e8f0',
                    backgroundColor: active ? '#ecfeff' : '#fff',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: active ? '#0e7490' : '#334155' }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <SectionHeader
            title="Recommended for you"
            subtitle="Top picks selected for your next rental"
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4, gap: 12 }}
          >
            {featuredItems.map((item) => (
              <View
                key={item._id || item.id}
                style={{ width: 210, overflow: 'hidden', borderRadius: 22, backgroundColor: '#fff',
                  shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 }}
              >
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => router.push(`/details?productId=${encodeURIComponent(item._id || item.id)}`)}
                  style={{ height: 140, overflow: 'hidden', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#f1f5f9' }}
                >
                  <Image source={{ uri: getImageUri(item) }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
                </TouchableOpacity>
                <View style={{ padding: 14 }}>
                  <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: '#0f172a' }}>{item.title}</Text>
                  <Text style={{ marginTop: 2, fontSize: 13, color: '#64748b' }}>
                    {typeof item.price === 'number' ? `$${item.price}` : item.price}
                  </Text>
                  <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0e7490' }}>{item.rating || 4.6} ★</Text>
                    <TouchableOpacity
                      onPress={() => handleBookPress(item)}
                      activeOpacity={0.85}
                      style={{ backgroundColor: '#0891b2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Add to Cart</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <SectionHeader
            title="Popular products"
            subtitle="Browse our most booked items"
            actionLabel="See all"
            onAction={() => router.push('/shop')}
          />

          {isLoading ? (
            <View className="space-y-4 pb-8">
              {[0, 1].map((rowIndex) => (
                <View key={rowIndex} className="flex-row justify-between gap-3">
                  {[0, 1].map((colIndex) => (
                    <View key={colIndex} className="h-56 w-[150px] rounded-[22px] bg-slate-100" />
                  ))}
                </View>
              ))}
            </View>
          ) : filteredProducts.length === 0 ? (
            <View className="rounded-[28px] bg-white px-6 py-10 shadow-sm shadow-slate-200/70 items-center">
              <Text className="text-lg font-semibold text-slate-900">No rentals found</Text>
              <Text className="mt-2 text-sm text-slate-500 text-center">
                {activeCategory === 'All'
                  ? 'Try another search or category to discover rental options.'
                  : `No products available in ${activeCategory}. Please choose a different category.`}
              </Text>
            </View>
          ) : (
            <View className="space-y-4 pb-8">
              {rows.map((row, rowIndex) => (
                <View key={rowIndex} className="flex-row justify-between gap-3">
                  {row.map((item) => (
                    <View
                      key={item._id || item.id}
                      style={{ width: CARD_WIDTH }}
                      className="overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200"
                    >
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => router.push(`/details?productId=${encodeURIComponent(item._id || item.id)}`)}
                        className="h-32 overflow-hidden rounded-t-[22px] bg-slate-100"
                      >
                        <Image source={{ uri: getImageUri(item) }} style={{ width: '100%', height: 125 }} resizeMode="cover" />
                      </TouchableOpacity>
                      <View className="p-3">
                        <Text numberOfLines={1} className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </Text>
                        <Text className="mt-1 text-xs text-slate-500">{typeof item.price === 'number' ? `$${item.price}` : item.price}</Text>
                        <View className="mt-3 flex-row items-center justify-between">
                          <Text className="text-xs font-semibold text-amber-500">★ {item.rating || 4.6}</Text>
                          <TouchableOpacity
                            onPress={() => handleBookPress(item)}
                            activeOpacity={0.85}
                            className="rounded-full bg-cyan-600 px-3 py-2"
                          >
                            <Text className="text-[11px] font-semibold text-white">Add to Cart</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

        <Footer />
      </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default Home
