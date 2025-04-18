import { useEffect, useState } from "react"
import { FlowterviewAvatarStatic } from "./path-avatar"
import { Icons } from "@/app/lib/icons"

const ConclusionSection = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [isButtonsVisible, setIsButtonsVisible] = useState(false)
  const [isTextVisible, setIsTextVisible] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    // Staggered animation sequence
    const avatarTimer = setTimeout(() => setIsVisible(true), 300)
    const textTimer = setTimeout(() => setIsTextVisible(true), 600)
    const buttonsTimer = setTimeout(() => setIsButtonsVisible(true), 900)
    const confettiTimer = setTimeout(() => setShowConfetti(true), 1200)

    return () => {
      clearTimeout(avatarTimer)
      clearTimeout(textTimer)
      clearTimeout(buttonsTimer)
      clearTimeout(confettiTimer)
    }
  }, [])

  return (
    <section className="glass-effect flex items-center justify-center w-full h-full overflow-hidden bg-[#232323]">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(240,248,255,0.7)] to-[rgba(216,223,229,0.8)] z-0"></div>
      
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute rounded-full animate-float"
              style={{
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                background: `rgba(${Math.random() * 255}, ${Math.random() * 200 + 55}, ${Math.random() * 100}, ${Math.random() * 0.5 + 0.5})`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDuration: `${Math.random() * 10 + 5}s`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Content */}
      <section className="flex lg:flex-row flex-col h-full w-full items-center justify-center relative gap-10 z-20 py-16 px-8">
        {/* Avatar section */}
        <div className="flex justify-center items-center">
          <div
            className={`transform transition-all duration-700 ease-out ${
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
            }`}
          >
            <FlowterviewAvatarStatic />
            
            {/* Golden glow ring around avatar */}
            {isVisible && (
              <div className="absolute inset-0 rounded-full purple-glow blur-[30px] opacity-20"></div>
            )}
          </div>
        </div>
        
        {/* Content section */}
        <div className="flex items-center flex-col justify-center max-w-md text-center">
          {/* Thank you message */}
          <div 
            className={`mb-8 transition-all duration-500 ease-out ${
              isTextVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <h2 className="text-2xl font-bold mb-3 purple-text">Session Complete</h2>
            <p className="text-[--meet-text-secondary] mb-6">Your Flowterview session has been successfully completed.</p>
            
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[rgba(119,75,229,0.1)] flex items-center justify-center border border-[--meet-border]">
                <Icons.CircleCheck className="w-5 h-5 text-[--meet-primary]" />
              </div>
              <span className="text-[--meet-text-primary]">Call successfully completed</span>
            </div>
          </div>
          
          {/* Action buttons */}
          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center w-full transition-all duration-500 ease-out ${
              isButtonsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <button className="meet-button meet-button-primary py-3 px-6">
              <Icons.DoubleSparkles />
              <span>Start New Session</span>
            </button>
            <button className="meet-button meet-button-secondary py-3 px-6">
              <Icons.Chat className="w-5 h-5" />
              <span>View History</span>
            </button>
          </div>
        </div>
      </section>
    </section>
  )
}

export default ConclusionSection
