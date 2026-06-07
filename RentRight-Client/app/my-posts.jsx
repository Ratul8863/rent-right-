import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../_context/AuthContext'
import { deleteProductRequest, getMyProductsRequest } from '../_context/authApi'

const PostCard = ({ product, onDelete, deleting }) => {
  const imageUri = product.imageUrl || product.image || product.images?.[0]
  const validImageUri = imageUri && (typeof imageUri === 'string' && imageUri.trim() ? imageUri : null)

  return (
    <View className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/60 mb-4">
      {validImageUri ? (
        <View className="relative h-48 w-full overflow-hidden rounded-[28px] bg-slate-100">
          <Image
            source={{ uri: validImageUri }}
            className="h-full w-full"
            resizeMode="cover"
          />
        </View>
      ) : (
        <View className="h-48 w-full rounded-[28px] bg-slate-200 items-center justify-center">
          <Text className="text-slate-400 text-sm">No image</Text>
        </View>
      )}
      <View className="flex-row items-start justify-between gap-4 mt-4">
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900">{product.title}</Text>
          <Text className="mt-1 text-sm text-slate-500">{product.category}</Text>
        </View>
        <Text className="text-lg font-black text-cyan-700">${product.price}</Text>
      </View>
      <Text className="mt-3 text-sm leading-5 text-slate-600">{product.description}</Text>
      <View className="mt-4 flex-row items-center justify-between gap-3">
        <Text className="text-xs uppercase tracking-wide text-slate-400">Posted {new Date(product.createdAt).toLocaleDateString('en-GB')}</Text>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onDelete(product._id)}
          disabled={deleting}
          className="rounded-3xl bg-rose-100 px-4 py-2"
        >
          <Text className="text-sm font-semibold text-rose-700">{deleting ? 'Removing...' : 'Remove'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function MyPosts() {
  const router = useRouter()
  const { isAuthenticated, accessToken } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingPostId, setDeletingPostId] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/sign-in')
      return
    }

    const loadPosts = async () => {
      try {
        setLoading(true)
        const data = await getMyProductsRequest(accessToken)
        setPosts(data.products || [])
      } catch (err) {
        setError(err.message || 'Unable to load your posts.')
      } finally {
        setLoading(false)
      }
    }

    loadPosts()
  }, [accessToken, isAuthenticated, router])

  const handleDelete = (id) => {
    Alert.alert('Delete product', 'Are you sure you want to remove this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingPostId(id)
            await deleteProductRequest(id, accessToken)
            setPosts((current) => current.filter((post) => post._id !== id))
          } catch (err) {
            Alert.alert('Error', err.message || 'Unable to delete the post.')
          } finally {
            setDeletingPostId(null)
          }
        },
      },
    ])
  }

  if (!isAuthenticated) return null

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} className="px-4 pt-6">
        <Text className="text-2xl font-bold text-slate-900">Manage your posts</Text>
        <Text className="mt-2 text-sm text-slate-600">
          View all products you posted and remove listings when you need to.
        </Text>

        <View className="mt-6 flex-row gap-3">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)')}
            className="flex-1 rounded-3xl bg-slate-200 px-4 py-3"
          >
            <Text className="text-center text-sm font-semibold text-slate-900">Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/post-product')}
            className="flex-1 rounded-3xl bg-cyan-600 px-4 py-3"
          >
            <Text className="text-center text-sm font-semibold text-white">Post a new product</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="mt-10 items-center justify-center">
            <ActivityIndicator size="large" color="#0ea5e9" />
          </View>
        ) : error ? (
          <View className="mt-8 rounded-3xl bg-rose-50 px-4 py-4">
            <Text className="text-sm font-semibold text-rose-700">{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setError(null)
                setLoading(true)
                getMyProductsRequest(accessToken)
                  .then((data) => setPosts(data.products || []))
                  .catch((err) => setError(err.message || 'Unable to load your posts.'))
                  .finally(() => setLoading(false))
              }}
              className="mt-3 rounded-3xl bg-cyan-600 px-4 py-3"
            >
              <Text className="text-center text-sm font-semibold text-white">Try again</Text>
            </TouchableOpacity>
          </View>
        ) : posts.length === 0 ? (
          <View className="mt-8 rounded-3xl bg-white px-5 py-8 shadow-sm shadow-slate-200/60">
            <Text className="text-base font-semibold text-slate-900">No posts yet</Text>
            <Text className="mt-2 text-sm text-slate-600">It looks like you have not posted any products yet.</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/post-product')}
              className="mt-5 rounded-3xl bg-cyan-600 px-4 py-3"
            >
              <Text className="text-center text-sm font-semibold text-white">Create your first post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mt-6">
            {posts.map((product) => (
              <PostCard
                key={product._id}
                product={product}
                onDelete={handleDelete}
                deleting={deletingPostId === product._id}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
