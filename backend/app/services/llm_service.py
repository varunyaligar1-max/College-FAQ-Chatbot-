import os
from typing import List, Dict, Any, Tuple
from dotenv import load_dotenv
from langchain_groq import ChatGroq
import google.generativeai as genai

load_dotenv()

class LlmService:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.groq_key = os.getenv("GROQ_API_KEY", "").strip()
        
        if not self.gemini_key and not self.groq_key:
            raise ValueError("Neither GEMINI_API_KEY nor GROQ_API_KEY environment variable is set")
        
        # Configure Gemini if key exists
        if self.gemini_key:
            genai.configure(api_key=self.gemini_key)
            print("LLM Service: Initialized Gemini primary provider.")
        else:
            print("LLM Service: Initialized Groq backup provider (Llama-3.3-70b).")

    def _call_gemini(self, prompt: str) -> str:
        # Using gemini-1.5-flash as it is fast and reliable
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text

    def _call_groq(self, prompt: str) -> str:
        # Using LangChain Groq model
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=self.groq_key,
            temperature=0.2,
        )
        response = llm.invoke(prompt)
        return response.content

    async def generate_grounded_answer(
        self, 
        query: str, 
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Tuple[str, List[Dict[str, Any]]]:
        if not retrieved_chunks:
            return (
                "I don't have that information. Please ask another question or contact the college administration.", 
                []
            )

        # Build context string
        context_parts = []
        sources = []
        for i, chunk in enumerate(retrieved_chunks):
            doc_id = chunk.get("document_id")
            filename = chunk.get("filename")
            category = chunk.get("category")
            text = chunk.get("text")
            
            context_parts.append(f"Document {i+1} [{filename} - Category: {category}]:\n{text}\n")
            
            sources.append({
                "document_id": doc_id,
                "filename": filename,
                "category": category,
                "snippet": text[:150] + "..." if len(text) > 150 else text
            })
            
        context_text = "\n".join(context_parts)
        
        prompt = f"""You are a College FAQ Chatbot. You help students by answering questions using official college documents.
Answer the student's question based ONLY on the provided context retrieved from official college documents.
If the context does not contain the answer, say "I don't have that information." and do not explain further.

Do not invent, speculate, or assume anything. Your response must be strictly grounded in the context provided below.

Context:
---
{context_text}
---

Student Question: {query}

Answer:"""

        try:
            if self.gemini_key:
                answer = self._call_gemini(prompt)
            else:
                answer = self._call_groq(prompt)
                
            # If the LLM indicates it doesn't have the info, clean it up and clear sources
            answer_lower = answer.lower()
            if "i don't have that information" in answer_lower or "i do not have that information" in answer_lower:
                return ("I don't have that information.", [])
                
            return (answer.strip(), sources)
        except Exception as e:
            print(f"Error calling LLM provider: {e}")
            return ("Sorry, I encountered an error while processing your request.", [])
