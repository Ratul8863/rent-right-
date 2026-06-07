import Constants from 'expo-constants'

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL

if (!BACKEND_URL) {
  console.error('❌ BACKEND_URL not configured in app.json')
}

async function request(path, body, token) {
  const url = `${BACKEND_URL}${path}`
  let response

  try {
    // Create a timeout promise that rejects after 10 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    )

    // Race between the fetch and timeout
    response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      }),
      timeoutPromise,
    ])
  } catch (error) {
    const errorMsg = error.message || 'Network error'
    console.error(`Backend request error to ${url}:`, errorMsg)
    throw new Error(
      `Unable to connect to backend. ${errorMsg}. Check that the server is running at ${BACKEND_URL}`,
    )
  }

  let data
  try {
    data = await response.json()
  } catch (e) {
    data = {}
  }

  if (!response.ok) {
    throw new Error(data?.message || `Server error: ${response.status}`)
  }

  return data
}

export const registerRequest = (name, email, password) =>
  request('/api/auth/register', { name, email, password })

export const loginRequest = (email, password) =>
  request('/api/auth/login', { email, password })

export const refreshTokenRequest = (refreshToken) =>
  request('/api/auth/refresh', { refreshToken })

export const logoutRequest = (refreshToken) =>
  request('/api/auth/logout', { refreshToken })

export const googleLoginRequest = (idToken) =>
  request('/api/auth/google-signin', { idToken })

export const createProductRequest = (product, token) =>
  request('/api/products', product, token)

export const getProductsRequest = () =>
  fetch(`${BACKEND_URL}/api/products`, {
    method: 'GET',
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.message || 'Unable to load products.')
    }
    return data
  })

export const getCategoriesRequest = () =>
  fetch(`${BACKEND_URL}/api/products/categories`, {
    method: 'GET',
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.message || 'Unable to load categories.')
    }
    return data
  })

export const getProductRequest = (id) =>
  fetch(`${BACKEND_URL}/api/products/${id}`, {
    method: 'GET',
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.message || 'Unable to load product.')
    }
    return data
  })

export const getMyProductsRequest = (token) =>
  fetch(`${BACKEND_URL}/api/products/my`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.message || 'Unable to load posts.')
    }
    return data
  })

export const deleteProductRequest = async (id, token) => {
  const response = await fetch(`${BACKEND_URL}/api/products/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Unable to delete post.')
  }
  return data
}

export const meRequest = (accessToken) =>
  fetch(`${BACKEND_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.message || 'Unable to load user.')
    }
    return data
  })

export const updateProfileRequest = (accessToken, profileData) =>
  fetch(`${BACKEND_URL}/api/auth/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(profileData),
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.message || 'Unable to update profile.')
    }
    return data
  })
