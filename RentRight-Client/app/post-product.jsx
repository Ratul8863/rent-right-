import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import Constants from 'expo-constants'
import { useAuth } from '../_context/AuthContext'
import { createProductRequest } from '../_context/authApi'

const CLOUDINARY_CLOUD_NAME = Constants.expoConfig?.extra?.CLOUDINARY_CLOUD_NAME || ''
const CLOUDINARY_UPLOAD_PRESET = Constants.expoConfig?.extra?.CLOUDINARY_UPLOAD_PRESET || ''

const CATEGORY_LIST = [
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

export default function PostProduct() {
  const router = useRouter()
  const { isAuthenticated, accessToken, user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORY_LIST[0])
  const [categoryOptions] = useState(CATEGORY_LIST)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [images, setImages] = useState([null, null, null])
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState([false, false, false])
  const [message, setMessage] = useState(null)

  const allowed = useMemo(
    () => ['member', 'admin'].includes(user?.role),
    [user]
  )

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/sign-in')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (!category) {
      setCategory(CATEGORY_LIST[0])
    }
  }, [category])

  const pickImage = async (index) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        ImagePicker.MediaType?.Images ||
        ImagePicker.MediaTypeOptions?.Images ||
        'Images',
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    })

    if (!result.canceled && result.assets?.length > 0) {
      const uri = result.assets[0].uri
      if (!uri || typeof uri !== 'string') {
        setMessage('Invalid image selected. Please try again.')
        return
      }

      // show local preview immediately and mark uploading
      setImages((prev) => prev.map((item, idx) => (idx === index ? uri : item)))
      setUploadingImages((prev) => prev.map((v, idx) => (idx === index ? true : v)))
      setMessage(null)

      try {
        const uploadedUrl = await uploadToCloudinary(uri)
        if (!uploadedUrl || typeof uploadedUrl !== 'string') {
          throw new Error('Failed to get upload URL from Cloudinary')
        }
        setImages((prev) => prev.map((item, idx) => (idx === index ? uploadedUrl : item)))
        setMessage(null)
      } catch (err) {
        console.error(`Image ${index + 1} upload error:`, err)
        setImages((prev) => prev.map((item, idx) => (idx === index ? null : item)))
        setMessage(`Image ${index + 1} upload failed: ${err.message || 'Please try again.'}`)
      } finally {
        setUploadingImages((prev) => prev.map((v, idx) => (idx === index ? false : v)))
      }
    }
  }

  // Upload image file URI to Cloudinary (unsigned upload preset)
  const uploadToCloudinary = async (fileUri) => {
    if (!fileUri) return null

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error('Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET to app.json extra.')
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`

    try {
      const formData = new FormData()
      // derive file name and type
      const uriParts = fileUri.split('/')
      const name = uriParts[uriParts.length - 1] || `upload_${Date.now()}.jpg`
      const fileTypeMatch = name.match(/\.(\w+)$/)
      const ext = fileTypeMatch ? fileTypeMatch[1] : 'jpg'
      const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`

      // For React Native, use the uri directly
      const file = {
        uri: fileUri,
        type: type,
        name: name,
      }
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type; let fetch set the boundary for multipart
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Cloudinary upload failed')
      }

      const uploadedUrl = data.secure_url || data.url
      if (!uploadedUrl) {
        throw new Error('No URL returned from Cloudinary')
      }
      return uploadedUrl
    } catch (error) {
      console.error('Cloudinary upload error:', error)
      throw error
    }
  }

  const handleSubmit = async () => {
    const hasAllImages = images.every((item) => item)
    if (!title || !description || !category || !price || !hasAllImages) {
      setMessage('Please fill in every field and select 3 images.')
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Ensure there are no local file:// URIs left — upload any remaining local files
      const finalImages = await Promise.all(images.map(async (img, idx) => {
        if (!img) return img
        if (typeof img === 'string' && img.startsWith('file://')) {
          setUploadingImages((prev) => prev.map((v, i) => (i === idx ? true : v)))
          try {
            const secure = await uploadToCloudinary(img)
            return secure || img
          } catch (err) {
            return img
          } finally {
            setUploadingImages((prev) => prev.map((v, i) => (i === idx ? false : v)))
          }
        }
        return img
      }))

      await createProductRequest(
        {
          title,
          description,
          category,
          price: Number(price),
          duration: Number(duration),
          images: finalImages,
        },
        accessToken
      )
      Alert.alert('Success', 'Your product has been posted.', [
        { text: 'OK', onPress: () => router.push('/my-posts') },
      ])
    } catch (error) {
      setMessage(error.message || 'Unable to post product.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) return null

  if (!allowed) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="mx-4 mt-10 rounded-[28px] bg-white p-6 shadow-sm shadow-slate-200">
          <Text className="text-xl font-semibold text-slate-900">Access denied</Text>
          <Text className="mt-3 text-sm text-slate-600">
            Only members can post products. Ask an admin to upgrade your account to a member.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.replace('/(tabs)')}
            className="mt-6 rounded-3xl bg-cyan-600 px-4 py-3"
          >
            <Text className="text-center text-sm font-semibold text-white">Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={{ paddingBottom: 36 }} className="px-4 pt-6" keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-bold text-slate-900">Post a product</Text>
        <Text className="mt-2 text-sm text-slate-600">
          Share your rental item with customers by providing a title, price and image.
        </Text>

        <View className="mt-6 space-y-4">
          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">Product title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Comfortable family car"
              placeholderTextColor="#94a3b8"
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-slate-900"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">Description</Text>
            <TextInput
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the product and rental details"
              placeholderTextColor="#94a3b8"
              className="min-h-[120px] rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-slate-900"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">Category</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowCategoryPicker((prev) => !prev)}
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-4"
            >
              <View className="flex-row items-center justify-between">
                <Text className={`text-sm ${category ? 'text-slate-900' : 'text-slate-500'}`}>
                  {category || 'Select category'}
                </Text>
                <Text className="text-slate-400">{showCategoryPicker ? '▲' : '▼'}</Text>
              </View>
            </TouchableOpacity>

            {showCategoryPicker ? (
              <View className="mt-2 rounded-[22px] border border-slate-200 bg-white shadow-sm shadow-slate-200">
                {categoryOptions.length > 0 ? (
                  categoryOptions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={0.85}
                      onPress={() => {
                        setCategory(item)
                        setShowCategoryPicker(false)
                      }}
                      className="border-b border-slate-100 px-4 py-3"
                    >
                      <Text className="text-sm text-slate-700">{item}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View className="px-4 py-3">
                    <Text className="text-sm text-slate-500">Loading categories...</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">Price</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="e.g. 50"
              placeholderTextColor="#94a3b8"
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-slate-900"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">Rental duration (days)</Text>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              placeholder="e.g. 7"
              placeholderTextColor="#94a3b8"
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-slate-900"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">Upload 3 images</Text>
            <View className="flex-row flex-wrap items-center gap-3">
              {images.map((uri, index) => (
                <TouchableOpacity
                  key={`image-${index}`}
                  activeOpacity={0.8}
                  onPress={() => pickImage(index)}
                  className="h-28 w-28 items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100"
                >
                  {uri ? (
                    <View className="h-full w-full relative">
                      <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
                      {uploadingImages[index] ? (
                        <View className="absolute inset-0 items-center justify-center bg-black/30">
                          <ActivityIndicator color="#fff" />
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <Text className="text-sm font-semibold text-slate-500">Add {index + 1}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text className="mt-2 text-xs text-slate-500">Tap each box to choose a photo from your gallery.</Text>
          </View>
        </View>

        {message ? (
          <View className="mt-4 rounded-[22px] bg-rose-50 px-4 py-3">
            <Text className="text-sm text-rose-600">{message}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={loading}
          className="mt-8 rounded-3xl bg-cyan-600 px-4 py-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-center text-sm font-semibold text-white">Post product</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
