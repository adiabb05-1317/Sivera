"use client";

import React, { useEffect, useRef, useCallback, memo } from "react";
import { ScrollArea } from "./scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "Flotia" | "You";
  content: string;
  timestamp: string;
}

interface TranscriptionInterfaceProps {
  messages?: Message[];
  liveTranscription?: string;
  isTranscribing?: boolean;
  currentSpeaker?: "Flotia" | "You" | null;
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

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <h4
          className={cn(
            "text-sm font-semibold",
            message.sender === "Flotia"
              ? "text-[--meet-primary]"
              : "text-[--meet-text-primary]"
          )}
        >
          {message.sender}
        </h4>
        {!isLive && (
          <span className="text-xs text-[--meet-text-secondary]">
            {formatTime(message.timestamp)}
          </span>
        )}
        {isLive && isTranscribing && (
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-[--meet-primary] rounded-full animate-bounce"></div>
            <div
              className="w-1 h-1 bg-[--meet-primary] rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-1 h-1 bg-[--meet-primary] rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        )}
      </div>
      <div
        className={cn(
          "p-3 rounded-lg text-sm",
          message.sender === "Flotia"
            ? "bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700/50"
            : "bg-[--meet-surface-light] border border-[--meet-border]"
        )}
      >
        <p className="text-[--meet-text-primary] leading-relaxed">
          {message.content}
          {isLive && isTranscribing && (
            <span className="inline-block w-2 h-4 bg-[--meet-primary] ml-1 animate-pulse rounded-sm"></span>
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
  const scrollTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Debounced scroll to reduce performance impact
  const debouncedScrollToBottom = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Only scroll when messages change or live transcription updates significantly
  useEffect(() => {
    debouncedScrollToBottom();
  }, [messages.length, debouncedScrollToBottom]);

  // Separate effect for live transcription to avoid over-scrolling
  useEffect(() => {
    if (liveTranscription && liveTranscription.length > 0) {
      // Only scroll if the transcription is getting long enough
      if (liveTranscription.length % 50 === 0) {
        debouncedScrollToBottom();
      }
    }
  }, [liveTranscription, debouncedScrollToBottom]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
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
      <ScrollArea className="h-full px-4 pb-3 dark:bg-black dark:border-none">
        {messages.length === 0 && !liveTranscription ? (
          <div className="flex items-center justify-center h-full text-[--meet-text-secondary]">
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
