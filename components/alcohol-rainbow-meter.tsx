"use client"

interface AlcoholRainbowMeterProps {
  percentage: number
  size?: "sm" | "md" | "lg"
}

export default function AlcoholRainbowMeter({ percentage, size = "md" }: AlcoholRainbowMeterProps) {
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
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]} relative`}>
        {/* Rainbow background */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 opacity-30" />

        {/* Active fill with rainbow gradient */}
        <div
          className={`h-full bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 via-indigo-400 to-purple-400 transition-all duration-300 relative z-10`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
      <div className={`font-medium ${sizeClasses[size]} min-w-fit text-gray-700`}>{percentage}% ABV</div>
    </div>
  )
}
