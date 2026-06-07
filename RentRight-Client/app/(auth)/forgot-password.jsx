import { useRouter } from 'expo-router'
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'

const ForgotPassword = () => {
  const router = useRouter()
  const [email, setEmail] = useState('')

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
            className="px-6 pt-8"
          >
            <Text className="text-3xl font-extrabold text-slate-900">Reset password</Text>
            <Text className="mt-2 text-base text-slate-500 leading-6">
              Enter your email and we’ll send a password reset link right away.
            </Text>

            <View className="mt-8 rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/80">
              <Text className="text-sm font-semibold text-slate-700">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
                className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity
                activeOpacity={0.85}
                className="mt-6 rounded-3xl bg-cyan-600 px-4 py-4 items-center shadow-lg shadow-cyan-500/20"
                onPress={() => router.push('/sign-in')}
              >
                <Text className="text-base font-bold text-white">Send reset link</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default ForgotPassword
