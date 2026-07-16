import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { generateObject as aiGenerateObject, generateText as aiGenerateText } from "ai";

/**
 * Dynamically resolves the AI model provider.
 * Prioritizes Google's gemini-3.5-flash, falling back to Groq if Google is not configured.
 */
export function getAIModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.log("Using Google Provider (gemini-3.5-flash) as priority");
    return google("gemini-3.5-flash");
  }
  
  if (process.env.GROQ_API_KEY) {
    console.log("Using Groq Provider (llama-3.3-70b-versatile)");
    return groq("llama-3.3-70b-versatile");
  }
  
  console.log("Using Google Provider (gemini-3.5-flash) fallback");
  return google("gemini-3.5-flash");
}

/**
 * Executes generateObject prioritizing Google Gemini models (3.5-flash, then 3.1-flash-lite),
 * falling back to Groq Llama 3.3.
 */
export async function generateObjectWithFallback<T>(params: any): Promise<any> {
  // 1. Try Google Gemini 3.5 Flash first (priority)
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      console.log("Attempting generateObject with Gemini 3.5 Flash");
      const googleProviderOptions = params.providerOptions?.google 
        ? { ...params.providerOptions.google }
        : {};
      
      // If structuredOutputs is set to false, remove it or set to true for Gemini
      if ('structuredOutputs' in googleProviderOptions) {
        delete googleProviderOptions.structuredOutputs;
      }

      return await aiGenerateObject({
        ...params,
        model: google("gemini-3.5-flash"),
        providerOptions: {
          ...params.providerOptions,
          google: googleProviderOptions,
        },
      });
    } catch (error) {
      console.error("Gemini 3.5 Flash generateObject failed, trying Gemini 3.1 Flash Lite:", error);
    }

    // 2. Try Google Gemini 3.1 Flash Lite
    try {
      console.log("Attempting generateObject with Gemini 3.1 Flash Lite");
      const googleProviderOptions = params.providerOptions?.google 
        ? { ...params.providerOptions.google }
        : {};
      
      if ('structuredOutputs' in googleProviderOptions) {
        delete googleProviderOptions.structuredOutputs;
      }

      return await aiGenerateObject({
        ...params,
        model: google("gemini-3.1-flash-lite"),
        providerOptions: {
          ...params.providerOptions,
          google: googleProviderOptions,
        },
      });
    } catch (error) {
      console.error("Gemini 3.1 Flash Lite generateObject failed, falling back to Groq:", error);
    }
  }

  // 3. Try Groq Llama 3.3 as fallback
  if (process.env.GROQ_API_KEY) {
    try {
      console.log("Attempting generateObject with Llama 3.3 (groq)");
      // Groq requires structuredOutputs to be true for schema/responseFormat to work properly
      const groqProviderOptions = params.providerOptions?.groq
        ? { ...params.providerOptions.groq, structuredOutputs: true }
        : { structuredOutputs: true };

      return await aiGenerateObject({
        ...params,
        model: groq("llama-3.3-70b-versatile"),
        providerOptions: {
          ...params.providerOptions,
          groq: groqProviderOptions,
        },
      });
    } catch (error) {
      console.error("Groq generateObject failed:", error);
      throw error;
    }
  }

  // 4. Fallback to default resolved model
  console.log("Attempting generateObject with default model");
  return await aiGenerateObject({
    ...params,
    model: getAIModel(),
  });
}

/**
 * Executes generateText prioritizing Google Gemini models (3.5-flash, then 3.1-flash-lite),
 * falling back to Groq Llama 3.3.
 */
export async function generateTextWithFallback(params: any): Promise<any> {
  // 1. Try Google Gemini 3.5 Flash first (priority)
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      console.log("Attempting generateText with Gemini 3.5 Flash");
      return await aiGenerateText({
        ...params,
        model: google("gemini-3.5-flash"),
      });
    } catch (error) {
      console.error("Gemini 3.5 Flash generateText failed, trying Gemini 3.1 Flash Lite:", error);
    }

    // 2. Try Google Gemini 3.1 Flash Lite
    try {
      console.log("Attempting generateText with Gemini 3.1 Flash Lite");
      return await aiGenerateText({
        ...params,
        model: google("gemini-3.1-flash-lite"),
      });
    } catch (error) {
      console.error("Gemini 3.1 Flash Lite generateText failed, falling back to Groq:", error);
    }
  }

  // 3. Try Groq Llama 3.3 as fallback
  if (process.env.GROQ_API_KEY) {
    try {
      console.log("Attempting generateText with Llama 3.3 (groq)");
      return await aiGenerateText({
        ...params,
        model: groq("llama-3.3-70b-versatile"),
      });
    } catch (error) {
      console.error("Groq generateText failed:", error);
      throw error;
    }
  }

  // 4. Fallback to default resolved model
  console.log("Attempting generateText with default model");
  return await aiGenerateText({
    ...params,
    model: getAIModel(),
  });
}

