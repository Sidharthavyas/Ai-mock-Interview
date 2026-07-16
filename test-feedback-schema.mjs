import { generateObjectWithFallback } from './lib/model.ts';
import { feedbackSchema } from './constants/index.ts';
import fs from 'fs';

const envPath = '.env.local';
let envContent = fs.readFileSync(envPath, 'utf8');

const lines = envContent.split('\n');
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    process.env[key] = value;
  }
}

async function test() {
  console.log('Starting test...');
  try {
    const transcript = [
      { role: 'interviewer', content: 'Tell me about yourself.' },
      { role: 'candidate', content: 'I am a software engineer with 2 years of experience working with React and Node.js.' },
    ];
    
    const formattedTranscript = transcript
      .map(sentence => `- ${sentence.role}: ${sentence.content}\n`)
      .join("");

    console.log('Calling generateObjectWithFallback...');
    const result = await generateObjectWithFallback({
      schema: feedbackSchema,
      providerOptions: {
        google: {
          structuredOutputs: false,
        },
        groq: {
          structuredOutputs: false,
        },
      },
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        
        IMPORTANT: The transcript is generated from real-time speech-to-text. Please automatically correct any phonetic/spelling errors in your evaluation.
        
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem Solving**: Ability to analyze problems and propose solutions.
        - **Cultural Fit**: Alignment with company values and job role.
        - **Confidence and Clarity**: Confidence in responses, engagement, and clarity.

        Please output the final result in JSON format conforming to the schema.
      `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });
    console.log('Success! Resolved object:', JSON.stringify(result.object, null, 2));
  } catch (err) {
    console.error('Validation or API Error:');
    console.error(err);
    if (err.toJsonResponse) {
      console.error(await err.toJsonResponse());
    }
  }
}

test();
