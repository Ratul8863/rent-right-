import express from 'express'
import Product from '../models/Product.js'
import { protect, requireRole } from '../middleware/protect.js'

const router = express.Router()

router.post('/', protect, requireRole('member', 'admin'), async (req, res) => {
  try {
    const { title, description, category, price, duration, images } = req.body
    const imageUrl = Array.isArray(images) && images.length > 0 ? images[0] : null

    if (!title || !description || !category || !price || !duration || !images || images.length !== 3 || !imageUrl) {
      return res.status(400).json({ message: 'Please provide title, description, category, price, duration, and exactly 3 images.' })
    }

    const product = await Product.create({
      title,
      description,
      category,
      price,
      duration,
      imageUrl,
      images,
      createdBy: req.user._id,
    })

    res.status(201).json({ product })
  } catch (error) {
    console.error('Create product error:', error)
    res.status(500).json({ message: 'Unable to post product. Please try again.' })
  }
})

router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category')
    res.json({ categories: categories.sort() })
  } catch (error) {
    console.error('Fetch categories error:', error)
    res.status(500).json({ message: 'Unable to load categories.' })
  }
})

router.get('/my', protect, async (req, res) => {
  try {
    const products = await Product.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email avatarUrl role')
    res.json({ products })
  } catch (error) {
    console.error('Fetch user products error:', error)
    res.status(500).json({ message: 'Unable to load your posts.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('createdBy', 'name email avatarUrl role')
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }
    res.json({ product })
  } catch (error) {
    console.error('Fetch product error:', error)
    res.status(500).json({ message: 'Unable to load product.' })
  }
})

router.delete('/:id', protect, requireRole('member', 'admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    if (!product.createdBy.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not allowed to delete this product.' })
    }

    await product.deleteOne()
    res.json({ message: 'Product deleted.' })
  } catch (error) {
    console.error('Delete product error:', error)
    res.status(500).json({ message: 'Unable to delete product.' })
  }
})

router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).populate('createdBy', 'name email avatarUrl role')
    res.json({ products })
  } catch (error) {
    console.error('Fetch products error:', error)
    res.status(500).json({ message: 'Unable to load products.' })
  }
})

export default router
