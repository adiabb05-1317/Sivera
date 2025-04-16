import { create } from 'zustand';

interface MeetingState {
  roomUrl: string | null;
  token: string | null;
  joined: boolean;
  participants: any[];
  setRoomData: (roomUrl: string, token: string) => void;
  setJoined: (joined: boolean) => void;
  setParticipants: (participants: any[]) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  roomUrl: null,
  token: null,
  joined: false,
  participants: [],
  setRoomData: (roomUrl, token) => set({ roomUrl, token }),
  setJoined: (joined) => set({ joined }),
  setParticipants: (participants) => set({ participants }),
}));
