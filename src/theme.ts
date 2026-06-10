export const colors = {
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.65)',
  done: '#FFFFFF',
  doneBg: 'rgba(255,255,255,0.25)',
  skip: 'rgba(255,255,255,0.18)',
  skipDisabled: 'rgba(255,255,255,0.07)',
  skipTextDisabled: 'rgba(255,255,255,0.3)',
  tip: 'rgba(255,255,255,0.15)',
};

// Each gradient is a [top, bottom] pair — warm, human tones
export const gradients: [string, string][] = [
  ['#C17A74', '#7A3E3E'], // terracotta
  ['#7A9E9F', '#3D6B6C'], // sage teal
  ['#9B8BBB', '#5C4A7A'], // dusty purple
  ['#C4956A', '#7A5535'], // warm amber
  ['#7A9E7E', '#3D6B47'], // sage green
  ['#A07B9B', '#5C3F6B'], // mauve
  ['#7A8FAE', '#3D5A7A'], // slate blue
  ['#C4A06A', '#7A5E35'], // golden
  ['#9E7A7A', '#6B3D3D'], // rose brown
  ['#7A9E9B', '#3D6B68'], // seafoam
];

export const typography = {
  mission: {
    fontSize: 26,
    fontWeight: '600' as const,
    lineHeight: 36,
    letterSpacing: 0.2,
  },
  tip: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 26,
    letterSpacing: 0.1,
  },
  button: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  skipBadge: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
};
