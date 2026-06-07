import { Text, TouchableOpacity, View } from 'react-native'

const SectionHeader = ({ title, subtitle, actionLabel, onAction }) => {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <View className="flex-1">
        <Text className="text-lg font-bold text-slate-900">{title}</Text>
        {subtitle ? (
          <Text className="text-sm text-slate-500 mt-1">{subtitle}</Text>
        ) : null}
      </View>
      {actionLabel ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAction}
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <Text className="text-sm font-semibold text-slate-700">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export default SectionHeader
