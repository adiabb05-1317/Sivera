import { Icons } from "@/app/lib/icons"
import Image from "next/image"
import { useEffect, useState } from "react"

interface AvatarProps {
  isTalking: boolean
  name: string
  color?: string
  id?: string
  size?: "small" | "normal" | "large"
}

const Avatar = ({
  isTalking,
  name = "User",
  color,
  id,
  size = "normal",
}: AvatarProps) => {
  const [pulseAnimation, setPulseAnimation] = useState(false)
  
  // Set size based on prop
  const dimensions = {
    small: { container: "min-w-[32px] min-h-[32px]", image: 22 },
    normal: { container: "min-w-[40px] min-h-[40px]", image: 28 },
    large: { container: "min-w-[48px] min-h-[48px]", image: 34 },
  }
  
  // Toggle pulse animation when talking state changes
  useEffect(() => {
    if (isTalking) {
      setPulseAnimation(true)
    } else {
      setPulseAnimation(false)
    }
  }, [isTalking])
  
  return (
    <div className="flex items-center">
      <div
        className={`relative ${dimensions[size].container} rounded-full transition-all duration-300 ease-in-out ${
          isTalking ? "active-speaker golden-glow transform scale-105" : ""
        }`}
      >
        {/* Pulse ring animation */}
        {pulseAnimation && (
          <div className="absolute inset-0 rounded-full animate-pulse-golden opacity-75"></div>
        )}
        
        <div
          className={`
            transition-all duration-300 ease-in-out
            ${dimensions[size].container} rounded-full flex items-center justify-center
            ${ isTalking ? "shadow-lg" : "shadow-md" }
          `}
          style={{
            background: id === "bot" 
              ? `linear-gradient(135deg, #ffa500, #ffc457)` 
              : (color || `linear-gradient(135deg, #8ab4f8, #4285f4)`),
          }}
        >
          {id === "bot" ? (
            <div className="relative flex items-center justify-center">
              <Image
                src="/Flowterviewlogo.svg"
                alt="Flowterview Logo"
                width={dimensions[size].image}
                height={dimensions[size].image}
                style={{ 
                  width: dimensions[size].image, 
                  height: dimensions[size].image,
                  filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.1))"
                }}
                className={`${isTalking ? "animate-subtle-pulse" : ""}`}
                priority
              />
            </div>
          ) : (
            <span className="text-white font-semibold drop-shadow-sm">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export interface Participant {
  id: string
  name: string
  isTalking: boolean
  color?: string
  isHost?: boolean
}

const AvatarStack = ({
  participants,
  showNames = false,
  size = "normal"
}: {
  participants: Participant[]
  showNames?: boolean
  size?: "small" | "normal" | "large"
}) => {
  // Sort participants so talking avatar comes first, then hosts
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isTalking !== b.isTalking) return a.isTalking ? -1 : 1;
    if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex items-center gap-3">
      {sortedParticipants.map((participant) => (
        <div
          key={participant.id}
          className={
            `flex items-center transition-all duration-300 ease-in-out ${
              participant.isTalking ? 'z-10 transform scale-105' : 'z-0'
            }`
          }
        >
          <div className="flex flex-col items-center">
            <Avatar
              id={participant.id}
              name={participant.name}
              isTalking={participant.isTalking}
              color={participant.color}
              size={size}
            />
            {showNames && (
              <div className="flex items-center mt-1.5">
                {participant.isHost && (
                  <Icons.Crown className="w-3 h-3 text-[--meet-primary] mr-1" />
                )}
                <span className={`text-xs whitespace-nowrap ${participant.isTalking ? 'golden-text' : 'text-[--meet-text-secondary]'}`}>
                  {participant.name}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AvatarStack
