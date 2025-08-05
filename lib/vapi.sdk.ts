// lib/vapi.client.ts
import Vapi from "@vapi-ai/web"; // default import ✅

export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!); // only pass string!
