import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dimensions,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Animated,
  ActivityIndicator,
} from 'react-native'
import Carousel from 'react-native-reanimated-carousel'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useCart } from '../../_context/CartContext'
import { getProductRequest, getProductsRequest } from '../../_context/authApi'

const { width } = Dimensions.get('window')

const getImageUri = (item) => {
  if (!item) return ''
  if (typeof item.imageUrl === 'string' && item.imageUrl.trim()) return item.imageUrl
  if (typeof item.image === 'string' && item.image.trim()) return item.image
  const images = Array.isArray(item.images) ? item.images : []
  return images
    .map((img) => (typeof img === 'string' ? img : img?.uri || img?.url))
    .find(Boolean) || ''
}

const ProductDetails = () => {
  const { productId } = useLocalSearchParams()
  const router = useRouter()
  const { addToCart } = useCart()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [zoomScale] = useState(new Animated.Value(1))
  const [product, setProduct] = useState(null)
  const [similarProducts, setSimilarProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [failedImages, setFailedImages] = useState(new Set())
  const panResponder = useRef(null)

  // Handle missing productId
  useEffect(() => {
    if (!productId) {
      setError('No product selected')
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    if (!productId) return

    const loadProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getProductRequest(productId)
        if (!data?.product) {
          setError('Product not found')
          setProduct(null)
        } else {
          setProduct(data.product)
        }
      } catch (err) {
        console.error('Load product error:', err)
        setError(err.message || 'Unable to load product.')
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId])

  useEffect(() => {
    if (!product?.category) return

    const loadSimilar = async () => {
      try {
        const data = await getProductsRequest()
        const related = (data.products || [])
          .filter((item) => item._id !== product._id && item.category === product.category)
          .slice(0, 3)
        setSimilarProducts(related)
      } catch (err) {
        console.error('Load similar products error:', err)
      }
    }

    loadSimilar()
  }, [product])

  const normalizedImages = product?.images
    ? product.images
        .map((img) => {
          if (typeof img === 'string' && img.trim()) return img
          if (typeof img === 'object' && img) {
            return img.url || img.uri || img.secure_url || null
          }
          return null
        })
        .filter(Boolean)
    : []
  const images = normalizedImages.length > 0
    ? normalizedImages
    : [getImageUri(product)].filter(Boolean)
  const priceLabel = typeof product?.price === 'number' ? `$${product.price}` : product?.price
  const rating = product?.rating || 4.6
  const reviews = product?.reviews || 0

  const handleBook = () => {
    addToCart({
      id: product?._id || product?.id,
      title: product?.title,
      price: typeof product?.price === 'number' ? product.price : parseInt(String(product?.price).replace(/[^0-9]/g, ''), 10) || 0,
      qty: 1,
      image: product?.imageUrl || product?.image,
      variant: priceLabel,
      ownerId: product?.createdBy?._id || product?.createdBy?.id || null,
      ownerName: product?.createdBy?.name || null,
      ownerAvatar: product?.createdBy?.avatarUrl || null,
    })
    router.push('/cart')
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </SafeAreaView>
    )
  }

  if (error || !product) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-rose-700">{error || 'Product not found.'}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.back()}
            className="mt-6 rounded-3xl bg-cyan-600 px-4 py-3"
          >
            <Text className="text-center text-sm font-semibold text-white">Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <View className="px-4 pt-4">
          <TouchableOpacity
            activeOpacity={0.8}
            className="mb-4 h-11 w-11 items-center justify-center rounded-3xl bg-white shadow-lg shadow-slate-200 z-10"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Main Image Carousel with Professional Gallery */}
        <View className="relative">
          <Carousel
            loop
            width={width}
            height={380}
            data={images}
            scrollAnimationDuration={500}
            onSnapToItem={(index) => setCurrentImageIndex(index)}
            renderItem={({ item }) => (
              <View className="mx-2 overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-100 to-slate-200 shadow-2xl shadow-slate-300/40">
                {!item || failedImages.has(item) ? (
                  <View className="w-full h-full items-center justify-center bg-slate-200">
                    <Ionicons name="image-outline" size={60} color="#94a3b8" />
                    <Text className="text-slate-500 text-sm font-semibold mt-2">Image unavailable</Text>
                  </View>
                ) : (
                  <Image 
                    source={{ uri: item }} 
                    style={{ width: '100%', height: 380 }} 
                    resizeMode="cover"
                    onError={() => {
                      console.warn('Failed to load image:', item)
                      setFailedImages(prev => new Set([...prev, item]))
                    }}
                  />
                )}
                {/* Gradient overlay */}
                <View className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                
                {/* Tag badge */}
                <View className="absolute top-5 left-5 rounded-full bg-black/30 backdrop-blur-sm px-3 py-1 flex-row items-center gap-1.5">
                  <Ionicons name="star" size={12} color="#fbbf24" />
                  <Text className="text-xs font-semibold uppercase tracking-[0.5px] text-white">{product?.tag || product?.category || 'Featured'}</Text>
                </View>

                {/* Zoom indicator */}
                <View className="absolute bottom-5 right-5 rounded-full bg-black/30 backdrop-blur-sm px-3 py-1.5 flex-row items-center gap-1">
                  <Ionicons name="search" size={14} color="#ffffff" />
                  <Text className="text-xs font-semibold text-white">Pinch to zoom</Text>
                </View>
              </View>
            )}
          />

          {/* Image counter and indicators */}
          <View className="absolute bottom-5 left-0 right-0 flex-row items-center justify-between px-6">
            <View className="flex-row gap-2">
              {images.map((_, idx) => (
                <View
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentImageIndex
                      ? 'bg-white w-6 shadow-lg'
                      : 'bg-white/40 w-2'
                  }`}
                />
              ))}
            </View>
            <View className="rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
              <Text className="text-xs font-semibold text-white">
                {currentImageIndex + 1}/{images.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Product Details Section */}
        <View className="mt-[-20px] rounded-t-[34px] bg-white px-5 pt-6 pb-6 shadow-lg shadow-slate-200/50">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-2xl font-extrabold text-slate-900">{product?.title}</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-cyan-50 px-3 py-1">
                  <Text className="text-xs font-semibold text-cyan-700">{priceLabel}</Text>
                </View>
                <View className="rounded-full bg-amber-100 px-3 py-1">
                  <Text className="text-xs font-semibold text-amber-700">{rating} ★</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity className="rounded-3xl bg-slate-100 p-3 shadow-sm shadow-slate-200">
              <Ionicons name="heart-outline" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View className="mt-5 rounded-[28px] bg-slate-50 p-4">
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-lg font-semibold text-slate-900">{rating}</Text>
                <Text className="text-xs text-slate-500">Rating</Text>
              </View>
              <View className="h-10 w-px bg-slate-200" />
              <View className="items-center">
                <Text className="text-lg font-semibold text-slate-900">{reviews}</Text>
                <Text className="text-xs text-slate-500">Reviews</Text>
              </View>
              <View className="h-10 w-px bg-slate-200" />
              <View className="items-center">
                <Text className="text-lg font-semibold text-slate-900">4.9</Text>
                <Text className="text-xs text-slate-500">Trust</Text>
              </View>
            </View>
          </View>

          <View className="mt-6 rounded-[28px] bg-slate-50 p-4">
            <Text className="text-sm font-semibold text-slate-700">Rental details</Text>
            <View className="mt-4 space-y-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-500">Price</Text>
                <Text className="text-sm font-semibold text-slate-900">{priceLabel}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-500">Duration</Text>
                <Text className="text-sm font-semibold text-slate-900">
                  {product?.duration ? `${product.duration} days` : 'Flexible'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-500">Category</Text>
                <Text className="text-sm font-semibold text-slate-900">{product?.category || 'N/A'}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-500">Availability</Text>
                <Text className={`text-sm font-semibold ${product ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {product ? 'Available' : 'Unavailable'}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-6 space-y-4">
            <View>
              <Text className="text-sm font-semibold text-slate-700">Description</Text>
              <Text className="mt-3 text-sm leading-6 text-slate-600">
                {product?.description || 'Premium rental product with flexible pickup, easy booking, and trusted support for every trip.'}
              </Text>
            </View>

            <View className="rounded-[28px] bg-slate-50 p-4">
              <Text className="text-sm font-semibold text-slate-700">Specifications</Text>
              <View className="mt-4 space-y-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-500">Condition</Text>
                  <Text className="text-sm font-semibold text-slate-900">Excellent</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-500">Pickup</Text>
                  <Text className="text-sm font-semibold text-slate-900">Flexible</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-500">Duration</Text>
                  <Text className="text-sm font-semibold text-slate-900">Daily / Monthly</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Thumbnail strip */}
          <View className="mt-6">
            <Text className="text-sm font-semibold text-slate-700 mb-3">Photo Gallery</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-3">
              {images.map((img, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => setCurrentImageIndex(idx)}
                  className={`rounded-[16px] overflow-hidden border-2 ${
                    idx === currentImageIndex ? 'border-cyan-600' : 'border-slate-200'
                  } shadow-sm`}
                >
                  {!img || failedImages.has(img) ? (
                    <View style={{ width: 80, height: 80 }} className="items-center justify-center bg-slate-200">
                      <Ionicons name="image-outline" size={24} color="#94a3b8" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: img }}
                      style={{ width: 80, height: 80 }}
                      resizeMode="cover"
                      onError={() => {
                        setFailedImages(prev => new Set([...prev, img]))
                      }}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View className="mt-6 space-y-4 px-4">
          <Text className="text-sm font-semibold text-slate-700">Similar Rentals</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-3">
            {similarProducts.map((item) => {
              const itemImage = getImageUri(item)
              return (
                <TouchableOpacity
                  key={item._id || item.id}
                  activeOpacity={0.88}
                  onPress={() => router.push(`/details?productId=${encodeURIComponent(item._id || item.id)}`)}
                  className="w-[160px] overflow-hidden rounded-[20px] bg-white shadow-lg shadow-slate-200"
                >
                  {!itemImage || failedImages.has(itemImage) ? (
                    <View className="w-full h-[100px] items-center justify-center bg-slate-200">
                      <Ionicons name="image-outline" size={32} color="#94a3b8" />
                    </View>
                  ) : (
                    <Image 
                      source={{ uri: itemImage }} 
                      style={{ width: '100%', height: 100 }} 
                      resizeMode="cover"
                      onError={() => {
                        setFailedImages(prev => new Set([...prev, itemImage]))
                      }}
                  />
                  )}
                  <View className="p-3">
                    <Text numberOfLines={1} className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">{item.price}</Text>
                    <Text className="mt-2 text-xs font-semibold text-cyan-700">{item.rating} ★</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Fixed Book Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white px-4 pb-6 pt-4 shadow-2xl shadow-slate-900/10 rounded-t-[32px]">
        <TouchableOpacity
          activeOpacity={0.85}
          className="rounded-[28px] bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-5 items-center shadow-lg shadow-cyan-500/30"
          onPress={handleBook}
        >
          <Text className="text-base font-extrabold text-white">Book Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default ProductDetails
