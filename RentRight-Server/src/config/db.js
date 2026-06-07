import mongoose from 'mongoose'

export async function connectDb() {
  try {
    const uri = process.env.MONGODB_URI

    if (!uri) {
      throw new Error('MONGODB_URI is required in .env')
    }

    // already connected
    if (mongoose.connection.readyState === 1) {
      return
    }

    await mongoose.connect(uri)

    console.log('Connected to MongoDB successfully')
  } catch (error) {
    console.log('MongoDB connection error:', error)
  }
}