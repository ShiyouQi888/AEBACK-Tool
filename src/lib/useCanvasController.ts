// Aeback canvas interaction controller — pan, zoom, and persistent node dragging.
import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'

export type CanvasCamera = { x: number; y: number; zoom: number }
export type CanvasBounds = { minX: number; minY: number; maxX: number; maxY: number }
export type CanvasViewport = { left: number; top: number; right: number; bottom: number }
type ActiveGesture =
  | { kind: 'pan'; lastX: number; lastY: number }
  | { kind: 'node'; id: string; offsetX: number; offsetY: number }

export function useViewportSize() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  useEffect(() => {
    const resize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  return size
}

export function useCanvasController(width: number, height: number, moveNode: (id: string, x: number, y: number) => void) {
  const [camera, setCamera] = useState<CanvasCamera>({ x: 0, y: 0, zoom: 1 })
  const cameraRef = useRef(camera)
  const svgRef = useRef<SVGSVGElement>(null)
  const gestureRef = useRef<ActiveGesture | null>(null)
  cameraRef.current = camera

  const toCanvasPoint = useCallback((event: { clientX: number; clientY: number }) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: event.clientX, y: event.clientY }
    return {
      x: (event.clientX - rect.left) * width / rect.width,
      y: (event.clientY - rect.top) * height / rect.height,
    }
  }, [height, width])

  const toWorldPoint = useCallback((event: { clientX: number; clientY: number }) => {
    const point = toCanvasPoint(event)
    const current = cameraRef.current
    return { x: (point.x - current.x) / current.zoom, y: (point.y - current.y) / current.zoom }
  }, [toCanvasPoint])

  const capturePointer = (event: PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) return
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const startPan = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    const point = toCanvasPoint(event)
    gestureRef.current = { kind: 'pan', lastX: point.x, lastY: point.y }
    capturePointer(event)
  }

  const startNodeDrag = (id: string, x: number, y: number, event: PointerEvent<SVGGElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const point = toWorldPoint(event)
    gestureRef.current = { kind: 'node', id, offsetX: point.x - x, offsetY: point.y - y }
    const svg = svgRef.current
    if (svg && !svg.hasPointerCapture(event.pointerId)) svg.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current
    if (!gesture) return
    if (gesture.kind === 'node') {
      const point = toWorldPoint(event)
      moveNode(gesture.id, point.x - gesture.offsetX, point.y - gesture.offsetY)
      return
    }
    const point = toCanvasPoint(event)
    setCamera((current) => ({ ...current, x: current.x + point.x - gesture.lastX, y: current.y + point.y - gesture.lastY }))
    gestureRef.current = { ...gesture, lastX: point.x, lastY: point.y }
  }

  const stopGesture = (event: PointerEvent<SVGSVGElement>) => {
    gestureRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const zoomAround = (zoom: number, anchor: { x: number; y: number }) => {
    const nextZoom = Math.max(0.35, Math.min(2.8, zoom))
    setCamera((current) => {
      const ratio = nextZoom / current.zoom
      return { zoom: nextZoom, x: anchor.x - (anchor.x - current.x) * ratio, y: anchor.y - (anchor.y - current.y) * ratio }
    })
  }

  const onWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const anchor = toCanvasPoint(event)
    const zoom = cameraRef.current.zoom * Math.exp(-event.deltaY * 0.0012)
    zoomAround(zoom, anchor)
  }

  const zoomIn = () => zoomAround(cameraRef.current.zoom * 1.2, { x: width / 2, y: height / 2 })
  const zoomOut = () => zoomAround(cameraRef.current.zoom / 1.2, { x: width / 2, y: height / 2 })
  const resetCamera = () => setCamera({ x: 0, y: 0, zoom: 1 })
  const fitBounds = (bounds: CanvasBounds, viewport: CanvasViewport) => {
    const boundsWidth = Math.max(1, bounds.maxX - bounds.minX)
    const boundsHeight = Math.max(1, bounds.maxY - bounds.minY)
    const zoom = Math.max(0.35, Math.min(1, (viewport.right - viewport.left - 32) / boundsWidth, (viewport.bottom - viewport.top - 32) / boundsHeight))
    const targetX = (viewport.left + viewport.right) / 2
    const targetY = (viewport.top + viewport.bottom) / 2
    setCamera({ zoom, x: targetX - (bounds.minX + bounds.maxX) / 2 * zoom, y: targetY - (bounds.minY + bounds.maxY) / 2 * zoom })
  }

  const focusPoint = (point: { x: number; y: number }, viewport: CanvasViewport, zoom = 1) => {
    const nextZoom = Math.max(0.35, Math.min(2.8, zoom))
    const targetX = (viewport.left + viewport.right) / 2
    const targetY = (viewport.top + viewport.bottom) / 2
    setCamera({ zoom: nextZoom, x: targetX - point.x * nextZoom, y: targetY - point.y * nextZoom })
  }

  return { camera, svgRef, startPan, startNodeDrag, onPointerMove, stopGesture, onWheel, zoomIn, zoomOut, resetCamera, fitBounds, focusPoint }
}
