"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react";

export default function Translater() {
  // === СТАНИ КОМПОНЕНТА ===
  // "idle" — очікування, "listening" — активне слухання, "paused" — пауза
  const [status, setStatus] = useState<"idle" | "listening" | "paused">("idle");
  const [interim, setInterim] = useState(""); // поточний (тимчасовий) текст
  const [finals, setFinals] = useState<string[]>([]); // фінальні результати
  const recognitionRef = useRef<any | null>(null); // зберігаємо інстанс розпізнавання

  /**
   * Створює та налаштовує новий екземпляр Web Speech API
   * (window.SpeechRecognition або webkitSpeechRecognition)
   */
  const createRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Web Speech API not supported in this browser.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // слухає без зупинки між фразами
    recognition.interimResults = true; // показує проміжні результати
    recognition.lang = "ja-JP"; // японська мова

    /**
     * Обробка результатів розпізнавання
     * - event.results — масив результатів (деякі фінальні, деякі проміжні)
     */
    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      const finalTranscriptList: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // якщо фраза закінчена — додаємо у фінальні
          finalTranscriptList.push(transcript);
        } else {
          // якщо користувач ще говорить — показуємо як "interim"
          interimTranscript += transcript;
        }
      }

      // додаємо фінальні фрази до існуючих
      if (finalTranscriptList.length > 0) {
        setFinals((prev) => [...prev, ...finalTranscriptList]);
      }
      // оновлюємо проміжний текст
      setInterim(interimTranscript);
    };

    /**
     * Обробка помилок
     * "aborted" та "no-speech" — нормальні ситуації при паузах або зупинці
     */
    recognition.onerror = (e: any) => {
      if (["no-speech", "aborted"].includes(e.error)) return;
      console.error("Speech recognition error:", e);
    };

    recognition.onnomatch = () => {
      console.warn("No matching speech recognized.");
    };

    /**
     * Якщо API завершило роботу — можна перезапустити, якщо статус "listening"
     * Це забезпечує безперервне прослуховування без ручного перезапуску
     */
    recognition.onend = () => {
      console.log("Speech recognition ended.");
      if (status === "listening") {
        try {
          recognition.start();
        } catch {
          /* Chrome іноді викидає помилку при автоперезапуску — ігноруємо */
        }
      }
    };

    return recognition;
  };

  /**
   * ▶️ START — запускає розпізнавання з нуля
   */
  const startListening = () => {
    if (status === "listening") return;
    if (typeof window === "undefined") return;

    // очищаємо попередні результати
    setFinals([]);

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    recognition.start();
    setStatus("listening");
  };

  /**
   * ⏸️ PAUSE — зупиняє слухання, але не очищає текст
   */
  const pauseListening = () => {
    if (recognitionRef.current && status === "listening") {
      recognitionRef.current.stop();
      setStatus("paused");
    }
  };

  /**
   * 🔄 RESUME — відновлює слухання після паузи
   * (створює новий інстанс Web Speech API)
   */
  const resumeListening = () => {
    if (status === "paused") {
      const recognition = createRecognition();
      if (!recognition) return;
      recognitionRef.current = recognition;
      recognition.start();
      setStatus("listening");
    }
  };

  /**
   * ⏹️ STOP — повністю завершує сесію
   * (вимикає автоперезапуск і очищає об'єкт)
   */
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // вимикаємо автоперезапуск
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

        {/* === КНОПКИ КЕРУВАННЯ === */}
        <div className="flex justify-center gap-3 mb-6 flex-wrap">
          {/* Start */}
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

          {/* Pause */}
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

          {/* Resume */}
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

          {/* Stop */}
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

        {/* === ВИВЕДЕННЯ ТЕКСТУ === */}
        <div className="bg-white rounded-2xl shadow p-4 text-left">
          {/* Тимчасовий результат */}
          <p className="text-sm text-gray-400 mb-2">Interim (リアルタイム):</p>
          <p className="text-blue-600 min-h-8">{interim}</p>

          <hr className="my-4" />

          {/* Фінальні результати */}
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
