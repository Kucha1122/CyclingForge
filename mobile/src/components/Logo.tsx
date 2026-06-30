import { View, Text } from 'react-native';
import { useThemeStore } from '../stores/themeStore';
import { LogoMark } from './LogoMark';

const INK = '#0C0E16';
const PAPER = '#F2F3F8';
const ACCENT = '#2C3BC4';
const MUTED = '#7c7f8c';
const MUTED_DARK = '#6e7180';

interface LogoProps {
  /** Mark height in px. Wordmark scales relative to it. */
  markSize?: number;
  /** Show the "TRAINING · ANALYSIS · POWER" tagline. */
  tagline?: boolean;
}

/** CyclingForge horizontal lockup: brand mark + wordmark (Space Grotesk). */
export function Logo({ markSize = 40, tagline = false }: LogoProps) {
  const theme = useThemeStore((s) => s.theme);
  const onDark = theme === 'dark';

  const ring = onDark ? PAPER : INK;
  const text = onDark ? PAPER : INK;
  const muted = onDark ? MUTED_DARK : MUTED;
  const fontSize = markSize * 0.5;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <LogoMark size={markSize} ring={ring} arc={ACCENT} spark={ACCENT} />
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize, letterSpacing: -fontSize * 0.025, color: text }}>
          <Text style={{ fontFamily: 'SpaceGrotesk_500Medium' }}>CYCLING</Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_700Bold' }}>FORGE</Text>
        </Text>
        {tagline && (
          <Text
            style={{
              fontFamily: 'SpaceMono_400Regular',
              fontSize: markSize * 0.155,
              letterSpacing: markSize * 0.155 * 0.22,
              color: muted,
            }}
          >
            TRAINING · ANALYSIS · POWER
          </Text>
        )}
      </View>
    </View>
  );
}
