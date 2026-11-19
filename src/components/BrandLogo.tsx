// Image-generated AEBACK logo assets shared across the site and workspace.
import { useTheme } from '../lib/theme'

type BrandLogoProps = { compact?: boolean; className?: string }

function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  const { theme } = useTheme()
  const asset = compact
    ? theme === 'dark' ? 'aeback-mark-dark.png' : 'aeback-mark.png'
    : theme === 'dark' ? 'aeback-logo-dark.png' : 'aeback-logo.png'
  const src = `${import.meta.env.BASE_URL}${asset}`
  return <img className={`aeback-brand-image${compact ? ' aeback-brand-image--compact' : ''}${className ? ` ${className}` : ''}`} src={src} alt="" draggable={false} />
}

export default BrandLogo
