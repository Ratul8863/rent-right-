import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import User from '../models/User.js'
import { protect, requireRole } from '../middleware/protect.js'
import nodemailer from 'nodemailer'
import { saveOtp, checkOtp } from '../utils/otpStore.js'

// Track verified emails for this session (email -> verified timestamp)
const verifiedEmails = new Map()

const router = express.Router()

const googleClient = new OAuth2Client()

// ── Google token verify ───────────────────────────────────────────────────────
async function verifyGoogleIdToken(idToken) {
  const audiences = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ].filter(Boolean)

  const ticket = await googleClient.verifyIdToken({ idToken, audience: audiences })
  return ticket.getPayload()
}

// ── Token helpers (role included) ─────────────────────────────────────────────
function createAccessToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },   // ← role add করা হয়েছে
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )
}

function createRefreshToken(user) {
  return jwt.sign(
    { userId: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  )
}

// ── Shared user response shape ────────────────────────────────────────────────
function userPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,           // ← role সবসময় response এ থাকবে
    avatarUrl: user.avatarUrl,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  console.log('GMAIL_USER:', process.env.GMAIL_USER)
  console.log('GMAIL_APP_PASS:', process.env.GMAIL_APP_PASS ? 'SET' : 'NOT SET')
  try {
    const { email, type } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required.' })

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    })
    const normalizedEmail = email.toLowerCase()
    const existing = await User.findOne({ email: normalizedEmail })

    if (type === 'register') {
      if (existing) return res.status(400).json({ message: 'A user with this email already exists.' })
    } else if (type === 'signin') {
      if (!existing) return res.status(400).json({ message: 'No account found with this email.' })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    saveOtp(normalizedEmail, otp)

    await transporter.sendMail({
      from: `"RentRight" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your RentRight Verification Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border-radius:12px;border:1px solid #e2e8f0">
          <h2 style="color:#0e7490;margin-bottom:8px">RentRight Email Verification</h2>
          <p style="color:#475569">Use the code below to verify your email address:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#0e7490;text-align:center;padding:20px 0">${otp}</div>
          <p style="color:#94a3b8;font-size:13px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
      `,
    })

    res.json({ message: 'OTP sent successfully.' })
  } catch (error) {
    console.error('Send OTP error:', error)
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' })
  }
})

// POST /api/auth/verify-otp
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' })

  const result = checkOtp(email.toLowerCase(), otp)
  if (!result.valid) return res.status(400).json({ message: result.message })

  // Mark email as verified for this session
  verifiedEmails.set(email.toLowerCase(), Date.now())

  res.json({ message: 'OTP verified successfully.' })
})

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists.' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // .env এ ADMIN_EMAIL থাকলে সেই email দিয়ে register করলে admin হবে
    const role = email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()
      ? 'admin'
      : 'user'

    const user = await User.create({ name, email, password: hashedPassword, role })

    const accessToken = createAccessToken(user)
    const refreshToken = createRefreshToken(user)
    user.refreshToken = refreshToken
    await user.save()

    res.status(201).json({
      user: userPayload(user),
      accessToken,
      refreshToken,
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Unable to create account. Please try again.' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const normalizedEmail = email.toLowerCase()

    // Check if email was verified via OTP
    if (!verifiedEmails.has(normalizedEmail)) {
      return res.status(401).json({ message: 'Please verify your email with OTP first.' })
    }

    // Clean up old verification (older than 30 minutes)
    const verifiedTime = verifiedEmails.get(normalizedEmail)
    if (Date.now() - verifiedTime > 30 * 60 * 1000) {
      verifiedEmails.delete(normalizedEmail)
      return res.status(401).json({ message: 'Email verification expired. Please verify again.' })
    }

    const user = await User.findOne({ email: normalizedEmail })
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    // Clear the verified email after successful login
    verifiedEmails.delete(normalizedEmail)

    // Mark user's email as verified
    user.emailVerified = true
    const accessToken = createAccessToken(user)
    const refreshToken = createRefreshToken(user)
    user.refreshToken = refreshToken
    await user.save()

    res.json({
      user: userPayload(user),
      accessToken,
      refreshToken,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Unable to sign in. Please try again.' })
  }
})

// POST /api/auth/google-signin
router.post('/google-signin', async (req, res) => {
  try {
    const { idToken } = req.body
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required.' })
    }

    const payload = await verifyGoogleIdToken(idToken)
    if (!payload || !payload.email_verified) {
      return res.status(401).json({ message: 'Unable to verify Google account.' })
    }

    const email = payload.email.toLowerCase()
    const name = payload.name || email.split('@')[0]
    const googleId = payload.sub

    let user = await User.findOne({ email })
    if (user) {
      if (!user.googleId) {
        user.googleId = googleId
        await user.save()
      }
    } else {
      const randomPassword = Math.random().toString(36).slice(-12)
      const hashedPassword = await bcrypt.hash(randomPassword, 12)
      const role = email === process.env.ADMIN_EMAIL?.toLowerCase() ? 'admin' : 'user'
      user = await User.create({ name, email, password: hashedPassword, googleId, role })
    }

    const accessToken = createAccessToken(user)
    const refreshToken = createRefreshToken(user)
    user.refreshToken = refreshToken
    await user.save()

    res.json({
      user: userPayload(user),
      accessToken,
      refreshToken,
    })
  } catch (error) {
    console.error('Google sign-in error:', error)
    res.status(500).json({ message: 'Unable to sign in with Google. Please try again.' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required.' })
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decoded.userId)
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Unable to refresh session.' })
    }

    const accessToken = createAccessToken(user)
    const newRefreshToken = createRefreshToken(user)
    user.refreshToken = newRefreshToken
    await user.save()

    res.json({
      user: userPayload(user),
      accessToken,
      refreshToken: newRefreshToken,
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    res.status(401).json({ message: 'Session expired. Please sign in again.' })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(200).json({ success: true })
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decoded.userId)
    if (user) {
      user.refreshToken = null
      await user.save()
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(200).json({ success: true })
  }
})

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({
    user: {
      ...userPayload(req.user),
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    },
  })
})

// PATCH /api/auth/me
router.patch('/me', protect, async (req, res) => {
  try {
    const { name, avatarUrl } = req.body

    const updates = {}
    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim()
    }
    if (typeof avatarUrl === 'string') {
      updates.avatarUrl = avatarUrl || null
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'No valid profile fields were provided.' })
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    ).select('-password -refreshToken')

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' })
    }

    res.json({
      user: {
        ...userPayload(updatedUser),
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Unable to update profile. Please try again.' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ONLY ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/auth/users  →  সব users দেখো (admin only)
router.get('/users', protect, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password -refreshToken')
    res.json({ users })
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch users.' })
  }
})

// PATCH /api/auth/users/:id/role  →  কোনো user কে admin বা user বানাও (admin only)
router.patch('/users/:id/role', protect, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body
    if (!['user', 'member', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be "user", "member", or "admin".' })
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password -refreshToken')

    if (!updated) {
      return res.status(404).json({ message: 'User not found.' })
    }

    res.json({ user: userPayload(updated) })
  } catch (error) {
    res.status(500).json({ message: 'Unable to update role.' })
  }
})

export default router