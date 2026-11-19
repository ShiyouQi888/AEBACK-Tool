// Aeback local file downloads and bounded text imports.
export function downloadText(title: string, extension: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'Aeback'}.${extension}`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readTextFile(file: File, maxBytes = 4 * 1024 * 1024) {
  if (file.size > maxBytes) throw new Error(`文件不能超过 ${maxBytes / 1024 / 1024} MB`)
  return (await file.text()).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
}
