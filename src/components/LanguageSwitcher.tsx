// Aeback language selector — native, keyboard-accessible locale control.
import { localeOptions, useI18n, type Locale } from '../lib/i18n'

function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  return <select className="language-switcher" aria-label={t('界面语言')} title={t('切换界面语言')} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
    {localeOptions.map((language) => <option key={language.locale} value={language.locale}>{language.label}</option>)}
  </select>
}

export default LanguageSwitcher
