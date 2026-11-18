import Icon from './Icon'

export type ThemeMode = 'dark' | 'light'

type ThemeToggleButtonProps = {
  theme: ThemeMode
  onToggle: () => void
}

function ThemeToggleButton({ theme, onToggle }: ThemeToggleButtonProps) {
  const nextThemeLabel = theme === 'dark' ? '浅色模式' : '深色模式'

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`切换到${nextThemeLabel}`}
      title={`切换到${nextThemeLabel}`}
      onClick={onToggle}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
    </button>
  )
}

export default ThemeToggleButton
