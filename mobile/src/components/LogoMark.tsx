import Svg, { Path } from 'react-native-svg';

const INK = '#0C0E16';
const ACCENT = '#2C3BC4';

interface LogoMarkProps {
  size?: number;
  /** Main "C" ring colour. */
  ring?: string;
  /** Accent arc colour. */
  arc?: string;
  /** Forge spark colour. */
  spark?: string;
}

/**
 * CyclingForge brand mark (direction 1c "Royal Blue"): open "C" ring + accent arc
 * + 4-point forge spark. viewBox 120×120, stroke-width 13, r=44.
 */
export function LogoMark({ size = 40, ring = INK, arc = ACCENT, spark = ACCENT }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Path
        d="M 100.80 76.48 A 44 44 0 1 1 62.30 16.06"
        stroke={ring}
        strokeWidth={13}
        strokeLinecap="round"
      />
      <Path
        d="M 62.30 16.06 A 44 44 0 0 1 100.80 43.52"
        stroke={arc}
        strokeWidth={13}
        strokeLinecap="round"
      />
      <Path
        d="M 60 37 C 62.76 52.64 67.36 57.24 83 60 C 67.36 62.76 62.76 67.36 60 83 C 57.24 67.36 52.64 62.76 37 60 C 52.64 57.24 57.24 52.64 60 37 Z"
        fill={spark}
      />
    </Svg>
  );
}
