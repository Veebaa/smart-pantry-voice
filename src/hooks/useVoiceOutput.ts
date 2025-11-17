import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Voice ID mapping for different accents
const VOICE_MAP: Record<string, string> = {
  "en-US": "9BWtsMINqrJLrRacOk9x", // Aria - American English
  "en-GB": "EXAVITQu4vr4xnSDxMaL", // Sarah - British English
  "en-IE": "cgSgspJ2msm6clMCkdW9", // Jessica - Irish English
  "en-AU": "pFZP5JQG7iQjIQuC4Bku", // Lily - Australian English
  "es": "XB0fDUnXU5powFXDhCwa", // Charlotte - Spanish
  "fr": "XrExE9yKIg1WjnnlVkGX", // Matilda - French
  "de": "iP95p4xoKVk53GoZ742B", // Chris - German
  "it": "onwK4e9ZLuTAKqWW03F9", // Daniel - Italian
  "pt": "pqHfZKP75CvOlQylNhV4", // Bill - Portuguese
};

export const useVoiceOutput = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

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
    } catch (error) {
      console.error("Error fetching voice settings:", error);
      return { language: "en", accent: "en-US" };
    }
  };

  const playNextInQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    const text = audioQueueRef.current.shift()!;

    try {
      const { language, accent } = await getVoiceSettings();
      const voiceId = VOICE_MAP[accent] || VOICE_MAP["en-US"];

      const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
        body: { text, voiceId, language },
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0))],
          { type: "audio/mpeg" }
        );
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.pause();
          URL.revokeObjectURL(audioRef.current.src);
        }

        audioRef.current = new Audio(audioUrl);
        setIsSpeaking(true);

        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setIsSpeaking(false);
          isPlayingRef.current = false;
          playNextInQueue();
        };

        audioRef.current.onerror = () => {
          console.error("Audio playback error");
          setIsSpeaking(false);
          isPlayingRef.current = false;
          playNextInQueue();
        };

        await audioRef.current.play();
      }
    } catch (error: any) {
      console.error("Error in voice output:", error);
      toast.error("Voice output failed");
      setIsSpeaking(false);
      isPlayingRef.current = false;
      playNextInQueue();
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      audioQueueRef.current.push(text);
      playNextInQueue();
    },
    [playNextInQueue]
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
};
