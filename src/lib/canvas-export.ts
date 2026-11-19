// Aeback shared canvas export — SVG rasterization for PNG and JPEG downloads.
export async function downloadCanvasRaster(svg: string, format: 'png' | 'jpg', title: string) {
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = source
    await image.decode()
    const maxDimension = 8192
    const maxPixels = 32_000_000
    const scale = Math.min(2, maxDimension / image.naturalWidth, maxDimension / image.naturalHeight, Math.sqrt(maxPixels / (image.naturalWidth * image.naturalHeight)))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.floor(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器无法创建图片画布。')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.94))
    if (!blob) throw new Error('图片生成失败，请改用 SVG 导出。')
    const downloadUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = `${title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'Aeback'}.${format}`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  } finally {
    URL.revokeObjectURL(source)
  }
}
