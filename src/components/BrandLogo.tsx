// Aeback brand assets shared by the workspace and full-screen canvas tools.
type BrandLogoProps = { compact?: boolean; className?: string }

function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  const src = `${import.meta.env.BASE_URL}${compact ? 'aeback-mark.svg' : 'aeback-logo.svg'}`
  return <img className={`aeback-brand-image${compact ? ' aeback-brand-image--compact' : ''}${className ? ` ${className}` : ''}`} src={src} alt="" draggable={false} />
}

export default BrandLogo
