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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111827',
          backgroundImage: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
        }}
      >
        {/* Logo container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 200,
            height: 200,
            borderRadius: 30,
            background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
            marginBottom: 40,
          }}
        >
          {/* Whisky glass icon */}
          <svg
            width="100"
            height="150"
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

        {/* Brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: 'white',
            marginBottom: 20,
          }}
        >
          Vassoo
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#9ca3af',
          }}
        >
          Premium Spirits & Wine Marketplace
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            width: 400,
            height: 4,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
            marginTop: 40,
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
