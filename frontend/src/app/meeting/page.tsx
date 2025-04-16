"use client";
import { useEffect, useState } from "react";
import MeetingClient from "../../components/MeetingClient";

export default function MeetingPage() {
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoom() {
      try {
        const res = await fetch("http://localhost:8000/api/v1/connect", {
          method: "POST",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch room data");
        const data = await res.json();
        setRoomUrl(data.room_url);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      }
    }
    fetchRoom();
  }, []);

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!roomUrl) return <div>Loading meeting...</div>;

  return (
    <div>
      <h1>Join Meeting</h1>
      <MeetingClient roomUrl={roomUrl} />
    </div>
  );
}
