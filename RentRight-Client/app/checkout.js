import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo, useRef, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCart } from '../_context/CartContext'

const PAYMENT_METHODS = [
  { id: 'bKash', label: 'bKash', color: '#ec4899' },
  { id: 'Nagad', label: 'Nagad', color: '#f97316' },
  { id: 'Rocket', label: 'Rocket', color: '#9333ea' },
]

const getDateOptions = (days = 60) => {
  const now = new Date()
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() + index)
    return date
  })
}

const formatDate = (date) => {
  if (!date) return 'Select date'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getDurationDays = (start, end) => {
  if (!start || !end) return 0
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
  return diff > 0 ? diff : 0
}

const DatePickerModal = ({ visible, onClose, onSelect, selectedDate }) => {
  const dates = useMemo(() => getDateOptions(45), [])

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="h-3/5 rounded-t-3xl bg-white px-5 py-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-slate-900">Choose a date</Text>
            <TouchableOpacity onPress={onClose} className="rounded-full bg-slate-100 p-2">
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>
          <View className="mb-3 rounded-3xl bg-slate-100 p-4">
            <Text className="text-sm text-slate-500">Selected date</Text>
            <Text className="mt-2 text-base font-semibold text-slate-900">{formatDate(selectedDate)}</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap justify-between gap-3">
              {dates.map((date) => {
                const isSelected = selectedDate?.toDateString() === date.toDateString()
                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    onPress={() => onSelect(date)}
                    className={`w-[48%] rounded-3xl border px-4 py-4 ${
                      isSelected ? 'border-cyan-700 bg-cyan-50' : 'border-slate-200 bg-white'
                    }`} 
                  >
                    <Text className={`text-sm font-semibold ${isSelected ? 'text-cyan-900' : 'text-slate-900'}`}>
                      {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </Text>
                    <Text className={`mt-2 text-xl font-black ${isSelected ? 'text-cyan-900' : 'text-slate-900'}`}>
                      {date.getDate()}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {date.toLocaleDateString('en-GB', { month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export default function Checkout() {
  const router = useRouter()
  const { cartItems, clearCart, addBookings } = useCart()
  
  // Guard against empty cart
  if (!cartItems || cartItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Ionicons name="cart-outline" size={60} color="#94a3b8" />
          <Text className="mt-4 text-lg font-semibold text-slate-900">Your cart is empty</Text>
          <Text className="mt-2 text-sm text-slate-600">Add items to your cart before checking out</Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/shop')}
            className="mt-6 rounded-3xl bg-cyan-600 px-6 py-3"
          >
            <Text className="text-white font-semibold">Browse Rentals</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [postal, setPostal] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentNumber, setPaymentNumber] = useState('')
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinValues, setPinValues] = useState(['', '', '', '', ''])
  const [pinError, setPinError] = useState('')
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const [datePickerMode, setDatePickerMode] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const pinInputs = useRef([])

  const rentalDuration = getDurationDays(startDate, endDate)

  const handleSelectDate = (date) => {
    if (datePickerMode === 'start') {
      setStartDate(date)
      if (endDate && date > endDate) {
        setEndDate(null)
      }
    }
    if (datePickerMode === 'end') {
      setEndDate(date)
    }
    setDatePickerMode(null)
  }

  const selectedPaymentMethod = useMemo(
    () => PAYMENT_METHODS.find((method) => method.id === paymentMethod) || PAYMENT_METHODS[0],
    [paymentMethod]
  )

  const focusPinInput = (index) => {
    const input = pinInputs.current[index]
    if (input) {
      input.focus()
    }
  }

  const handlePinChange = (text, index) => {
    const digit = text.replace(/\D/g, '').slice(-1)
    const updated = [...pinValues]
    updated[index] = digit
    setPinValues(updated)
    setPinError('')

    if (digit && index < pinValues.length - 1) {
      focusPinInput(index + 1)
    }
  }

  const handlePinKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && !pinValues[index] && index > 0) {
      const previousIndex = index - 1
      const updated = [...pinValues]
      updated[previousIndex] = ''
      setPinValues(updated)
      focusPinInput(previousIndex)
    }
  }

  const handleConfirmPaymentPin = () => {
    if (pinValues.some((value) => value === '')) {
      setPinError('Please enter complete PIN')
      return
    }

    const pin = pinValues.join('')
    if (pin.length !== 5) {
      setPinError('Please enter complete PIN')
      return
    }

    setPinError('')
    setPaymentCompleted(true)
    addBookings(cartItems)
    clearCart()
    setSuccessMessage(`Payment Successful! Amount paid via ${paymentMethod}`)
  }

  const handleClosePinModal = () => {
    setShowPinModal(false)
    if (!paymentCompleted) {
      setPinValues(['', '', '', '', ''])
      setPinError('')
    }
  }

  const handleConfirmOrder = () => {
    setErrorMessage('')
    setSuccessMessage('')
    setPaymentCompleted(false)
    setPinError('')

    if (!name.trim() || !phone.trim() || !startDate || !endDate || !address.trim() || !city.trim() || !area.trim() || !postal.trim() || !paymentMethod || !paymentNumber.trim()) {
      setErrorMessage('Please complete all fields before confirming your order.')
      return
    }

    if (endDate < startDate) {
      setErrorMessage('End date must be the same or after the start date.')
      return
    }

    setShowPinModal(true)
    setPinValues(['', '', '', '', ''])
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#e0f2f1" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View className="px-4 pb-6">
              <View className="flex-row items-center justify-between mb-6">
                <TouchableOpacity onPress={() => router.back()} className="rounded-2xl bg-white p-3 shadow-sm shadow-slate-200">
                  <Ionicons name="arrow-back" size={22} color="#0f172a" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-slate-900">Checkout</Text>
                <View className="w-10" />
              </View>

              <View className="rounded-[32px] bg-white px-5 py-5 shadow-lg shadow-cyan-100/40">
                <Text className="text-xl font-bold text-teal-900">Rental information</Text>
                <Text className="mt-2 text-sm text-slate-500">Enter your booking details below.</Text>

                <View className="mt-6 space-y-4">
                  <View>
                    <Text className="text-sm font-semibold text-slate-700">Full Name</Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your full name"
                      className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                    />
                  </View>

                  <View>
                    <Text className="text-sm font-semibold text-slate-700">Phone Number</Text>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      placeholder="Enter phone number"
                      className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                    />
                  </View>

                  <View>
                    <Text className="text-sm font-semibold text-slate-700">Rental Start Date</Text>
                    <TouchableOpacity
                      onPress={() => setDatePickerMode('start')}
                      className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <Text className="text-slate-700">{formatDate(startDate)}</Text>
                    </TouchableOpacity>
                  </View>

                  <View>
                    <Text className="text-sm font-semibold text-slate-700">Rental End Date</Text>
                    <TouchableOpacity
                      onPress={() => setDatePickerMode('end')}
                      className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <Text className="text-slate-700">{formatDate(endDate)}</Text>
                    </TouchableOpacity>
                  </View>

                  <View className="rounded-3xl bg-cyan-50 px-4 py-4">
                    <Text className="text-sm text-slate-500">Rental Duration</Text>
                    <Text className="mt-2 text-2xl font-bold text-teal-900">{rentalDuration || 0} days</Text>
                  </View>
                </View>
              </View>

              <View className="mt-6 rounded-[32px] bg-white px-5 py-5 shadow-lg shadow-cyan-100/40">
                <Text className="text-xl font-bold text-teal-900">Delivery address</Text>
                <Text className="mt-2 text-sm text-slate-500">Where should we deliver the rental?</Text>

                <View className="mt-6 space-y-4">
                  <View>
                    <Text className="text-sm font-semibold text-slate-700">Full Address</Text>
                    <TextInput
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Street, house, building"
                      className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                    />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-slate-700">City / District</Text>
                    <TextInput
                      value={city}
                      onChangeText={setCity}
                      placeholder="City or district"
                      className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                    />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-slate-700">Area / Thana</Text>
                    <TextInput
                      value={area}
                      onChangeText={setArea}
                      placeholder="Area or thana"
                      className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                    />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-slate-700">Postal Code</Text>
                    <TextInput
                      value={postal}
                      onChangeText={setPostal}
                      keyboardType="number-pad"
                      placeholder="Postal code"
                      className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                    />
                  </View>
                </View>
              </View>

              <View className="mt-6 rounded-[32px] bg-white px-5 py-5 shadow-lg shadow-cyan-100/40">
                <Text className="text-xl font-bold text-teal-900">Select Payment Method</Text>
                <Text className="mt-2 text-sm text-slate-500">Choose one payment channel.</Text>

                <View className="mt-5 space-y-3">
                  {PAYMENT_METHODS.map((method) => {
                    const selected = paymentMethod === method.id
                    return (
                      <TouchableOpacity
                        key={method.id}
                        activeOpacity={0.85}
                        onPress={() => setPaymentMethod(method.id)}
                        className={`rounded-3xl border px-4 py-4 flex-row items-center justify-between ${
                          selected ? 'border-cyan-700 bg-cyan-50' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <View className="flex-row items-center gap-3">
                          <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: method.color + '22' }}>
                            <Ionicons name="card" size={20} color={method.color} />
                          </View>
                          <Text className={`text-base font-semibold ${selected ? 'text-cyan-900' : 'text-slate-900'}`}>{method.label}</Text>
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={22} color="#0f766e" />}
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {paymentMethod ? (
                  <View className="mt-5">
                    <Text className="text-sm font-semibold text-slate-700">
                      Enter your {paymentMethod} number
                    </Text>
                    <TextInput
                      value={paymentNumber}
                      onChangeText={setPaymentNumber}
                      keyboardType="phone-pad"
                      placeholder={`e.g. ${paymentMethod} account number`}
                      className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                    />
                  </View>
                ) : null}
              </View>

              {errorMessage ? (
                <View className="mt-4 rounded-3xl bg-rose-50 px-4 py-4">
                  <Text className="text-sm font-semibold text-rose-700">{errorMessage}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View className="mt-4 rounded-3xl bg-emerald-50 px-4 py-4">
                  <Text className="text-sm font-semibold text-emerald-700">{successMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirmOrder}
                className="mt-6 mb-8 rounded-[28px] bg-[#1a6b6b] px-5 py-4 items-center shadow-lg shadow-teal-900/20"
              >
                <Text className="text-base font-bold text-white">Confirm Order</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <Modal visible={showPinModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="min-h-[50%] rounded-t-3xl bg-white px-5 py-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">{paymentCompleted ? 'Payment Confirmed' : 'Enter PIN'}</Text>
              <TouchableOpacity onPress={handleClosePinModal} className="rounded-full bg-slate-100 p-2">
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <View className="rounded-3xl bg-slate-50 px-4 py-4">
              <Text className="text-sm text-slate-500">Paying with {selectedPaymentMethod.label}</Text>
              <Text className="mt-2 text-base font-semibold" style={{ color: selectedPaymentMethod.color }}>
                {`Paying with ${selectedPaymentMethod.label}: ${paymentNumber}`}
              </Text>
            </View>

            {paymentCompleted ? (
              <View className="mt-6 items-center justify-center rounded-3xl bg-white px-5 py-8 shadow-sm shadow-slate-200">
                <Text className="text-2xl font-black text-slate-900">Payment Successful! ✓</Text>
                <Text className="mt-3 text-center text-sm text-slate-600">
                  Amount paid via {selectedPaymentMethod.label}.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setShowPinModal(false)
                    setPaymentCompleted(false)
                    router.push('/bookings')
                  }}
                  className="mt-6 rounded-3xl px-6 py-3"
                  style={{ backgroundColor: selectedPaymentMethod.color }}
                >
                  <Text className="text-sm font-semibold text-white">Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text className="mt-6 text-sm font-semibold text-slate-700">Enter 5-digit PIN</Text>
                <View className="mt-4 flex-row justify-between">
                  {pinValues.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        pinInputs.current[index] = ref
                      }}
                      value={digit}
                      onChangeText={(text) => handlePinChange(text, index)}
                      onKeyPress={(event) => handlePinKeyPress(event, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      secureTextEntry
                      className="h-14 w-14 rounded-3xl border text-center text-xl font-bold text-slate-900"
                      style={{ borderColor: selectedPaymentMethod.color }}
                    />
                  ))}
                </View>
                {pinError ? (
                  <Text className="mt-3 text-sm text-rose-600">{pinError}</Text>
                ) : null}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleConfirmPaymentPin}
                  className="mt-6 rounded-3xl px-5 py-4 items-center"
                  style={{ backgroundColor: selectedPaymentMethod.color }}
                >
                  <Text className="text-base font-semibold text-white">Confirm Payment</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={Boolean(datePickerMode)}
        selectedDate={datePickerMode === 'start' ? startDate : endDate}
        onClose={() => setDatePickerMode(null)}
        onSelect={handleSelectDate}
      />
    </SafeAreaView>
  )
}
