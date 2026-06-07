import Constants from 'expo-constants'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCart } from '../../_context/CartContext'
import { getProductsRequest } from '../../_context/authApi'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 44) / 2
const PAGE_SIZE = 6

const SORT_OPTIONS = ['Recommended', 'Price: Low', 'Price: High']
const PRICE_FILTERS = ['All', 'Under $50', 'Under $200', 'Premium']

const TAG_COLORS = {
  Popular: { bg: '#fef3c7', text: '#92400e' },
  New: { bg: '#d1fae5', text: '#065f46' },
  Premium: { bg: '#ede9fe', text: '#5b21b6' },
  'Top Pick': { bg: '#fee2e2', text: '#991b1b' },
  Budget: { bg: '#e0f2fe', text: '#075985' },
}

const DEFAULT_CATEGORY = 'All'

const PLACEHOLDER_IMAGE = 'https://placehold.co/300x300/e2e8f0/94a3b8?text=No+Image'
const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL?.replace(/\/+$/, '') || 'http://192.168.0.105:4000'

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

export default function ShopScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const category = typeof params.category === 'string' ? params.category : DEFAULT_CATEGORY
  const { addToCart } = useCart()

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('Recommended')
  const [sortOpen, setSortOpen] = useState(false)
  const [priceFilter, setPriceFilter] = useState('All')
  const [viewType, setViewType] = useState('grid')
  const [page, setPage] = useState(1)
  const [filterOpen, setFilterOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [category, search, sort, priceFilter])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getProductsRequest()
        setProducts(data.products || [])
      } catch (err) {
        setError(err.message || 'Unable to load products.')
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  const categoryList = useMemo(
    () => [
      DEFAULT_CATEGORY,
      ...Array.from(new Set(products.map((item) => item.category).filter(Boolean))),
    ],
    [products]
  )

  const raw = useMemo(
    () =>
      category === DEFAULT_CATEGORY
        ? products
        : products.filter(
            (item) =>
              typeof item.category === 'string' &&
              item.category.toLowerCase() === category.toLowerCase()
          ),
    [category, products]
  )

  const filtered = useMemo(() => {
    return raw
      .filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
      .filter((item) => {
        const price = Number(item.price)
        if (priceFilter === 'Under $50') return price <= 50
        if (priceFilter === 'Under $200') return price <= 200
        if (priceFilter === 'Premium') return price >= 60
        return true
      })
      .sort((a, b) => {
        if (sort === 'Price: Low') return Number(a.price) - Number(b.price)
        if (sort === 'Price: High') return Number(b.price) - Number(a.price)
        return 0
      })
  }, [raw, search, sort, priceFilter])

  const noResultsMessage = useMemo(() => {
    if (raw.length === 0 && category !== DEFAULT_CATEGORY) {
      return `No rentals available in "${category}" right now. Try another category or come back later.`
    }
    if (raw.length === 0) {
      return 'No rentals available yet. Please check back soon or try a different category.'
    }
    if (search.trim() !== '' || priceFilter !== 'All') {
      return 'No items match your current search or filter settings. Clear them to see more results.'
    }
    return 'No items found. Try another filter or clear your search keywords.'
  }, [raw.length, category, search, priceFilter])

  const hasActiveFilters = search.trim().length > 0 || priceFilter !== 'All'
  const visibleItems = filtered.slice(0, page * PAGE_SIZE)
  const canLoadMore = visibleItems.length < filtered.length

  const handleBookPress = useCallback(
    (item) => {
      addToCart({
        id: item._id || item.id,
        title: item.title,
        price: Number(item.price) || 0,
        qty: 1,
        image: getImageUri(item),
        variant: item.category || item.tag || `$${item.price}`,
        ownerId: item?.createdBy?._id || item?.createdBy?.id || null,
        ownerName: item?.createdBy?.name || null,
        ownerAvatar: item?.createdBy?.avatarUrl || null,
      })
      router.push('/cart')
    },
    [addToCart, router]
  )

  const formatPrice = (price) => {
    if (typeof price === 'number') return `$${price}`
    return price?.toString().includes('$') ? price : `$${price}`
  }

  const renderItem = useCallback(
    ({ item }) => {
      const tag = TAG_COLORS[item.tag] ?? { bg: '#f8fafc', text: '#334155' }
      return (
        <TouchableOpacity
          activeOpacity={0.88}
          className="mb-4 rounded-[26px] bg-white shadow-lg shadow-slate-200"
          style={viewType === 'grid' ? { width: CARD_WIDTH } : { width: '100%' }}
          onPress={() => router.push(`/details?productId=${encodeURIComponent(item._id || item.id)}`)}
        >
          <View className="relative h-44 overflow-hidden rounded-t-[26px] bg-slate-100">
            <Image source={{ uri: getImageUri(item) }} className="h-full w-full" resizeMode="cover" />
            {(item.tag || item.category) ? (
              <View className="absolute left-3 top-3 rounded-full px-3 py-1" style={{ backgroundColor: tag.bg }}>
                <Text className="text-[11px] font-semibold" style={{ color: tag.text }}>
                  {item.tag || item.category}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="p-4">
            <Text numberOfLines={1} className="text-sm font-semibold text-slate-900">{item.title}</Text>
            <Text className="mt-1 text-sm font-semibold text-cyan-700">{formatPrice(item.price)}</Text>
            <View className="mt-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text className="text-sm text-slate-600">{item.rating || 4.6}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                className="rounded-full bg-cyan-600 px-4 py-2"
                onPress={() => handleBookPress(item)}
              >
                <Text className="text-sm font-semibold text-white">Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )
    },
    [handleBookPress, router, viewType]
  )

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View className="flex px-4 ">
              <View className="flex-row items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.85}
            className="h-11 w-11 items-center justify-center rounded-3xl bg-white shadow-lg shadow-slate-200"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>

          <Text className="text-lg font-semibold text-slate-900">{category}</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            className="h-11 w-11 items-center justify-center rounded-3xl bg-white shadow-lg shadow-slate-200"
            onPress={() => setFilterOpen(true)}
          >
            <Ionicons name="options-outline" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <View className="mt-4 rounded-[28px] bg-white px-4 py-4 shadow-sm shadow-slate-200/60">
          <View className="flex-row items-center rounded-[20px] bg-slate-100 px-4 py-3">
            <Ionicons name="search-outline" size={18} color="#64748b" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={`Search ${category.toLowerCase()}...`}
              placeholderTextColor="#94a3b8"
              className="ml-3 flex-1 text-slate-900"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-row flex-wrap gap-2">
              {PRICE_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  activeOpacity={0.85}
                  onPress={() => setPriceFilter(filter)}
                  className={`rounded-full px-4 py-2 ${priceFilter === filter ? 'bg-cyan-600' : 'bg-slate-100'}`}
                >
                  <Text className={`text-sm font-semibold ${priceFilter === filter ? 'text-white' : 'text-slate-700'}`}>{filter}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setViewType('grid')}
                className={`h-10 w-10 items-center justify-center rounded-2xl ${viewType === 'grid' ? 'bg-cyan-600' : 'bg-slate-100'}`}
              >
                <Ionicons name="grid-outline" size={18} color={viewType === 'grid' ? '#fff' : '#0f172a'} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setViewType('list')}
                className={`h-10 w-10 items-center justify-center rounded-2xl ${viewType === 'list' ? 'bg-cyan-600' : 'bg-slate-100'}`}
              >
                <Ionicons name="list-outline" size={18} color={viewType === 'list' ? '#fff' : '#0f172a'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2">
          {categoryList.map((section) => (
            <TouchableOpacity
              key={section}
              activeOpacity={0.85}
              onPress={() => router.push(`/shop?category=${encodeURIComponent(section)}`)}
              className={`rounded-full px-4 py-2 ${section === category ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-200'}`}
              style={{ borderWidth: 1 }}
            >
              <Text className={`text-sm font-semibold ${section === category ? 'text-white' : 'text-slate-700'}`}>{section}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View className="mt-4 px-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-slate-900">{filtered.length} results</Text>
          <TouchableOpacity onPress={() => setSortOpen(!sortOpen)} className="rounded-full bg-white px-4 py-2 shadow-sm shadow-slate-200">
            <Text className="text-sm font-semibold text-cyan-700">Sort: {sort}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center px-4 py-10">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : error ? (
        <View className="mx-4 mt-8 rounded-[28px] bg-rose-50 px-6 py-8 shadow-lg shadow-rose-200">
          <Text className="text-base font-semibold text-rose-700">{error}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setError(null)
              setLoading(true)
              getProductsRequest()
                .then((data) => setProducts(data.products || []))
                .catch((err) => setError(err.message || 'Unable to load products.'))
                .finally(() => setLoading(false))
            }}
            className="mt-5 rounded-3xl bg-cyan-600 px-4 py-3"
          >
            <Text className="text-center text-sm font-semibold text-white">Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1 px-4 pt-4">
          {visibleItems.length === 0 ? (
            <View className="mt-12 items-center rounded-[28px] bg-white px-6 py-10 shadow-lg shadow-slate-200">
              <Ionicons name="alert-circle-outline" size={42} color="#94a3b8" />
              <Text className="mt-4 text-lg font-semibold text-slate-900">No items found</Text>
              <Text className="mt-2 text-center text-sm text-slate-500">{noResultsMessage}</Text>
              {category !== DEFAULT_CATEGORY ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/shop')}
                  className="mt-5 rounded-full bg-cyan-600 px-5 py-3 shadow-lg shadow-cyan-500/20"
                >
                  <Text className="text-sm font-semibold text-white">Browse all categories</Text>
                </TouchableOpacity>
              ) : hasActiveFilters ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setSearch('')
                    setPriceFilter('All')
                  }}
                  className="mt-5 rounded-full bg-cyan-600 px-5 py-3 shadow-lg shadow-cyan-500/20"
                >
                  <Text className="text-sm font-semibold text-white">Clear filters</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <FlatList
              key={`flatlist-${viewType}`}
              data={visibleItems}
              keyExtractor={(item) => item._id || item.id}
              renderItem={renderItem}
              numColumns={viewType === 'grid' ? 2 : 1}
              columnWrapperStyle={viewType === 'grid' ? { justifyContent: 'space-between' } : undefined}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 180 }}
            />
          )}

          {canLoadMore ? (
            <TouchableOpacity
              activeOpacity={0.85}
              className="m-4 rounded-[28px] bg-cyan-600 px-5 py-4 items-center shadow-lg shadow-cyan-500/20"
              onPress={() => setPage((prev) => prev + 1)}
            >
              <Text className="text-base font-semibold text-white">Load more</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {filterOpen ? (
        <View className="absolute inset-0 bg-slate-950/30 px-4 py-20">
          <View className="mx-auto h-full w-full max-w-[520px] rounded-[32px] bg-white p-5 shadow-2xl shadow-slate-900/20">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">Filter results</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View className="mt-6 space-y-4">
              <View>
                <Text className="text-sm font-semibold text-slate-700">Price range</Text>
                <View className="mt-3 flex-row flex-wrap gap-3">
                  {PRICE_FILTERS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setPriceFilter(option)}
                      className={`rounded-full border px-4 py-2 ${priceFilter === option ? 'border-cyan-600 bg-cyan-600' : 'border-slate-200 bg-slate-50'}`}
                    >
                      <Text className={`text-sm font-semibold ${priceFilter === option ? 'text-white' : 'text-slate-700'}`}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View>
                <Text className="text-sm font-semibold text-slate-700">Sort option</Text>
                <View className="mt-3 flex-row flex-wrap gap-3">
                  {SORT_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setSort(option)}
                      className={`rounded-full border px-4 py-2 ${sort === option ? 'border-cyan-600 bg-cyan-600' : 'border-slate-200 bg-slate-50'}`}
                    >
                      <Text className={`text-sm font-semibold ${sort === option ? 'text-white' : 'text-slate-700'}`}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              className="mt-8 rounded-[28px] bg-cyan-600 px-5 py-4 items-center shadow-lg shadow-cyan-500/20"
              onPress={() => setFilterOpen(false)}
            >
              <Text className="text-base font-semibold text-white">Apply filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
