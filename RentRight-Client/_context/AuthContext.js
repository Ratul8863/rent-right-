import { createContext, useContext, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import {
  googleLoginRequest,
  loginRequest,
  logoutRequest,
  refreshTokenRequest,
  registerRequest,
} from './authApi'

const AuthContext = createContext(null)
const REFRESH_TOKEN_KEY = 'rentright_refresh_token'

async function saveRefreshToken(token) {
  if (token) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token)
  } else {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    } catch (error) {
      // Ignore errors when deleting - item may not exist
      console.debug('Error deleting refresh token:', error)
    }
  }
}

async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [authError, setAuthError] = useState(null)

  const completeSession = async (data) => {
    setUser(data.user)
    setAccessToken(data.accessToken)
    setIsAuthenticated(true)
    await saveRefreshToken(data.refreshToken)
  }

  const updateUser = (newData) => {
    setUser((currentUser) => ({
      ...currentUser,
      ...newData,
    }))
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true)
        const refreshToken = await getRefreshToken()
        if (!refreshToken) {
          setIsLoading(false)
          return
        }
        const data = await refreshTokenRequest(refreshToken)
        await completeSession(data)
      } catch (error) {
        console.error('Auth initialization error:', error.message)
        await saveRefreshToken(null)
        setUser(null)
        setAccessToken(null)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (email, password) => {
    setActionLoading(true)
    setAuthError(null)

    try {
      const data = await loginRequest(email, password)
      await completeSession(data)
      return data.user
    } catch (error) {
      setAuthError(error.message)
      throw error
    } finally {
      setActionLoading(false)
    }
  }

  const googleLogin = async (idToken) => {
    setActionLoading(true)
    setAuthError(null)

    try {
      const data = await googleLoginRequest(idToken)
      await completeSession(data)
      return data.user
    } catch (error) {
      setAuthError(error.message)
      throw error
    } finally {
      setActionLoading(false)
    }
  }

  const register = async (name, email, password) => {
    setActionLoading(true)
    setAuthError(null)

    try {
      const data = await registerRequest(name, email, password)
      await completeSession(data)
      return data.user
    } catch (error) {
      setAuthError(error.message)
      throw error
    } finally {
      setActionLoading(false)
    }
  }

  const logout = async () => {
    setActionLoading(true)
    setAuthError(null)

    try {
      const refreshToken = await getRefreshToken()
      if (refreshToken) {
        await logoutRequest(refreshToken)
      }
    } catch (_) {
      // Ignore server logout errors and keep client state cleared.
    } finally {
      await saveRefreshToken(null)
      setUser(null)
      setAccessToken(null)
      setIsAuthenticated(false)
      setActionLoading(false)
    }
  }

  const value = {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    actionLoading,
    authError,
    login,
    googleLogin,
    logout,
    register,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
