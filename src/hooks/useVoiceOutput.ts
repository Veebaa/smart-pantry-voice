import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Accent → OpenAI voice mapping
const OPENAI_VOICE_MAP: Record<string, string> = {
  "en-US": "alloy",    // Default American
  "en-GB": "verse",    // British
  "en-IE": "alloy",    // No Irish voice—fallback to neutral
  "en-AU": "verse",    // Best AU approximation
  "es": "alloy",       // Spanish (ES/LATAM handled by model)
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { language: "en", accent: "en-US" };

      const { data: settings } = await supabase
        .from("user_settings")
        .select("voice_language, voice_accent")
        .eq("user_id", user.id)
        .single();

      return {
        language: settings?.voice_language || "en",
        accent: settings?.voice_accent || "en-US",
      };
    } catch (err) {
      console.error("Error loading voice settings:", err);
      return { language: "en", accent: "en-US" };
    }
  };

  /** Convert ArrayBuffer → playable blob URL */
  const createAudioUrl = (buffer: ArrayBuffer) => {
    const blob = new Blob([buffer], { type: "audio/mpeg" });
    return URL.createObjectURL(blob);
  };

  /** Plays next item in queue */
  const playNext = useCallback(async () => {
    if (isPlayingRef.current || queueRef.current.length === 0) return;

    const text = queueRef.current.shift()!;
    isPlayingRef.current = true;

    try {
      const { accent, language } = await getVoiceSettings();
      const voice = OPENAI_VOICE_MAP[accent] || OPENAI_VOICE_MAP["en-US"];

      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          input: text,
          voice,
          format: "mp3",
          language,
        }),
      });

      if (!res.ok) throw new Error(`OpenAI TTS failed: ${res.status}`);

      // Convert binary stream → ArrayBuffer
      const audioBuffer = await res.arrayBuffer();
      const audioUrl = createAudioUrl(audioBuffer);

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
