import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Vassoo - Premium Spirits & Wine Marketplace'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111827',
        }}
      >
        {/* Logo container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 400,
            height: 400,
            borderRadius: 60,
            background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
          }}
        >
          {/* Whisky glass icon */}
          <svg
            width="200"
            height="300"
            viewBox="0 0 100 150"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.5 12.5 L87.5 12.5 L78 137.5 L22 137.5 Z"
              stroke="white"
              strokeWidth="8"
              fill="transparent"
            />
            <rect x="15" y="87.5" width="63" height="37.5" fill="white" opacity="0.6" />
            <line x1="22" y1="137.5" x2="78" y2="137.5" stroke="white" strokeWidth="10" />
          </svg>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
