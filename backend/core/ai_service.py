import os
import json
import httpx
import logging
from core.config import settings

logger = logging.getLogger(__name__)

# In a real app we'd inject this via environment matching the session model
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

async def grade_response(question_text: str, grading_criteria: str, student_response: str, ai_model: str) -> tuple[int, str]:
    """
    Calls OpenRouter to grade the student response.
    Returns: (score [1-4], feedback [string])
    """
    prompt = f"""
    Score the following student response on a scale of 1 to 4 based strictly on the provided grading criteria.
    If the student does not answer the question at all or the response is entirely irrelevant, return a score of 0.
    Provide short, constructive feedback to the student, but only if there is meaningful feedback to provide. A few sentences or less.
    
    Question: {question_text}
    Grading Criteria: {grading_criteria}
    Student Answer: {student_response}
    
    Respond STRICTLY in the following JSON format:
    {{"score": 3, "feedback": "Your feedback text here."}}
    """
    
    # Check if we should mock it for E2E tests
    if ai_model == "test-model":
        logger.info("Mocking AI Call explicitly for E2E 'test-model'")
        return 3, "This is mocked feedback for the E2E test suite."

    # Check if we should mock it for testing when key is missing/dummy
    if settings.OPENROUTER_API_KEY == "dummy-key" or not settings.OPENROUTER_API_KEY:
        logger.info(f"Mocking AI Call for model: {ai_model} because API Key is missing or dummy")
        return 3, "This is mocked feedback because no OpenRouter API key is configured."

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost", # Required by OpenRouter
        "X-Title": "RealTime Feedback Tool"
    }
    
    payload = {
        "model": ai_model,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"}
    }
    
    logger.info(f"Calling OpenRouter with model: {ai_model}")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(OPENROUTER_URL, headers=headers, json=payload, timeout=20.0)
            
            # If the request failed, log the exact HTTP response
            if resp.status_code != 200:
                logger.error(f"OpenRouter Error Status {resp.status_code}")
                logger.error(f"OpenRouter Raw Response: {resp.text}")
                
            resp.raise_for_status()
            data = resp.json()
            content = data['choices'][0]['message']['content']
            parsed = json.loads(content)
            logger.info(f"OpenRouter Success! Score: {parsed.get('score')} mapped.")
            return int(parsed.get('score', 0)), parsed.get('feedback', 'No feedback provided.')
        except httpx.HTTPError as he:
            logger.error(f"HTTP Exception while connecting to OpenAI API: {he}")
            return 0, "Error connecting to AI service via HTTP."
        except json.JSONDecodeError as jde:
            logger.error(f"Failed to decode AI response JSON: {content} - {jde}")
            return 0, "AI returned invalid JSON format."
        except Exception as e:
            logger.exception(f"Unexpected AI Grading Error: {e}")
            return 0, "Error connecting to AI service."
