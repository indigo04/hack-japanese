/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { TranscriptFragment } from "@/types/TranscriptFragment";
import { useRef, useState } from "react";

export default function Translater() {
  const [status, setStatus] = useState<"idle" | "listening" | "paused">("idle");
  const [interim, setInterim] = useState("");
  const [finals, setFinals] = useState<TranscriptFragment[]>([]);
  const recognitionRef = useRef<any | null>(null);
  console.log(finals);

  // Час початку сесії (для відносних timestamp)
  const sessionStartRef = useRef<number | null>(null);
  // Час початку поточного фрагмента
  const currentSegmentStartRef = useRef<number | null>(null);

  const createRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Web Speech API not supported in this browser.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ja-JP";

    recognition.onstart = () => {
      if (!sessionStartRef.current) sessionStartRef.current = Date.now();
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      const newFinals: TranscriptFragment[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (!transcript) continue;

        // Коли користувач починає говорити — запам'ятовуємо час початку фрази
        if (currentSegmentStartRef.current === null) {
          currentSegmentStartRef.current = Date.now();
        }

        if (result.isFinal && transcript.length > 0) {
          const now = Date.now();
          const start_ms =
            currentSegmentStartRef.current - (sessionStartRef.current ?? now);
          const end_ms = now - (sessionStartRef.current ?? now);

          newFinals.push({ text: transcript, start_ms, end_ms });

          // Після фіналізації фрагмента — скидаємо таймер
          currentSegmentStartRef.current = null;
        } else {
          interimTranscript += transcript;
        }
      }

      if (newFinals.length > 0) {
        setFinals((prev) => [...prev, ...newFinals]);
      }
      setInterim(interimTranscript);
    };

    recognition.onerror = (e: any) => {
      if (["no-speech", "aborted"].includes(e.error)) return;
      console.error("Speech recognition error:", e);
    };

    recognition.onend = () => {
      if (status === "listening") {
        try {
          recognition.start();
        } catch {}
      }
    };

    return recognition;
  };

  const startListening = () => {
    if (status === "listening") return;
    if (typeof window === "undefined") return;

    setFinals([]);
    sessionStartRef.current = null;
    currentSegmentStartRef.current = null;

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    recognition.start();
    setStatus("listening");
  };

  const pauseListening = () => {
    if (recognitionRef.current && status === "listening") {
      recognitionRef.current.stop();
      setStatus("paused");
    }
  };

  const resumeListening = () => {
    if (status === "paused") {
      const recognition = createRecognition();
      if (!recognition) return;
      recognitionRef.current = recognition;
      recognition.start();
      setStatus("listening");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setStatus("idle");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-900">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold mb-4">
          🎙️ Live Japanese Speech Transcription
        </h1>

        <div className="flex justify-center gap-3 mb-6 flex-wrap">
          <button
            onClick={startListening}
            disabled={status === "listening"}
            className={`px-4 py-2 rounded-xl shadow text-white ${
              status === "listening"
                ? "bg-gray-400"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            Start
          </button>

          <button
            onClick={pauseListening}
            disabled={status !== "listening"}
            className={`px-4 py-2 rounded-xl shadow text-white ${
              status !== "listening"
                ? "bg-gray-400"
                : "bg-yellow-500 hover:bg-yellow-600"
            }`}
          >
            Pause
          </button>

          <button
            onClick={resumeListening}
            disabled={status !== "paused"}
            className={`px-4 py-2 rounded-xl shadow text-white ${
              status !== "paused"
                ? "bg-gray-400"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            Resume
          </button>

          <button
            onClick={stopListening}
            disabled={status === "idle"}
            className={`px-4 py-2 rounded-xl shadow text-white ${
              status === "idle" ? "bg-gray-400" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            Stop
          </button>
        </div>

        {/* === Виведення тексту === */}
        <div className="bg-white rounded-2xl shadow p-4 text-left">
          <p className="text-sm text-gray-400 mb-2">Interim (リアルタイム):</p>
          <p className="text-blue-600 min-h-8">{interim}</p>

          <hr className="my-4" />

          <p className="text-sm text-gray-400 mb-2">
            Final results (確定, with timestamps):
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-sm">
            {finals.map((t, i) => (
              <p key={i}>
                [{t.start_ms}–{t.end_ms} ms] {t.text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
