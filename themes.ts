export type ColorScheme = 'monochrome' | 'default' | 'sunset' | 'forest'

export const colorSchemes: Record<ColorScheme, {
  primary: string
  secondary: string
  accent: string
  neutral: string
  display: string
}> = {
  monochrome: {
    primary: 'bg-slate-800 hover:bg-slate-700',
    secondary: 'bg-slate-200 hover:bg-slate-300',
    accent: 'bg-slate-600 hover:bg-slate-500',
    neutral: 'bg-slate-300 hover:bg-slate-400',
    display: 'bg-white'
  },
  default: {
    primary: 'bg-blue-600 hover:bg-blue-500',
    secondary: 'bg-gray-200 hover:bg-gray-300',
    accent: 'bg-blue-500 hover:bg-blue-400',
    neutral: 'bg-gray-300 hover:bg-gray-400',
    display: 'bg-white'
  },
  sunset: {
    primary: 'bg-rose-600 hover:bg-rose-500',
    secondary: 'bg-amber-200 hover:bg-amber-300',
    accent: 'bg-orange-600 hover:bg-orange-500',
    neutral: 'bg-yellow-200 hover:bg-yellow-300',
    display: 'bg-white'
  },
  forest: {
    primary: 'bg-emerald-600 hover:bg-emerald-500',
    secondary: 'bg-lime-200 hover:bg-lime-300',
    accent: 'bg-green-600 hover:bg-green-500',
    neutral: 'bg-teal-200 hover:bg-teal-300',
    display: 'bg-white'
  }
}

