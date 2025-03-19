import { NextRequest } from "next/server";
import { Message,LanguageModelV1,streamText,tool } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createVercelAITools } from "solana-agent-kit";
import { solanaAgentWithPara } from "@/utils/init_server";
import {listParaToolsWeb} from "@/utils/get_all_tools"
// Initialize Groq with the mixtral model
// const groq = createGroq({
//   baseURL: "https://api.groq.com/openai/v1",
//   apiKey: process.env.GROQ_API_KEY,
// });
const openai = createOpenAI({
  baseURL: "https://api.together.xyz/v1",
  apiKey: process.env.OPENAI_API_KEY, // Ollama doesn't require a real API key, but the field is required
});
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as { messages: Message[] };
    
    
    const vercelTools = createVercelAITools(solanaAgentWithPara, solanaAgentWithPara.actions);
    const webTools = listParaToolsWeb()
    
    const tools = {...vercelTools,
     ...webTools
    }
    const result = await streamText({
      model: openai("meta-llama/Llama-3.3-70B-Instruct-Turbo-Free") as LanguageModelV1, // Using gemma3:1b model from Ollama instead of groq
      tools:tools as any,
      system: `
      You are a helpful agent that can interact onchain using the Solana Agent Kit. You are
      empowered to interact onchain using your tools. If someone asks you to do something you
      can't do with your currently available tools, you must say so, and encourage them to implement it
      themselves using the Solana Agent Kit, recommend they go to https://kit.sendai.fun for more information. Be
      concise and helpful with your responses. Refrain from restating your tools' descriptions unless it is explicitly requested.
    `,
      messages
    });
  

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
