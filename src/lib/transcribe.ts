import fs from "node:fs";

import OpenAI from "openai";

/**
 * Transcribes the spoken narration in an audio file via OpenAI's Whisper API.
 * Returns null (rather than throwing) when no API key is configured or the
 * call fails — the recipe analysis step falls back to caption/frame text.
 */
export async function transcribeAudio(audioPath: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1",
      response_format: "text",
    });

    const text = typeof response === "string" ? response : (response as { text?: string }).text;
    const trimmed = text?.trim();
    return trimmed ? trimmed : null;
  } catch (err) {
    console.error("[transcribe] Whisper transcription failed, continuing without it:", err);
    return null;
  }
}
