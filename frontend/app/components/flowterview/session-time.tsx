'use client'

import { useEffect, useState } from 'react'

export default function SessionTime() {
  const [sessionTime, setSessionTime] = useState(0)
  
  useEffect(() => {
    const startTime = Date.now()
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setSessionTime(elapsed)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="text-xs text-[--meet-text-secondary]">
      {formatTime(sessionTime)}
    </div>
  )
}
