export type ColorScheme = 'light' | 'dark' | 'system'

export type ThemeColors = {
  name: string
  background: string
  text: string
  primary: string
  secondary: string
  accent: string
  border: string
  display?: string
}

export const colorSchemes: Record<ColorScheme, ThemeColors> = {
  light: {
    name: 'ライト',
    background: '#ffffff',
    text: '#1a1a1a',
    primary: 'bg-blue-500 hover:bg-blue-600',
    secondary: 'bg-gray-200 hover:bg-gray-300',
    accent: 'bg-amber-500 hover:bg-amber-600',
    border: '#e2e8f0',
    display: 'bg-gray-100'
  },
  dark: {
    name: 'ダーク',
    background: '#1a1a1a',
    text: '#ffffff',
    primary: 'bg-blue-600 hover:bg-blue-700',
    secondary: 'bg-gray-700 hover:bg-gray-600',
    accent: 'bg-amber-600 hover:bg-amber-700',
    border: '#334155',
    display: 'bg-gray-800'
  },
  system: {
    name: 'システム',
    background: 'var(--background)',
    text: 'var(--text)',
    primary: 'bg-primary hover:bg-primary/90',
    secondary: 'bg-secondary hover:bg-secondary/90',
    accent: 'bg-accent hover:bg-accent/90',
    border: 'var(--border)',
    display: 'bg-secondary/20'
  }
} 