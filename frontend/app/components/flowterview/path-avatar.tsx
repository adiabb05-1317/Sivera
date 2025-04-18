"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface FlowterviewAvatarProps {
  isTalking: boolean
}

export const FlowterviewAvatar = ({ isTalking = false }: FlowterviewAvatarProps) => {
  const [pulseEffect, setPulseEffect] = useState(false)
  const [animationIntensity, setAnimationIntensity] = useState(0)

  // Enhanced animation effects when talking state changes
  useEffect(() => {
    if (isTalking) {
      setPulseEffect(true)
      // Simulate voice intensity variations
      const intensityInterval = setInterval(() => {
        setAnimationIntensity(Math.random())
      }, 300)
      return () => clearInterval(intensityInterval)
    } else {
      setPulseEffect(false)
      setAnimationIntensity(0)
    }
  }, [isTalking])

  return (
    <div className="relative flex items-center justify-center w-36 h-36 md:w-48 md:h-48 animate-fade-in">
      {/* Multiple layered glow effects */}
      {isTalking && (
        <>
          <div className="absolute inset-0 rounded-full golden-glow blur-[20px] opacity-30"></div>
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#ffa500] to-[#ffdd70] opacity-10 animate-pulse"></div>
          <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-[#ffa500] to-[#ffdd70] opacity-5 blur-[30px]"></div>
        </>
      )}
      
      {/* Outer ring with gradient border */}
      <div 
        className={`absolute inset-0 rounded-full ${isTalking ? 'animate-pulse-golden' : ''}`}
        style={{
          background: isTalking 
            ? 'linear-gradient(rgba(42,42,42,0.8), rgba(42,42,42,0.8)), linear-gradient(90deg, #ffa500, #ffdd70, #ffa500)' 
            : 'linear-gradient(rgba(42,42,42,0.8), rgba(42,42,42,0.8)), linear-gradient(90deg, #444, #555, #444)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          border: '2px solid transparent',
          boxShadow: isTalking ? '0 0 15px rgba(255,165,0,0.5)' : 'none'
        }}
      ></div>
      
      {/* Inner Circle with Gradient Background */}
      <div className="absolute inset-[6px] rounded-full overflow-hidden">
        <div className="w-full h-full relative bg-gradient-to-b from-[#2a2a2a] to-[#222] flex items-center justify-center">
          {/* Logo with golden shadow effect */}
          <div className="relative">
            <div 
              className={`absolute inset-0 rounded-full blur-[10px] opacity-30 ${isTalking ? 'scale-110' : 'scale-100'} transition-all duration-500`}
              style={{ background: 'radial-gradient(circle, rgba(255,165,0,0.8) 0%, rgba(255,140,0,0) 70%)' }}  
            ></div>
            <Image
              src="/Flowterviewlogo.svg"
              alt="Flowterview"
              width={80}
              height={80}
              className={`${isTalking ? 'scale-110' : 'scale-100'} transition-all duration-500 drop-shadow-[0_0_8px_rgba(255,165,0,0.5)]`}
              style={{ filter: isTalking ? 'drop-shadow(0 0 8px rgba(255,165,0,0.7))' : 'none' }}
            />
          </div>
          
          {/* Enhanced sound wave visualization */}
          {isTalking && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <div className="flex items-end space-x-[3px] h-5">
                {/* Generate dynamic sound waves based on animation intensity */}
                {[...Array(9)].map((_, i) => {
                  // Calculate height based on position and animation intensity
                  const baseHeight = Math.sin((i / 8) * Math.PI) * 16 
                  const variation = animationIntensity * 10
                  const height = Math.max(3, baseHeight + (Math.random() * variation))
                  const delay = i * 100
                  
                  return (
                    <div 
                      key={i}
                      className="w-[3px] rounded-full animate-sound-wave"
                      style={{
                        height: `${height}px`,
                        background: 'linear-gradient(to bottom, #ffd700, #ffa500)',
                        animationDelay: `${delay}ms`,
                        boxShadow: '0 0 5px rgba(255,165,0,0.7)'
                      }}
                    ></div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const FlowterviewAvatarStatic = () => {
  return (
    <div className="relative flex items-center justify-center w-36 h-36 md:w-48 md:h-48 animate-fade-in">
      {/* Outer ring with subtle gradient */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(rgba(42,42,42,0.8), rgba(42,42,42,0.8)), linear-gradient(90deg, #555, #666, #555)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          border: '2px solid transparent',
        }}
      ></div>
      
      {/* Main avatar container */}
      <div className="absolute inset-[6px] rounded-full overflow-hidden">
        <div className="w-full h-full relative bg-gradient-to-b from-[#2a2a2a] to-[#222] flex items-center justify-center">
          <Image
            src="/Flowterviewlogo.svg"
            alt="Flowterview"
            width={70}
            height={70}
            className="transition-transform duration-300"
          />
        </div>
      </div>
    </div>
  )
}
