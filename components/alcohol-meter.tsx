"use client"

interface AlcoholMeterProps {
  percentage: number
  size?: "sm" | "md" | "lg"
}

export default function AlcoholMeter({ percentage, size = "md" }: AlcoholMeterProps) {
  const getColorByPercentage = (percent: number) => {
    if (percent <= 15) return "from-green-400 to-green-600" // Light/Wine
    if (percent <= 25) return "from-yellow-400 to-yellow-600" // Beer/Light spirits
    if (percent <= 35) return "from-orange-400 to-orange-600" // Medium spirits
    if (percent <= 45) return "from-red-400 to-red-600" // Strong spirits
    return "from-red-600 to-red-800" // Very strong
  }

  const getIntensityLabel = (percent: number) => {
    if (percent <= 15) return "Light"
    if (percent <= 25) return "Mild"
    if (percent <= 35) return "Medium"
    if (percent <= 45) return "Strong"
    return "Very Strong"
  }

  const sizeClasses = {
    sm: "h-2 text-xs",
    md: "h-3 text-sm",
    lg: "h-4 text-base",
  }

  const fillWidth = Math.min((percentage / 50) * 100, 100) // Scale to 50% max for visual appeal

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full bg-gradient-to-r ${getColorByPercentage(percentage)} transition-all duration-300`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
      <div className={`font-medium ${sizeClasses[size]} min-w-fit`}>{percentage}% ABV</div>
    </div>
  )
}
