"use client";
import { cn } from "@/app/lib/utils";
import usePathStore from "@/app/store/PathStore";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const VisualLayer = ({ className }: { className?: string }) => {
  const { sources } = usePathStore();
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImageSrc, setCurrentImageSrc] = useState("");
  const [displayedSource, setDisplayedSource] = useState<any>(null);
  const prevSourcesRef = useRef<any>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);

  // Initial setup for first load
  useEffect(() => {
    if (sources.length > 0 && initialLoadRef.current) {
      console.log("Initial load detected");
      initialLoadRef.current = false;

      // For first load, show loader briefly then set displayed source
      setIsLoading(true);
      setImageLoaded(false);

      // Set displayed source immediately for first load
      setTimeout(() => {
        setDisplayedSource(sources[0]);
      }, 100);
    }
  }, [sources]);

  // Handle source changes
  useEffect(() => {
    // Skip if this is initial load (handled by other effect)
    if (initialLoadRef.current) return;

    // Check if sources have changed
    const hasSourceChanged =
      sources.length > 0 &&
      (!prevSourcesRef.current ||
        JSON.stringify(prevSourcesRef.current[0]?.metadata) !==
          JSON.stringify(sources[0]?.metadata));

    if (hasSourceChanged) {
      console.log("Source changed, starting transition sequence");

      // 1. Immediately hide current content and show loader
      setImageLoaded(false);
      setIsLoading(true);
      setDisplayedSource(null); // Clear displayed source

      // 2. Store the new source for comparison
      if (sources[0]?.metadata?.link) {
        setCurrentImageSrc(sources[0]?.metadata?.link);
      }

      // 3. After a short delay, set the displayed source to trigger rendering
      // This ensures the loader is visible before attempting to load the new image
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }

      loadingTimerRef.current = setTimeout(() => {
        setDisplayedSource(sources[0]);
      }, 300);

      // 4. Safety timeout to ensure we eventually show something
      const safetyTimer = setTimeout(() => {
        console.log("Safety timeout triggered - forcing content display");
        setImageLoaded(true);
        setIsLoading(false);
        setDisplayedSource(sources[0]);
      }, 3000);

      // Store current sources for future comparison
      prevSourcesRef.current = [...sources];

      return () => {
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        clearTimeout(safetyTimer);
      };
    }
  }, [sources]);

  const handleImageLoad = () => {
    console.log("Image loaded event fired");
    // Only update states if we're still on the same image that started loading
    if (
      displayedSource?.metadata?.link === currentImageSrc ||
      // Also handle first load case
      (initialLoadRef.current === false && displayedSource && !currentImageSrc)
    ) {
      console.log("Image load confirmed, updating state");
      setImageLoaded(true);
      setTimeout(() => {
        setIsLoading(false);
      }, 300); // Short delay to ensure smooth transition
    }
  };

  // If no sources, don't render anything
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full h-full flex relative", className)}>
      {/* Translucent loading overlay - always render this */}
      <div
        className={cn(
          "absolute inset-0 bg-[#0e0f0f]/80 backdrop-blur-sm z-10 flex items-center justify-center transition-opacity duration-500",
          isLoading ? "opacity-70" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="w-16 h-16 border-4 border-t-transparent border-[#383838] rounded-full animate-spin"></div>
      </div>

      {/* Only render content when we have a displayedSource */}
      {displayedSource &&
        displayedSource.metadata.type === "image" &&
        displayedSource.metadata.link && (
          <div
            className={cn(
              "w-full h-full transition-opacity duration-500",
              imageLoaded && !isLoading ? "opacity-100" : "opacity-0"
            )}
          >
            <Image
              key={displayedSource.metadata.link}
              src={displayedSource.metadata.link}
              className="w-full h-full object-contain"
              alt="Content Image"
              fill
              onLoad={handleImageLoad}
              onError={(e) => {
                console.error(
                  "Image failed to load:",
                  displayedSource.metadata.link,
                  e
                );
                // Force display even on error
                setImageLoaded(true);
                setIsLoading(false);
              }}
              priority
            />
          </div>
        )}
    </div>
  );
};

export default VisualLayer;
