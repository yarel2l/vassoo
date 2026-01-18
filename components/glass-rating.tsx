"use client"

import { cn } from "@/lib/utils"

interface GlassRatingProps {
  rating: number // 0 to 5
  maxRating?: number
  size?: "sm" | "md" | "lg"
  showValue?: boolean
  showCount?: boolean
  reviewCount?: number
  className?: string
  interactive?: boolean
  onRatingChange?: (rating: number) => void
}

// Single glass icon with fill level
function GlassIcon({
  fillPercent,
  size,
  isInteractive,
  onClick,
}: {
  fillPercent: number // 0 to 100
  size: "sm" | "md" | "lg"
  isInteractive?: boolean
  onClick?: () => void
}) {
  const sizeMap = {
    sm: { width: 16, height: 22, strokeWidth: 1.5 },
    md: { width: 20, height: 28, strokeWidth: 1.5 },
    lg: { width: 28, height: 38, strokeWidth: 2 },
  }

  const { width, height, strokeWidth } = sizeMap[size]

  // Glass dimensions within viewBox
  const viewBoxWidth = 24
  const viewBoxHeight = 32

  // Glass path points (tapered glass shape)
  const glassTop = 4
  const glassBottom = 28
  const glassHeight = glassBottom - glassTop
  const topWidth = 16 // Width at top
  const bottomWidth = 12 // Width at bottom (narrower)

  // Calculate liquid fill
  const liquidHeight = (glassHeight * fillPercent) / 100
  const liquidTop = glassBottom - liquidHeight

  // Calculate width at liquid top (linear interpolation)
  const widthRatio = (liquidTop - glassTop) / glassHeight
  const liquidTopWidth = topWidth - (topWidth - bottomWidth) * (1 - widthRatio)

  // Center offset
  const centerX = viewBoxWidth / 2
  const leftTop = centerX - topWidth / 2
  const rightTop = centerX + topWidth / 2
  const leftBottom = centerX - bottomWidth / 2
  const rightBottom = centerX + bottomWidth / 2

  // Liquid coordinates
  const liquidLeftTop = centerX - liquidTopWidth / 2
  const liquidRightTop = centerX + liquidTopWidth / 2

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      className={cn(
        "transition-transform",
        isInteractive && "cursor-pointer hover:scale-110"
      )}
      onClick={onClick}
    >
      {/* Liquid fill - gradient from bottom */}
      {fillPercent > 0 && (
        <>
          <defs>
            <linearGradient id={`liquidGradient-${fillPercent}`} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <path
            d={`
              M ${liquidLeftTop} ${liquidTop}
              L ${liquidRightTop} ${liquidTop}
              L ${rightBottom} ${glassBottom}
              L ${leftBottom} ${glassBottom}
              Z
            `}
            fill={`url(#liquidGradient-${fillPercent})`}
          />
          {/* Bubble effects for filled glass */}
          {fillPercent > 30 && (
            <>
              <circle cx={centerX - 2} cy={glassBottom - 4} r="1" fill="white" opacity="0.4" />
              <circle cx={centerX + 3} cy={glassBottom - 8} r="0.8" fill="white" opacity="0.3" />
            </>
          )}
        </>
      )}

      {/* Glass outline */}
      <path
        d={`
          M ${leftTop} ${glassTop}
          L ${rightTop} ${glassTop}
          L ${rightBottom} ${glassBottom}
          L ${leftBottom} ${glassBottom}
          Z
        `}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="transparent"
        className={fillPercent > 0 ? "text-orange-600" : "text-muted-foreground/50"}
      />

      {/* Glass base/bottom line */}
      <line
        x1={leftBottom}
        y1={glassBottom}
        x2={rightBottom}
        y2={glassBottom}
        stroke="currentColor"
        strokeWidth={strokeWidth * 1.2}
        className={fillPercent > 0 ? "text-orange-600" : "text-muted-foreground/50"}
      />

      {/* Glass rim highlight */}
      <line
        x1={leftTop + 1}
        y1={glassTop}
        x2={rightTop - 1}
        y2={glassTop}
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
        className={fillPercent > 0 ? "text-orange-500" : "text-muted-foreground/40"}
      />
    </svg>
  )
}

export default function GlassRating({
  rating,
  maxRating = 5,
  size = "md",
  showValue = false,
  showCount = false,
  reviewCount = 0,
  className,
  interactive = false,
  onRatingChange,
}: GlassRatingProps) {
  // Ensure rating is within bounds
  const normalizedRating = Math.max(0, Math.min(rating, maxRating))

  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index + 1)
    }
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }).map((_, index) => {
          // Calculate fill percent for this glass
          let fillPercent = 0
          if (normalizedRating >= index + 1) {
            fillPercent = 100 // Full glass
          } else if (normalizedRating > index) {
            // Partial fill
            fillPercent = (normalizedRating - index) * 100
          }

          return (
            <GlassIcon
              key={index}
              fillPercent={fillPercent}
              size={size}
              isInteractive={interactive}
              onClick={() => handleClick(index)}
            />
          )
        })}
      </div>

      {showValue && (
        <span className={cn(
          "font-medium text-foreground",
          size === "sm" && "text-xs ml-1",
          size === "md" && "text-sm ml-1.5",
          size === "lg" && "text-base ml-2"
        )}>
          {normalizedRating.toFixed(1)}
        </span>
      )}

      {showCount && reviewCount > 0 && (
        <span className={cn(
          "text-muted-foreground",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          size === "lg" && "text-base"
        )}>
          ({reviewCount})
        </span>
      )}
    </div>
  )
}

// Compact version for cards/lists
export function GlassRatingCompact({
  rating,
  reviewCount,
  className,
}: {
  rating: number
  reviewCount?: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <GlassIcon fillPercent={rating > 0 ? 100 : 0} size="sm" />
      <span className="text-sm font-medium">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-sm text-muted-foreground">({reviewCount})</span>
      )}
    </div>
  )
}
