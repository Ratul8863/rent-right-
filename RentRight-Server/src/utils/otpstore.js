
const otpMap = new Map()

export const saveOtp = (email, otp) => {
  otpMap.set(email, {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000
  })
}

export const checkOtp = (email, otp) => {
  const record = otpMap.get(email)
  if (!record) return { valid: false, message: 'OTP not found. Please request a new one.' }
  if (Date.now() > record.expiresAt) {
    otpMap.delete(email)
    return { valid: false, message: 'OTP expired. Please request a new one.' }
  }
  if (record.otp !== otp) return { valid: false, message: 'Invalid OTP.' }
  otpMap.delete(email)
  return { valid: true }
}
