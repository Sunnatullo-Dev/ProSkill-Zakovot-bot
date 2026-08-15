/**
 * Zakovat Stoli — kuzatuvchi ichki stage machine.
 *
 * App.tsx faqat shu komponentni `screen === "zakovatTable"` bo'lganda render
 * qiladi. Stage:
 *   watch     → kod kiritish
 *   spectate  → jonli xona ko'rinishi (polling, faqat o'qish)
 */
import { useState } from "react";
import ZakovatTableWatchScreen from "./ZakovatTableWatchScreen";
import ZakovatTableRoomView from "./ZakovatTableRoomView";

type Props = {
  onExit: () => void;
};

type Stage = { kind: "watch" } | { kind: "spectate"; code: string };

export default function ZakovatTableRouter({ onExit }: Props) {
  const [stage, setStage] = useState<Stage>({ kind: "watch" });

  if (stage.kind === "watch") {
    return (
      <ZakovatTableWatchScreen
        onWatch={(code) => setStage({ kind: "spectate", code })}
        onBack={onExit}
      />
    );
  }

  return (
    <ZakovatTableRoomView
      code={stage.code}
      onExit={() => setStage({ kind: "watch" })}
    />
  );
}
