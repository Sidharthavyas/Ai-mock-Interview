import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";

/**
 * Dynamically resolves the AI model provider.
 * If GROQ_API_KEY is defined in the environment, it uses Groq's llama-3.3-70b-versatile.
 * Otherwise, it falls back to Google's gemini-2.0-flash.
 */
export function getAIModel() {
  if (process.env.GROQ_API_KEY) {
    console.log("Using Groq Provider (llama-3.3-70b-versatile)");
    return groq("llama-3.3-70b-versatile");
  }
  
  console.log("Using Google Provider (gemini-2.0-flash)");
  return google("gemini-2.0-flash");
}
