"use client";

import React, { useEffect, useRef, useCallback, memo, useState } from "react";
import { ScrollArea } from "./scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "Sia" | "You";
  content: string;
  timestamp: string;
}

interface TranscriptionInterfaceProps {
  messages?: Message[];
  liveTranscription?: string;
  isTranscribing?: boolean;
  currentSpeaker?: "Sia" | "You" | null;
  className?: string;
}

// Memoized message bubble component to prevent unnecessary re-renders
const MessageBubble = memo<{
  message: Message;
  isLive?: boolean;
  isTranscribing?: boolean;
}>(({ message, isLive = false, isTranscribing = false }) => {
  const formatTime = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  const isSia = message.sender === "Sia";

  return (
    <div className="mb-4 mt-2">
      {/* Sender name positioned based on who is speaking */}
      <div className={cn("mb-1", isSia ? "text-left" : "text-right")}>
        <h4
          className={cn(
            "text-[0.8rem] -mb-0.5 font-semibold font-kyiv",
            isSia
              ? "text-[--meet-primary] ml-1"
              : "text-[--meet-text-primary] mr-1"
          )}
        >
          {message.sender}
        </h4>
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          "p-3 rounded-lg text-sm",
          isSia
            ? "bg-gradient-to-r from-app-blue-50 to-app-blue-100 dark:from-app-blue-900/20 dark:to-app-blue-800/20 border border-app-blue-200 dark:border-app-blue-700/50"
            : "bg-[--meet-surface-light] border border-[--meet-border]"
        )}
      >
        <p className="text-[--meet-text-primary] leading-relaxed">
          {message.content}
          {isLive && isTranscribing && (
            <span className="inline-block w-2.5 h-2.5 bg-[--meet-primary] ml-1 animate-pulse rounded-full"></span>
          )}
        </p>
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

const TranscriptionInterface: React.FC<TranscriptionInterfaceProps> = ({
  messages = [],
  liveTranscription = "",
  isTranscribing = false,
  currentSpeaker = null,
  className,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>(null);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Track if user has manually scrolled up
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  // Check if user is near the bottom of the scroll area
  const isNearBottom = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return true;

    // Find the viewport element within the ScrollArea
    const viewport = scrollArea.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (!viewport) return true;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < 100; // Within 100px of bottom
  }, []);

  // Handle scroll events to detect manual scrolling
  const handleScroll = useCallback(
    (event: Event) => {
      const nearBottom = isNearBottom();
      setIsUserScrolledUp(!nearBottom);

      // Clear any pending auto-scroll when user manually scrolls
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    },
    [isNearBottom]
  );

  // Attach scroll listener to the viewport
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const viewport = scrollArea.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (!viewport) return;

    viewport.addEventListener("scroll", handleScroll);

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Smart scroll to bottom with auto-scroll after delay
  const smartScrollToBottom = useCallback(
    (immediate = false) => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(
        () => {
          // Always scroll immediately if user is near bottom or it's the first message
          if (!isUserScrolledUp || messages.length <= 1 || immediate) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setIsUserScrolledUp(false);
          } else {
            // If user has scrolled up, wait 3 seconds then auto-scroll to new messages
            if (autoScrollTimeoutRef.current) {
              clearTimeout(autoScrollTimeoutRef.current);
            }

            autoScrollTimeoutRef.current = setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setIsUserScrolledUp(false);
            }, 3000); // 3 second delay before auto-scrolling
          }
        },
        immediate ? 0 : 100
      );
    },
    [isUserScrolledUp, messages.length]
  );

  // Scroll when new messages arrive
  useEffect(() => {
    smartScrollToBottom();
  }, [messages.length, smartScrollToBottom]);

  // For live transcription, scroll more frequently as content is being populated
  useEffect(() => {
    if (liveTranscription && liveTranscription.length > 0) {
      // Scroll more frequently - every 20 characters or every word (whichever comes first)
      if (
        !isUserScrolledUp &&
        (liveTranscription.length % 20 === 0 || liveTranscription.endsWith(" "))
      ) {
        smartScrollToBottom(true); // Immediate scroll for live transcription when at bottom
      }
    }
  }, [liveTranscription, smartScrollToBottom, isUserScrolledUp]);

  // Additional effect to ensure continuous scrolling during live transcription
  useEffect(() => {
    if (liveTranscription && isTranscribing && !isUserScrolledUp) {
      // Debounced scroll for continuous content updates
      const scrollTimeout = setTimeout(() => {
        smartScrollToBottom(true);
      }, 100);

      return () => clearTimeout(scrollTimeout);
    }
  }, [
    liveTranscription,
    isTranscribing,
    isUserScrolledUp,
    smartScrollToBottom,
  ]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, []);

  // Memoize the live message to prevent unnecessary re-creation
  const liveMessage = React.useMemo(() => {
    if (!liveTranscription || !currentSpeaker) return null;

    return {
      id: "live",
      sender: currentSpeaker,
      content: liveTranscription,
      timestamp: new Date().toISOString(),
    };
  }, [liveTranscription, currentSpeaker]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 px-4 pb-3 dark:bg-black dark:border-none hide-scrollbar"
      >
        {messages.length === 0 && !liveTranscription ? (
          <div className="flex items-center justify-center h-full text-[--meet-text-secondary] m-3">
            <p className="text-xs text-center">
              Conversation will appear here...
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Render completed messages */}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isTranscribing={false}
              />
            ))}

            {/* Render live transcription */}
            {liveMessage && (
              <MessageBubble
                message={liveMessage}
                isLive={true}
                isTranscribing={isTranscribing}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default memo(TranscriptionInterface);
