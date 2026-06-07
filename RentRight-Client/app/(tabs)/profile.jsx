import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../_context/AuthContext'
import { useCart } from '../../_context/CartContext'
import { meRequest, updateProfileRequest } from '../../_context/authApi'

const PICKER_MEDIA_IMAGES =
  ImagePicker.MediaTypeOptions?.Images ||
  'Images'

// ─── Tiny helpers ────────────────────────────────────────────────────────────

const InfoRow = ({ icon, label, value }) => (
  <View className="flex-row items-center gap-4 px-1 py-3 border-b border-slate-100 last:border-0">
    <View className="h-9 w-9 items-center justify-center rounded-2xl bg-cyan-50">
      <Ionicons name={icon} size={18} color="#0ea5e9" />
    </View>
    <View className="flex-1">
      <Text className="text-xs text-slate-400 font-medium tracking-wide uppercase">{label}</Text>
      <Text className="mt-0.5 text-sm font-semibold text-slate-800">{value || '—'}</Text>
    </View>
  </View>
)

const StatCard = ({ icon, value, label, accent }) => (
  <View
    className="flex-1 rounded-3xl p-4 shadow-sm"
    style={{ backgroundColor: accent + '12' }}
  >
    <View
      className="h-10 w-10 items-center justify-center rounded-2xl mb-3"
      style={{ backgroundColor: accent + '20' }}
    >
      <Ionicons name={icon} size={20} color={accent} />
    </View>
    <Text className="text-2xl font-black" style={{ color: accent }}>{value}</Text>
    <Text className="mt-0.5 text-xs text-slate-500 font-medium">{label}</Text>
  </View>
)

const SettingRow = ({ icon, label, onPress, danger }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    className="flex-row items-center justify-between px-1 py-3.5 border-b border-slate-100 last:border-0"
  >
    <View className="flex-row items-center gap-4">
      <View
        className="h-9 w-9 items-center justify-center rounded-2xl"
        style={{ backgroundColor: danger ? '#fee2e2' : '#dbf7ff' }}
      >
        <Ionicons name={icon} size={18} color={danger ? '#ef4444' : '#0f766e'} />
      </View>
      <Text
        className="text-sm font-semibold"
        style={{ color: danger ? '#ef4444' : '#0f172a' }}
      >
        {label}
      </Text>
    </View>
    {!danger && <Ionicons name="chevron-forward" size={16} color="#a5b4fc" />}
  </TouchableOpacity>
)

// ─── Main Screen ─────────────────────────────────────────────────────────────

const Profile = () => {
  const router = useRouter()
  const { isAuthenticated, user, accessToken, logout, updateUser } = useAuth()

  const { cartItems, bookings } = useCart()
  const [profile, setProfile] = useState(user)
  const [name, setName] = useState(user?.name || '')
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)
  const [avatarUri, setAvatarUri] = useState(user?.avatarUrl || null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.qty, 0)
  const bookingItemCount = bookings.reduce((sum, item) => sum + item.qty, 0)

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) router.replace('/sign-in')
  }, [isAuthenticated, router])

  // ── Load profile ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    const loadProfile = async () => {
      if (!accessToken) {
        setProfile(user)
        setName(user?.name || '')
        setAvatarUri(user?.avatarUrl || null)
        setProfileLoading(false)
        return
      }
      try {
        setProfileLoading(true)
        const data = await meRequest(accessToken)
        setProfile(data.user)
        setName(data.user?.name || user?.name || '')
        setAvatarUri(data.user?.avatarUrl || user?.avatarUrl || null)
      } catch (error) {
        setProfileError(error.message)
        setProfile(user)
        setName(user?.name || '')
      } finally {
        setProfileLoading(false)
      }
    }
    loadProfile()
  }, [accessToken, isAuthenticated, user])

  // ── Initials fallback ───────────────────────────────────────────────────
  const initials = useMemo(() => {
    const name = profile?.name || user?.name || ''
    return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  }, [profile, user])

  // ── Date helpers ────────────────────────────────────────────────────────
  const memberSinceDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A'

  // ── Profile picture picker ──────────────────────────────────────────────
  const handleAvatarPress = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Camera', onPress: pickFromCamera },
      { text: 'Gallery', onPress: pickFromGallery },
      avatarUri ? { text: 'Remove Photo', style: 'destructive', onPress: () => setAvatarUri(null) } : null,
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean))
  }

  const buildAvatarUri = (asset) => {
    if (!asset) return null
    if (asset.base64) {
      return `data:image/jpeg;base64,${asset.base64}`
    }
    return asset.uri || null
  }

  const handleSaveProfile = async () => {
    if (!accessToken) {
      setProfileError('Unable to update profile without authentication.')
      return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      setProfileError('Name cannot be empty.')
      return
    }

    setSaveLoading(true)
    setSaveMessage('')
    setProfileError(null)

    try {
      const payload = {
        name: trimmedName,
        avatarUrl: avatarUri || null,
      }
      const data = await updateProfileRequest(accessToken, payload)
      setProfile(data.user)
      setName(data.user.name || trimmedName)
      setAvatarUri(data.user.avatarUrl || null)
      if (updateUser) {
        updateUser(data.user)
      }
      setSaveMessage('Profile saved successfully.')
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setSaveLoading(false)
    }
  }

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: PICKER_MEDIA_IMAGES,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    })
    if (!result.canceled) {
      const newUri = buildAvatarUri(result.assets[0])
      if (newUri) {
        setAvatarUri(newUri)
      }
    }
  }

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    })
    if (!result.canceled) {
      const newUri = buildAvatarUri(result.assets[0])
      if (newUri) {
        setAvatarUri(newUri)
      }
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/sign-in')
        },
      },
    ])
  }

  if (!isAuthenticated) return null

  return (
    <SafeAreaView className="flex-1 bg-cyan-50" edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 2 }}
          >
        {/* ── Header bar ─────────────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <Text className="text-xl font-black text-cyan-900 tracking-tight">My Profile</Text>
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-sm shadow-cyan-200/70"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#0f766e" />
          </TouchableOpacity>
        </View>

        {/* ── Hero card ───────────────────────────────────────────────────── */}
        <View className="mx-4 mt-3 rounded-[28px] overflow-hidden bg-cyan-900 shadow-xl shadow-cyan-900/20">
          {/* Decorative blobs */}
          <View
            className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-cyan-700 opacity-40"
            style={{ transform: [{ scaleX: 1.4 }] }}
          />
          <View
            className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-cyan-800 opacity-30"
          />

          <View className="px-6 pt-6 pb-7">
            {/* Avatar row */}
            <View className="flex-row items-end gap-4">
              {/* Avatar */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleAvatarPress}
                className="relative"
              >
                <View className="h-20 w-20 rounded-[22px] bg-cyan-500 items-center justify-center overflow-hidden border-2 border-white/30">
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      className="h-20 w-20"
                      resizeMode="cover"
                    />
                  ) : profileLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-2xl font-black text-white">{initials || 'U'}</Text>
                  )}
                </View>
                {/* Camera badge */}
                <View className="absolute -bottom-1.5 -right-1.5 h-7 w-7 items-center justify-center rounded-full bg-white shadow-md shadow-cyan-900/20">
                  <Ionicons name="camera" size={13} color="#22d3ee" />
                </View>
              </TouchableOpacity>

              {/* Name & email */}
              <View className="flex-1 pb-1">
                <Text className="text-[11px] font-semibold text-cyan-200 tracking-widest uppercase">
                  Welcome back
                </Text>
                <Text className="mt-0.5 text-xl font-black text-white leading-tight" numberOfLines={1}>
                  {profile?.name || user?.name || 'User'}
                </Text>
                <Text className="mt-0.5 text-xs text-cyan-200" numberOfLines={1}>
                  {profile?.email || user?.email || 'No email'}
                </Text>
              </View>
            </View>

            {/* Member badge */}
            <View className="mt-5 flex-row items-center gap-2 self-start rounded-2xl bg-white/15 px-3 py-1.5">
              <Ionicons name="ribbon-outline" size={13} color="#a5f3fc" />
              <Text className="text-xs font-semibold text-cyan-100">
                Member since {memberSinceDate}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <View className="mx-4 mt-4 flex-row gap-3">
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/cart')} className="flex-1">
            <StatCard icon="cart-outline" value={String(cartItemCount)} label="Cart items" accent="#0ea5e9" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/bookings')} className="flex-1">
            <StatCard icon="calendar-outline" value={String(bookingItemCount)} label="Active bookings" accent="#14b8a6" />
          </TouchableOpacity>
        </View>

        {['member', 'admin'].includes(profile?.role || user?.role) ? (
          <View className="mx-4 mt-4 rounded-[24px] bg-white px-5 py-4 shadow-sm shadow-slate-200/60 ">
            <Text className="text-sm font-semibold text-slate-900 mb-3">Member tools</Text>
            <View className="space-y-3">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/post-product')}
                className="rounded-3xl bg-cyan-600 px-4 py-3"
              >
                <Text className="text-sm font-semibold text-white text-center">Post a new product</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/my-posts')}
                className="rounded-3xl border border-cyan-600 bg-white px-4 py-3 mt-4"
              >
                <Text className="text-sm font-semibold text-cyan-600 text-center">Manage my posts</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* ── Account info ────────────────────────────────────────────────── */}
        <View className="mx-4 mt-4 rounded-[24px] bg-white px-5 pt-4 pb-2 shadow-sm shadow-slate-200/60">
          <Text className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Account Details
          </Text>
          <View className="flex-row items-center gap-4 px-1 py-3 border-b border-slate-100">
            <View className="h-9 w-9 items-center justify-center rounded-2xl bg-cyan-50">
              <Ionicons name="person-outline" size={18} color="#0ea5e9" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-slate-400 font-medium tracking-wide uppercase">Full Name</Text>
              <TextInput
                className="mt-0.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900"
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
          <InfoRow icon="mail-outline" label="Email Address" value={profile?.email || user?.email} />
          <InfoRow icon="calendar-outline" label="Member Since" value={memberSinceDate} />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSaveProfile}
            disabled={saveLoading || name.trim() === (profile?.name || user?.name || '').trim()}
            className={`mt-4 rounded-3xl px-4 py-4 items-center ${
              saveLoading || name.trim() === (profile?.name || user?.name || '').trim()
                ? 'bg-slate-300'
                : 'bg-cyan-600'
            }`}
          >
            <Text className="text-sm font-semibold text-white">
              {saveLoading ? 'Saving...' : 'Save Profile'}
            </Text>
          </TouchableOpacity>

          {saveMessage ? (
            <Text className="mt-3 text-sm text-emerald-700">{saveMessage}</Text>
          ) : null}
        </View>

        {/* ── Settings ────────────────────────────────────────────────────── */}
        <View className="mx-4 mt-4 rounded-[24px] bg-white px-5 pt-4 pb-2 shadow-sm shadow-slate-200/60">
          <Text className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Preferences
          </Text>
          <SettingRow icon="notifications-outline"    label="Notifications" />
          <SettingRow icon="shield-checkmark-outline" label="Privacy & Security" />
          <SettingRow icon="wallet-outline"           label="Payment Methods" />
          <SettingRow icon="help-circle-outline"      label="Help & Support" />
        </View>

        {/* ── Danger zone ─────────────────────────────────────────────────── */}
        <View className="mx-4 mt-4 rounded-[24px] bg-white px-5 pt-4 pb-2 shadow-sm shadow-slate-200/60">
          <Text className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Account
          </Text>
          <SettingRow icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
        </View>

        {profileError && (
          <View className="mx-4 mt-3 flex-row items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3">
            <Ionicons name="warning-outline" size={16} color="#d97706" />
            <Text className="text-xs text-amber-700 flex-1">
              {profileError}
            </Text>
          </View>
        )}
      </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default Profile
