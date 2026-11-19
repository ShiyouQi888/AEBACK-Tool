// Image-generated AEBACK logo assets shared across the site and workspace.
type BrandLogoProps = { compact?: boolean; className?: string }

function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  const src = `${import.meta.env.BASE_URL}${compact ? 'aeback-mark.png' : 'aeback-logo.png'}`
  return <img className={`aeback-brand-image${compact ? ' aeback-brand-image--compact' : ''}${className ? ` ${className}` : ''}`} src={src} alt="" draggable={false} />
}

export default BrandLogo
