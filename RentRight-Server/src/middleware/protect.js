import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// ── Verify JWT & attach user to request ──────────────────────────────────────
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header missing.' })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({ message: 'Token missing.' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password -refreshToken')
    if (!user) {
      return res.status(401).json({ message: 'Invalid session.' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' })
  }
}

// ── Role-based access control ─────────────────────────────────────────────────
// Usage: requireRole('admin')  or  requireRole('admin', 'user')
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' })
    }
    next()
  }
}