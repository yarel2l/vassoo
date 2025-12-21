"use client"

interface DrinkGlassRatingProps {
  rating: number
  maxRating?: number
  size?: "sm" | "md" | "lg"
  showValue?: boolean
}

export default function DrinkGlassRating({
  rating,
  maxRating = 5,
  size = "md",
  showValue = true,
}: DrinkGlassRatingProps) {
  const sizeClasses = {
    sm: { glass: "w-4 h-6", text: "text-xs" },
    md: { glass: "w-6 h-8", text: "text-sm" },
    lg: { glass: "w-8 h-10", text: "text-base" },
  }

  const fillPercentage = (rating / maxRating) * 100
  const drinkColor = "#FCD34D" // Yellow-400 color like star ratings

  return (
    <div className="flex items-center gap-2">
      <div className={`relative ${sizeClasses[size].glass}`}>
        {/* Glass outline */}
        <svg viewBox="0 0 24 32" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Glass shape */}
          <path d="M4 4 L20 4 L18 28 L6 28 Z" stroke="#374151" strokeWidth="1.5" fill="transparent" />

          {/* Liquid fill */}
          <defs>
            <clipPath id={`glass-clip-${rating}-${size}`}>
              <path d="M4 4 L20 4 L18 28 L6 28 Z" />
            </clipPath>
          </defs>

          <rect
            x="4"
            y={32 - (fillPercentage * 24) / 100}
            width="14"
            height={(fillPercentage * 24) / 100}
            fill={drinkColor}
            clipPath={`url(#glass-clip-${rating}-${size})`}
            opacity="0.8"
          />

          {/* Glass base */}
          <line x1="6" y1="28" x2="18" y2="28" stroke="#374151" strokeWidth="2" />
        </svg>
      </div>

      {showValue && <span className={`font-medium ${sizeClasses[size].text}`}>{rating.toFixed(1)}</span>}
    </div>
  )
}
