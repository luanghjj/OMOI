'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface BookingQRProps {
  code: string
  size?: number
}

export default function BookingQR({ code, size = 140 }: BookingQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, code, {
        width: size,
        margin: 2,
        color: {
          dark: '#3b1f0a',
          light: '#ffffff',
        },
      })
    }
  }, [code, size])

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg"
      style={{ width: size, height: size }}
    />
  )
}
