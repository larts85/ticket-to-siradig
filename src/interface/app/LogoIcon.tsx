import { Defs, LinearGradient, Path, Rect, Stop, Svg } from 'react-native-svg'

export const LogoIcon = ({ size = 24 }: { size?: number }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
      <Defs>
        <LinearGradient id="ticketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop stopColor="#0284c7" offset="0%" />
          <Stop stopColor="#0369a1" offset="100%" />
        </LinearGradient>
        <LinearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop stopColor="#22c55e" offset="0%" />
          <Stop stopColor="#16a34a" offset="100%" />
        </LinearGradient>
      </Defs>

      {/* Main Ticket Base */}
      <Path
        d="M24 16C24 11.5817 27.5817 8 32 8H96C100.418 8 104 11.5817 104 16V46C99.0294 46 95 50.0294 95 55C95 59.9706 99.0294 64 104 64V112C104 116.418 100.418 120 96 120H32C27.5817 120 24 116.418 24 112V64C28.9706 64 33 59.9706 33 55C33 50.0294 28.9706 46 24 46V16Z"
        fill="url(#ticketGrad)"
      />

      {/* Ticket Header & Lines */}
      <Rect x="40" y="24" width="48" height="8" rx="4" fill="#ffffff" opacity={0.9} />
      <Rect x="40" y="38" width="32" height="6" rx="3" fill="#ffffff" opacity={0.6} />

      {/* Perforated separator line */}
      <Path
        d="M38 55H90"
        stroke="#ffffff"
        strokeWidth="3"
        strokeDasharray="6 6"
        strokeLinecap="round"
        opacity={0.7}
      />

      {/* Content lines */}
      <Rect x="40" y="68" width="48" height="6" rx="3" fill="#ffffff" opacity={0.6} />
      <Rect x="40" y="80" width="36" height="6" rx="3" fill="#ffffff" opacity={0.6} />
      <Rect x="40" y="92" width="24" height="6" rx="3" fill="#ffffff" opacity={0.6} />

      {/* Success / Approved Check Badge */}
      <Path
        d="M100 80C100 68.9543 91.0457 60 80 60C68.9543 60 60 68.9543 60 80C60 91.0457 68.9543 100 80 100C91.0457 100 100 91.0457 100 80Z"
        fill="url(#badgeGrad)"
      />
      <Path
        d="M71 80L77 86L89 74"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
