import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const policies = [
  {
    icon: 'calendar-outline',
    title: 'Booking & confirmation',
    desc: 'All bookings must be confirmed at least 12 hours in advance. You willll receive a confirmation via app notification and email.',
    tag: 'Required',
    tagBg: '#e1f5ee',
    tagText: '#085041',
    iconBg: '#e1f5ee',
    iconColor: '#0f6e56',
  },
  {
    icon: 'timer-outline',
    title: 'Cancellation',
    desc: 'Free cancellation within 24 hours of booking. Cancellations after 24 hours incur a 20% fee of the total rental cost.',
    tag: '24h window',
    tagBg: '#faeeda',
    tagText: '#633806',
    iconBg: '#faeeda',
    iconColor: '#854f0b',
  },
  {
    icon: 'card-outline',
    title: 'Payment & deposit',
    desc: 'A security deposit is held at booking and released within 3–5 business days after the item is returned in original condition.',
    tag: 'Refundable',
    tagBg: '#e6f1fb',
    tagText: '#0c447c',
    iconBg: '#e6f1fb',
    iconColor: '#185fa5',
  },
  {
    icon: 'warning-outline',
    title: 'Damage & liability',
    desc: 'Renters are responsible for any damage during the rental period. Photos are taken before and after each rental as evidence.',
    tag: "Renter's responsibility",
    tagBg: '#fcebeb',
    tagText: '#791f1f',
    iconBg: '#fcebeb',
    iconColor: '#a32d2d',
  },
]

const RentPolicySection = ({ onAgree, onClose, loading }) => {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 24, marginBottom: 30 }}>

      {/* ── Hero Banner ── */}
      <View style={{
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: '#d1d5db',
        marginBottom: 16,
      }}>

        {/* Top green area */}
        <View style={{
          backgroundColor: '#155e75',
          padding: 20,
          paddingBottom: 24,
        }}>
          {/* Badge */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            marginBottom: 12,
          }}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#9fe1cb" />
            <Text style={{ fontSize: 12, color: '#9fe1cb', fontWeight: '600' }}>
              Trusted rental platform
            </Text>
          </View>

          <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 }}>
            Policy of rent
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20 }}>
            Simple, fair rules to keep every rental experience safe and smooth for everyone.
          </Text>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', backgroundColor: '#fff' }}>
          {[
            { num: '24h', label: 'Cancellation' },
            { num: '100%', label: 'Secure' },
            { num: '7/7', label: 'Support' },
          ].map((stat, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 12,
                borderRightWidth: i < 2 ? 0.5 : 0,
                borderRightColor: '#e5e7eb',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#155e75' }}>
                {stat.num}
              </Text>
              <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Section label ── */}
      <Text style={{
        fontSize: 11,
        fontWeight: '600',
        color: '#9ca3af',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        Key policies
      </Text>

      {/* ── Policy Cards ── */}
      {policies.map((item, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            gap: 12,
            alignItems: 'flex-start',
            backgroundColor: '#fff',
            borderRadius: 14,
            borderWidth: 0.5,
            borderColor: '#e5e7eb',
            padding: 14,
            marginBottom: 10,
            elevation: 1,
          }}
        >
          {/* Icon */}
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: item.iconBg,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Ionicons name={item.icon} size={18} color={item.iconColor} />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 }}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 19 }}>
              {item.desc}
            </Text>
            {/* Tag */}
            <View style={{
              alignSelf: 'flex-start',
              marginTop: 8,
              backgroundColor: item.tagBg,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: item.tagText }}>
                {item.tag}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {/* ── Warning notice ── */}
      <View style={{
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
        backgroundColor: '#fefce8',
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: '#fde68a',
        padding: 12,
        marginTop: 4,
      }}>
        <Ionicons name="information-circle-outline" size={17} color="#92400e" style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, fontSize: 12, color: '#92400e', lineHeight: 19 }}>
          By proceeding with a booking, you agree to all rental policies above. Please read carefully before confirming.
        </Text>
      </View>

      {/* ── Agree button ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={{
          marginTop: 16,
          backgroundColor: '#155e75',
          paddingVertical: 14,
          borderRadius: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
        onPress={onAgree}
        disabled={loading}
      >
        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
          {loading ? 'Creating account...' : 'I agree and create account'}
        </Text>
      </TouchableOpacity>

      {onClose ? (
        <TouchableOpacity
          activeOpacity={0.85}
          style={{
            marginTop: 12,
            backgroundColor: '#e2e8f0',
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: 'center',
          }}
          onPress={onClose}
        >
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>
            Go back and edit details
          </Text>
        </TouchableOpacity>
      ) : null}

    </View>
  )
}

export default RentPolicySection
