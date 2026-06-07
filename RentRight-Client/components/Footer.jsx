import { Image, Text, TouchableOpacity, View } from 'react-native'

const Footer = () => {
  return (
    <View>

      {/* ── Footer Banner ── */}
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 30,
          borderRadius: 22,
          overflow: 'hidden',
          backgroundColor: '#155e75',
        }}
      >
        {/* Background Image */}
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200',
          }}
          style={{
            width: '100%',
            height: 220,
            position: 'absolute',
          }}
          resizeMode="cover"
        />

        {/* Overlay */}
        <View
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
        />

        {/* Content */}
        <View
          style={{
            paddingHorizontal: 22,
            paddingVertical: 30,
            justifyContent: 'center',
            minHeight: 220,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 26,
              fontWeight: '800',
              lineHeight: 34,
            }}
          >
            Find Anything,
            {'\n'}Rent Everything
          </Text>

          <Text
            style={{
              color: 'rgba(255,255,255,0.82)',
              fontSize: 14,
              marginTop: 10,
              lineHeight: 22,
            }}
          >
            Cars, apartments, bikes, party centers & more — all in one platform.
          </Text>

          {/* Buttons */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              marginTop: 22,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                backgroundColor: '#fff',
                paddingHorizontal: 18,
                paddingVertical: 11,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: '#155e75',
                  fontWeight: '700',
                  fontSize: 14,
                }}
              >
                Explore Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                borderWidth: 1.5,
                borderColor: '#fff',
                paddingHorizontal: 18,
                paddingVertical: 11,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: 14,
                }}
              >
                Learn More
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>


    </View>
  )
}

export default Footer