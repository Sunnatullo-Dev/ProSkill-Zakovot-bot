/**
 * Online O'yin Xonasi — ichki stage machine.
 *
 * App.tsx faqat shu komponentni `screen === "gameroom"` bo'lganda render qiladi.
 * Stage:
 *   join  → kod + taxallus kiritish
 *   play  → aktiv o'yin ekrani (polling)
 */
import { useState } from "react";
import GameRoomJoinScreen from "./GameRoomJoinScreen";
import GameRoomScreen from "./GameRoomScreen";

type Props = {
  /** Deep link orqali kelgan kod (room_<CODE>). */
  initialCode?: string;
  /** Foydalanuvchining displayName — taxallus uchun prefill. */
  playerName: string;
  onExit: () => void;
};

type Stage = { kind: "join" } | { kind: "play"; code: string };

export default function GameRoomRouter({ initialCode, playerName, onExit }: Props) {
  const [stage, setStage] = useState<Stage>({ kind: "join" });

  if (stage.kind === "join") {
    return (
      <GameRoomJoinScreen
        initialCode={initialCode}
        playerName={playerName}
        onJoined={(code) => setStage({ kind: "play", code })}
        onBack={onExit}
      />
    );
  }

  return (
    <GameRoomScreen
      roomCode={stage.code}
      playerName={playerName}
      onExit={() => setStage({ kind: "join" })}
    />
  );
}
