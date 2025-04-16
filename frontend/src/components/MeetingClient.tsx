"use client";

import React, { useEffect, useRef, useState } from "react";
import DailyIframe, { DailyCall, DailyEventObjectParticipant, DailyParticipant } from "@daily-co/daily-js";

interface MeetingClientProps {
  roomUrl: string; // The full Daily room URL (e.g., https://your-domain.daily.co/room-name)
}

export default function MeetingClient({ roomUrl }: MeetingClientProps) {
  const callObjectRef = useRef<DailyCall | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);

  useEffect(() => {
    if (!roomUrl) return;
    const callObject = DailyIframe.createCallObject();
    callObjectRef.current = callObject;

    // Join the room with mic enabled
    callObject.join({ url: roomUrl, userName: "You" });

    // Handle joined event
    callObject.on("joined-meeting", (ev) => {
      setJoined(true);
      updateParticipants();
    });

    // Handle participant events
    callObject.on("participant-joined", updateParticipants);
    callObject.on("participant-updated", updateParticipants);
    callObject.on("participant-left", updateParticipants);

    // Handle remote audio (bot/interviewer)
    callObject.on("track-started", (ev) => {
      if (
        ev.participant &&
        !ev.participant.local &&
        ev.track.kind === "audio" &&
        remoteAudioRef.current
      ) {
        // Attach remote audio (bot/interviewer) to audio element
        // The MediaStreamTrack should be wrapped in a MediaStream for playback
        const audioTrack = ev.track;
        if (audioTrack) {
          const mediaStream = new window.MediaStream([audioTrack]);
          remoteAudioRef.current.srcObject = mediaStream;
        }
      }
    });

    function updateParticipants() {
      const allParticipants = Object.values(callObject.participants());
      setParticipants(allParticipants.filter((p) => p.session_id));
    }

    return () => {
      callObject.leave();
      callObject.destroy();
    };
  }, [roomUrl]);

  if (!joined) return <div>Joining meeting...</div>;

  return (
    <div>
      <h2>Meeting in progress!</h2>
      {/* Remote audio from bot/interviewer */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <ul>
        {participants.map((p) => (
          <li key={p.session_id}>{p.user_name || p.session_id}</li>
        ))}
      </ul>
    </div>
  );
}
