import React, { useEffect } from "react";
import { ActivityIndicator, Image, StatusBar, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../_context/AuthContext";

const Index = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth(); 

  useEffect(() => {
    if (isLoading) return
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)')
      } else {
        router.replace('/sign-in')
      }
    }, 4000)
    return () => clearTimeout(timer)
  }, [router, isAuthenticated, isLoading])

  if (isLoading) {
    return (
      <Text className="text-center text-gray-500 mt-4">
        Loading...
      </Text>
    )
  }

  return (

    <View className="flex-1 bg-[#082f49]">

      <StatusBar barStyle="light-content" />

      <View className="flex-1 items-center justify-center px-6">

        <View className="bg-white/10 border border-cyan-300/20 rounded-full p-5 shadow-2xl mb-8">

          <Image
            source={require("../assets/images/home-rent-icon2.jpg")}
            className="w-32 h-32 rounded-full"
            resizeMode="cover"
          />

        </View>

        <Text className="text-white text-5xl font-extrabold tracking-[4px]">
          RentRight
        </Text>

        <Text className="text-center text-cyan-100 text-base mt-5 leading-7 px-6">
          Smart Digital Rental Platform{"\n"}
          Rent Anything, Anytime, Anywhere
        </Text>
        <ActivityIndicator size="large" color="#22d3ee" style={{ marginTop: 20 }} />
      </View>


      <View className="absolute bottom-12 self-center">
        <Text className="text-cyan-200 text-sm tracking-widest text-center ">
          POWERED BY DIGITAL RENT SOLUTION
        </Text>
      </View>
    </View>
  );
};

export default Index;