import { TSource } from "@/lib/types/general"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names using clsx and merges Tailwind classes properly
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const filteredSources = (sources: TSource[]): TSource[] => {
  if (!sources || sources.length === 0) return []

  const highestScore = Math.max(...sources.map((source) => source.score || 0))
  const highestScoreSources = sources.filter(
    (source) => source.score === highestScore
  )

  console.log("Filtered sources:", highestScoreSources)

  return highestScoreSources[0].score > 0.26 ? highestScoreSources : []
}
