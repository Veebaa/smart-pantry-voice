import { useState, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

// Accent → OpenAI voice mapping (used for voiceId parameter)
const OPENAI_VOICE_MAP: Record<string, string> = {
  "en-US": "alloy",
  "en-GB": "verse",
  "en-IE": "alloy",
  "en-AU": "verse",
  "es": "alloy",
  "fr": "alloy",
  "de": "alloy",
  "it": "alloy",
  "pt": "alloy",
};

export const useVoiceOutput = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const onEndCallbackRef = useRef<(() => void) | null>(null);

  /** Fetch user TTS language/accent settings */
  const getVoiceSettings = async () => {
    try {
      const settings = await apiRequest("GET", "/api/user-settings");

      return {
        language: settings?.voice_language || "en",
        accent: settings?.voice_accent || "en-US",
      };
    } catch (err) {
      console.error("Error loading voice settings:", err);
      return { language: "en", accent: "en-US" };
    }
  };

  /** Convert base64 → playable blob URL */
  const createAudioUrl = (base64Audio: string) => {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    return URL.createObjectURL(blob);
  };

  /** Plays next item in queue */
  const playNext = useCallback(async () => {
    if (isPlayingRef.current || queueRef.current.length === 0) return;

    const text = queueRef.current.shift()!;
    isPlayingRef.current = true;

    try {
      const { accent, language } = await getVoiceSettings();
      const voiceId = OPENAI_VOICE_MAP[accent] || OPENAI_VOICE_MAP["en-US"];

      const data = await apiRequest("POST", "/api/openai-tts", { text, voiceId, language });

      if (!data?.audioContent) throw new Error("No audio content received");

      const audioUrl = createAudioUrl(data.audioContent);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      audioRef.current = new Audio(audioUrl);
      setIsSpeaking(true);

      audioRef.current.onended = () => {
        setIsSpeaking(false);
        isPlayingRef.current = false;
        URL.revokeObjectURL(audioUrl);

        if (onEndCallbackRef.current) {
          onEndCallbackRef.current();
          onEndCallbackRef.current = null;
        }

        playNext();
      };

      await audioRef.current.play();
    } catch (err) {
      console.error("Voice output error:", err);
      toast.error("Voice output failed");
      isPlayingRef.current = false;
      setIsSpeaking(false);
      playNext();
    }
  }, []);

  /** Public speak() method */
  const speak = useCallback(
    (text: string, opts?: { onend?: () => void }) => {
      if (opts?.onend) onEndCallbackRef.current = opts.onend;
      queueRef.current.push(text);
      playNext();
    },
    [playNext]
  );

  /** Stop all playback */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    queueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
};
