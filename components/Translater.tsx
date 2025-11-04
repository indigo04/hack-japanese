"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";

export default function Translater() {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  const [status, setStatus] = useState<"idle" | "listening" | "paused">("idle");
  const [interim, setInterim] = useState("");
  const [finals, setFinals] = useState<string[]>([]);
  const recognitionRef = useRef<typeof SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!SpeechRecognition) {
      console.error("Web Speech API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ja-JP";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      const finalTranscriptList: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptList.push(transcript);
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscriptList.length > 0) {
        setFinals((prev) => [...prev, ...finalTranscriptList]);
      }
      setInterim(interimTranscript);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e);
    };

    recognition.onend = () => {
      if (status === "listening") {
        // auto-restart if not paused/stopped
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
  }, [SpeechRecognition, status]);

  const startListening = () => {
    if (recognitionRef.current && status === "idle") {
      recognitionRef.current.start();
      setStatus("listening");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setStatus("idle");
    }
  };

  const pauseListening = () => {
    if (recognitionRef.current && status === "listening") {
      recognitionRef.current.stop();
      setStatus("paused");
    }
  };

  const resumeListening = () => {
    if (recognitionRef.current && status === "paused") {
      recognitionRef.current.start();
      setStatus("listening");
    }
  };
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-gray-900">
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

        <div className="bg-white rounded-2xl shadow p-4 text-left">
          <p className="text-sm text-gray-400 mb-2">Interim (リアルタイム):</p>
          <p className="text-blue-600 min-h-8">{interim}</p>

          <hr className="my-4" />

          <p className="text-sm text-gray-400 mb-2">Final results (確定):</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {finals.map((t, i) => (
              <p key={i} className="text-gray-800">
                {t}
              </p>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
