import Icon from './Icon'
import { useI18n } from '../lib/i18n'

export type ThemeMode = 'dark' | 'light'

type ThemeToggleButtonProps = {
  theme: ThemeMode
  onToggle: () => void
}

function ThemeToggleButton({ theme, onToggle }: ThemeToggleButtonProps) {
  const { t } = useI18n()
  const nextThemeLabel = t(theme === 'dark' ? '浅色模式' : '深色模式')

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`${t('切换到')} ${nextThemeLabel}`}
      title={`${t('切换到')} ${nextThemeLabel}`}
      onClick={onToggle}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
    </button>
  )
}

export default ThemeToggleButton
