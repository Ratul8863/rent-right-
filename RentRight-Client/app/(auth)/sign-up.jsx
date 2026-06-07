import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import { useEffect, useState, useRef } from 'react'
import * as Google from 'expo-auth-session/providers/google'
import { makeRedirectUri, ResponseType } from 'expo-auth-session'
import Constants from 'expo-constants'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../_context/AuthContext'
import RentPolicySection from '../../components/RentPolicySection'

const BACKEND_URL = (Constants.expoConfig?.extra?.BACKEND_URL || 'http://192.168.0.105:4000').replace(/\/+$/, '')

const SignUp = () => {
  const router = useRouter()
  const { register, googleLogin } = useAuth()
  const otpInputRef = useRef(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [policyLoading, setPolicyLoading] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  // OTP states
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  const redirectUri = makeRedirectUri({
    useProxy: true,
  })

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID,
    webClientId: Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID,
    androidClientId: Constants.expoConfig?.extra?.GOOGLE_ANDROID_CLIENT_ID,
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
  })

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCountdown])

  // Handle Google Auth Response
  useEffect(() => {
    if (!response) {
      return
    }

    if (response.type === 'success') {
      const idToken = response.authentication?.idToken
      if (!idToken) {
        setErrorMessage('Unable to sign up with Google.')
        setGoogleLoading(false)
        return
      }

      const signUpWithGoogle = async () => {
        try {
          await googleLogin(idToken)
          router.replace('/(tabs)')
        } catch (error) {
          setErrorMessage(error.message || 'Google sign-up failed.')
        } finally {
          setGoogleLoading(false)
        }
      }

      signUpWithGoogle()
      return
    }

    if (response.type === 'error') {
      setErrorMessage('Google sign-up failed. Please try again.')
      setGoogleLoading(false)
    }
  }, [response, googleLogin, router])

  const sendOtp = async (emailAddr) => {
    try {
      setOtpLoading(true)
      setErrorMessage('')
      
      const response = await fetch(`${BACKEND_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddr, type: 'register' }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Failed to send OTP')
      }

      setOtpSent(true)
      setResendCountdown(60)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to send OTP. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const verifyOtp = async (emailAddr, otpValue) => {
    try {
      setOtpLoading(true)
      setErrorMessage('')

      if (!otpValue || otpValue.length !== 6) {
        setErrorMessage('Please enter a 6-digit OTP')
        setOtpLoading(false)
        return
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddr, otp: otpValue }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Invalid OTP')
      }

      setShowPolicy(true)
    } catch (error) {
      setErrorMessage(error.message || 'OTP verification failed')
    } finally {
      setOtpLoading(false)
    }
  }

  const onSignUpPress = async () => {
    setErrorMessage('')

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    if (!name || !email || !password) {
      setErrorMessage('All fields are required to create an account.')
      return
    }

    // Send OTP instead of showing policy directly
    await sendOtp(email.trim().toLowerCase())
  }

  const handleAgree = async () => {
    setErrorMessage('')
    setPolicyLoading(true)

    try {
      await register(name.trim(), email.trim().toLowerCase(), password)
      router.replace('/(tabs)')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setPolicyLoading(false)
    }
  }

  const onGoogleSignUp = async () => {
    setErrorMessage('')
    setGoogleLoading(true)

    if (!request) {
      setErrorMessage('Google sign up is not ready yet.')
      setGoogleLoading(false)
      return
    }

    const result = await promptAsync()
    if (result.type !== 'success') {
      setGoogleLoading(false)
      if (result.type === 'dismiss' || result.type === 'cancel') {
        setErrorMessage('Google sign-up cancelled.')
      }
    }
  }

  const isValid =
    name &&
    email &&
    password &&
    confirmPassword &&
    password === confirmPassword

  // OTP inline JSX — must NOT be a sub-component; that would cause
  // re-mounting on every keystroke and dismiss the Android keyboard.
  const otpJsx = otpSent ? (
    <View className="bg-white rounded-[30px] p-6 shadow-2xl">
      <Text className="text-2xl font-bold text-slate-900 mb-2">Verify Email</Text>
      <Text className="text-slate-600 text-sm mb-6">
        We sent a 6-digit code to {email}
      </Text>

      {/* Tapping the boxes refocuses the hidden input */}
      <Pressable
        onPress={() => otpInputRef.current?.focus()}
        className="mb-6"
      >
        <View className="flex-row justify-between gap-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <View
              key={index}
              className="flex-1 aspect-square bg-slate-100 rounded-2xl items-center justify-center border-2"
              style={{
                borderColor: otp[index] ? '#0e7490' : '#cbd5e1',
              }}
            >
              <Text className="text-2xl font-bold text-slate-900">
                {otp[index] || ''}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>

      {/*
        Hidden TextInput — positioned off-screen (left: -1000, 1×1 px).
        0×0 causes Android to silently drop keyboard focus.
      */}
      <TextInput
        ref={otpInputRef}
        autoFocus
        value={otp}
        onChangeText={(text) => {
          const cleaned = text.replace(/[^0-9]/g, '')
          if (cleaned.length <= 6) setOtp(cleaned)
        }}
        keyboardType="number-pad"
        maxLength={6}
        editable
        caretHidden
        style={{
          position: 'absolute',
          left: -1000,
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />

      {errorMessage ? (
        <Text className="text-rose-600 text-center mb-4 text-sm">{errorMessage}</Text>
      ) : null}

      {/* Verify Button */}
      <Pressable
        onPress={() => verifyOtp(email.trim().toLowerCase(), otp)}
        disabled={otp.length !== 6 || otpLoading}
        className={`py-4 rounded-2xl items-center mb-4 ${
          otp.length === 6 && !otpLoading ? 'bg-cyan-700' : 'bg-slate-300'
        }`}
      >
        {otpLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg">Verify OTP</Text>
        )}
      </Pressable>

      {/* Resend OTP */}
      <Pressable
        onPress={() => sendOtp(email.trim().toLowerCase())}
        disabled={resendCountdown > 0 || otpLoading}
        className="py-3 items-center"
      >
        {resendCountdown > 0 ? (
          <Text className="text-slate-500 text-sm">Resend OTP in {resendCountdown}s</Text>
        ) : (
          <Text className="text-cyan-700 font-semibold text-sm">
            Didn&apos;t receive code? Resend OTP
          </Text>
        )}
      </Pressable>

      {/* Back Button */}
      <Pressable
        onPress={() => {
          setOtpSent(false)
          setOtp('')
          setErrorMessage('')
        }}
        className="py-3 items-center"
      >
        <Text className="text-slate-500 text-sm">← Back to Sign Up</Text>
      </Pressable>
    </View>
  ) : null

  return (
    <SafeAreaView className="flex-1 bg-cyan-900">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 24,
          }}
        >
            {/* Header */}
            <View className="items-center mb-10 mt-10">
              <Text className="text-4xl font-extrabold text-white mb-2">
                Create Account
              </Text>

              <Text className="text-cyan-100 text-base text-center px-6">
                Sign up and start exploring the app today
              </Text>
            </View>

            {showPolicy ? (
              <RentPolicySection
                onAgree={handleAgree}
                onClose={() => setShowPolicy(false)}
                loading={policyLoading}
              />
            ) : otpSent ? (
              otpJsx
            ) : (
            <View className="bg-white rounded-[30px] p-6 shadow-2xl">
            {/* Full Name */}
            <View className="mb-5">
              <Text className="text-slate-700 font-semibold mb-2 ml-1">
                Full Name
              </Text>

              <View className="flex-row items-center bg-slate-100 rounded-2xl px-4">
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#64748b"
                />

                <TextInput
                  className="flex-1 p-4 text-slate-900"
                  placeholder="John Doe"
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Email */}
            <View className="mb-5">
              <Text className="text-slate-700 font-semibold mb-2 ml-1">
                Email Address
              </Text>

              <View className="flex-row items-center bg-slate-100 rounded-2xl px-4">
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#64748b"
                />

                <TextInput
                  className="flex-1 p-4 text-slate-900"
                  placeholder="user@example.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password */}
            <View className="mb-5">
              <Text className="text-slate-700 font-semibold mb-2 ml-1">
                Password
              </Text>

              <View className="flex-row items-center bg-slate-100 rounded-2xl px-4">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#64748b"
                />

                <TextInput
                  className="flex-1 p-4 text-slate-900"
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* Confirm Password */}
            <View className="mb-6">
              <Text className="text-slate-700 font-semibold mb-2 ml-1">
                Confirm Password
              </Text>

              <View className="flex-row items-center bg-slate-100 rounded-2xl px-4">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#64748b"
                />

                <TextInput
                  className="flex-1 p-4 text-slate-900"
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            {errorMessage ? (
              <Text className="text-rose-600 text-center mb-4">{errorMessage}</Text>
            ) : null}

            {/* Create Account Button */}
            <Pressable
              onPress={onSignUpPress}
              disabled={!isValid}
              className={`py-4 rounded-2xl items-center mb-5 ${
                !isValid
                  ? 'bg-slate-300'
                  : 'bg-cyan-700'
              }`}
            >
              <Text className="text-white font-bold text-lg">
                Create Account
              </Text>
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center mb-5">
              <View className="flex-1 h-[1px] bg-slate-200" />

              <Text className="mx-3 text-slate-400 font-medium">
                OR
              </Text>

              <View className="flex-1 h-[1px] bg-slate-200" />
            </View>

            {/* Google Sign Up */}
            <Pressable
              onPress={onGoogleSignUp}
              disabled={policyLoading || googleLoading}
              className="border border-slate-200 py-4 rounded-2xl items-center bg-white"
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="logo-google"
                  size={20}
                  color="#ef4444"
                />

                {googleLoading ? (
                  <ActivityIndicator color="#ef4444" style={{ marginLeft: 12 }} />
                ) : (
                  <Text className="ml-3 text-slate-800 font-semibold text-base">
                    Continue with Google
                  </Text>
                )}
              </View>
            </Pressable>

            {/* Footer */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-slate-500">
                Already have an account?
              </Text>

              <Link href="/sign-in" asChild>
                <TouchableOpacity>
                  <Text className="text-cyan-700 font-bold ml-1">
                    Sign In
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default SignUp;