import { useLocalSearchParams } from 'expo-router'
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const categoryData = {
  Cars: [
    {
      id: 1,
      title: 'Toyota Corolla',
      price: '$120/day',
      image:
        'https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 2,
      title: 'Honda Civic',
      price: '$150/day',
      image:
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop',
    },
  ],

  Houses: [
    {
      id: 1,
      title: 'Modern Family House',
      price: '$900/month',
      image:
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=1200&auto=format&fit=crop',
    },
  ],

  Apartments: [
    {
      id: 1,
      title: 'Luxury Apartment',
      price: '$700/month',
      image:
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop',
    },
  ],

  Bikes: [
    {
      id: 1,
      title: 'Mountain Bike',
      price: '$40/day',
      image:
        'https://images.unsplash.com/photo-1511994298241-608e28f14fde?q=80&w=1200&auto=format&fit=crop',
    },
  ],
}

const CategoryItem = () => {
  const { category } = useLocalSearchParams()

  const products = categoryData[category] || []

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">
          {category}
        </Text>

        <Text className="text-gray-500 mt-1">
          Available items in this category
        </Text>
      </View>

      {/* Product List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {products.length > 0 ? (
          products.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#fff',
                borderRadius: 18,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#e5e7eb',
              }}
            >
              {/* Image */}
              <Image
                source={{ uri: item.image }}
                style={{
                  width: '100%',
                  height: 220,
                }}
                resizeMode="cover"
              />

              {/* Content */}
              <View
                style={{
                  padding: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#111827',
                  }}
                >
                  {item.title}
                </Text>

                <Text
                  style={{
                    fontSize: 15,
                    color: '#155e75',
                    marginTop: 6,
                    fontWeight: '600',
                  }}
                >
                  {item.price}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{
                    marginTop: 14,
                    backgroundColor: '#155e75',
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: 15,
                    }}
                  >
                    View Details
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center mt-20">
            <Text className="text-lg font-semibold text-gray-700">
              No Items Found
            </Text>

            <Text className="text-gray-500 mt-2 text-center">
              No products available in this category right now.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default CategoryItem;