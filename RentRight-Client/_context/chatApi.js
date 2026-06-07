import Constants from 'expo-constants'

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL

async function apiRequest(path, options = {}) {
  const url = `${BACKEND_URL}/api/chat${path}`
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Unable to load chat data.')
  }
  return data
}

export const getChatUsers = (token) =>
  apiRequest('/users', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

export const getConversations = (token) =>
  apiRequest('/conversations', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

export const getThreadMessages = (userId, token) =>
  apiRequest(`/threads/${userId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

export const sendThreadMessage = (userId, content, token) =>
  apiRequest(`/threads/${userId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  })

export const getCallHistory = (token) =>
  apiRequest('/call-history', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
