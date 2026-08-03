import { ChatOpenAI } from "@langchain/openai"
import { z } from "zod"

let _llm: ChatOpenAI | null = null

export function getLLM(): ChatOpenAI {
  if (!_llm) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set")
    }
    _llm = new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0,
    })
  }
  return _llm
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getStructuredLLM<T extends z.ZodType<any>>(schema: T) {
  return getLLM().withStructuredOutput(schema)
}
