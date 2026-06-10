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

export type Category = 'others' | 'relationships' | 'community' | 'self';
export type Difficulty = 'easy' | 'medium' | 'hard';

// Colour families encode meaning:
//   others        → terracotta  (warmth toward strangers)
//   relationships → amber/gold  (warmth toward close people)
//   community     → teal/sage   (environment, shared spaces)
//   self          → mauve       (reflection, inner work)
// Lightness encodes effort:
//   easy → lighter/warmer   medium → mid-tone   hard → deeper/richer
const gradientMap: Record<Category, Record<Difficulty, [string, string]>> = {
  others: {
    easy:   ['#D4948E', '#A05A54'],
    medium: ['#C17A74', '#7A3E3E'],
    hard:   ['#8B4A44', '#5A2020'],
  },
  relationships: {
    easy:   ['#D4B080', '#A07040'],
    medium: ['#C4956A', '#7A5535'],
    hard:   ['#8B6535', '#5A3A15'],
  },
  community: {
    easy:   ['#8FBEAF', '#4A8070'],
    medium: ['#7A9E9F', '#3D6B6C'],
    hard:   ['#4A7070', '#1A4040'],
  },
  self: {
    easy:   ['#BBA8CC', '#8070A0'],
    medium: ['#9B8BBB', '#5C4A7A'],
    hard:   ['#6A5085', '#3A2A55'],
  },
};

export function getGradient(category: Category, difficulty: Difficulty): [string, string] {
  return gradientMap[category][difficulty];
}

// Kept for the history screen fallback
export const gradients: [string, string][] = Object.values(gradientMap).flatMap(
  (d) => Object.values(d) as [string, string][]
);

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
