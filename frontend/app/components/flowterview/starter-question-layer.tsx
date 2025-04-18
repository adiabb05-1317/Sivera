import { Icons } from "@/app/lib/icons"
import { cn } from "@/app/lib/utils"
import React, { CSSProperties } from "react"

const StarterQuestionLayer = ({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) => {
  const questions = [
    "How could Flowterview help for demos?",
    "What's the business model of Flowterview?",
    "Who are the people behind Flowterview?",
  ]
  return (
    <section
      className={cn("absolute w-[80%] mx-auto", className)}
      style={style}
    >
      <div className="flex flex-col md:flex-row justify-center gap-8 w-full">
        {questions.map((question, index) => (
          <div
            key={index}
            className="px-8 py-4 relative rounded-[1rem] overflow-hidden flex items-center gap-4 border border-[#333333b1] bg-gradient-to-r from-[#0c0c0c] from-0%  to-[#0c0c0c] to-100% backdrop-blur-md shadow-lg"
          >
            <div className="absolute bottom-[30%] left-[-5%] right-[60%] -top-[10%] rounded-full blur-[20px] bg-[#48aeb328]"></div>
            <div>
              <Icons.DoubleSparkles />
            </div>
            <span className="text-[#FFFFFFCC]">{question}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default StarterQuestionLayer
