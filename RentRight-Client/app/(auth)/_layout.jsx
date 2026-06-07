import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '../../_context/AuthContext'

const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-cyan-900">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    )
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  )
}

export default AuthLayout