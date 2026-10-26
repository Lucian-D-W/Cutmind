export const MACARON_COLOR_PALETTE = [
  '#FFB7B2',
  '#FFDAC1',
  '#E2F0CB',
  '#B5EAD7',
  '#C7CEEA',
]

export const MORANDI_COLOR_PALETTE = [
  '#7E8D98',
  '#9CAF88',
  '#D4B0B5',
  '#B5A89C',
  '#F2EFE4',
  '#8C9E88',
  '#AAB8A8',
  '#C7B299',
  '#D6C4B1',
  '#E8DED3',
]

export const DUNHUANG_COLOR_PALETTE = [
  '#2B5E72',
  '#387D5E',
  '#A8432E',
  '#D49C4E',
  '#E3DCD1',
  '#1685A9',
  '#1B5E20',
]

export const EARTH_COLOR_PALETTE = [
  '#606C38',
  '#283618',
  '#FEFAE0',
  '#DDA15E',
  '#BC6C25',
  '#7F5234',
  '#756F61',
]

export const COLOR_PALETTE = [
  ...MACARON_COLOR_PALETTE,
  ...MORANDI_COLOR_PALETTE,
  ...DUNHUANG_COLOR_PALETTE,
  ...EARTH_COLOR_PALETTE,
]

export const TEXT_COLOR_PALETTE = [
  '#ffffff', '#f5f5f5', '#e0e0e0', '#bdbdbd',
  '#1a1a2e', '#2d3436', '#636e72', '#000000',
  '#e94560', '#ff6b6b', '#ffa502', '#ffd93d',
  '#6bcb77', '#4d96ff', '#9b59b6', '#1abc9c',
]

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
