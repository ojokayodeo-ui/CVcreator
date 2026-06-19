import json
import re
from anthropic import AsyncAnthropic
from ..core.config import get_settings
from ..prompts.persona import PERSONA_EXTRACTION_PROMPT
from ..prompts.job_analysis import JOB_ANALYSIS_PROMPT, MATCH_ANALYSIS_PROMPT
from ..prompts.cv_optimisation import CV_OPTIMISATION_PROMPT
from ..prompts.cover_letter import COVER_LETTER_PROMPT
from ..prompts.strategy import STRATEGY_PROMPT
from ..prompts.application_helper import APPLICATION_HELPER_PROMPT
from ..prompts.career_advisor import CAREER_ADVISOR_SYSTEM_PROMPT

_client: AsyncAnthropic | None = None


def get_ai_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=get_settings().anthropic_api_key)
    return _client


async def _chat(prompt: str, json_mode: bool = False) -> str:
    client = get_ai_client()
    settings = get_settings()
    system = "You are an expert career advisor and professional CV writer. Always respond with valid JSON when asked." if json_mode else "You are an expert career advisor and professional CV writer."
    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=16384,
        thinking={"type": "adaptive"},
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    # Extract text from response content blocks
    text = next(
        (block.text for block in response.content if hasattr(block, "text")),
        "",
    )
    return text.strip()


def _parse_json(text: str) -> dict:
    """Extract JSON from response, stripping markdown fences if present."""
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


async def extract_persona_from_cv(cv_text: str) -> dict:
    prompt = PERSONA_EXTRACTION_PROMPT.format(cv_text=cv_text)
    result = await _chat(prompt, json_mode=True)
    return _parse_json(result)


async def analyse_job(job_text: str) -> dict:
    prompt = JOB_ANALYSIS_PROMPT.format(job_text=job_text)
    result = await _chat(prompt, json_mode=True)
    return _parse_json(result)


async def calculate_match(persona: dict, job: dict) -> dict:
    prompt = MATCH_ANALYSIS_PROMPT.format(
        persona_json=json.dumps(persona, indent=2),
        job_json=json.dumps(job, indent=2),
    )
    result = await _chat(prompt, json_mode=True)
    return _parse_json(result)


async def generate_optimised_cv(persona: dict, job: dict, match: dict) -> str:
    prompt = CV_OPTIMISATION_PROMPT.format(
        persona_json=json.dumps(persona, indent=2),
        job_json=json.dumps(job, indent=2),
        match_json=json.dumps(match, indent=2),
    )
    return await _chat(prompt)


async def generate_cover_letter(persona: dict, job: dict, match_score: int) -> str:
    prompt = COVER_LETTER_PROMPT.format(
        persona_json=json.dumps(persona, indent=2),
        job_json=json.dumps(job, indent=2),
        match_score=match_score,
    )
    return await _chat(prompt)


async def generate_strategy(persona: dict, job: dict, match: dict) -> dict:
    prompt = STRATEGY_PROMPT.format(
        persona_json=json.dumps(persona, indent=2),
        job_json=json.dumps(job, indent=2),
        match_json=json.dumps(match, indent=2),
    )
    result = await _chat(prompt, json_mode=True)
    return _parse_json(result)


async def generate_application_helper(persona: dict, job: dict, match: dict) -> dict:
    prompt = APPLICATION_HELPER_PROMPT.format(
        persona_json=json.dumps(persona, indent=2),
        job_json=json.dumps(job, indent=2),
        match_json=json.dumps(match, indent=2),
    )
    result = await _chat(prompt, json_mode=True)
    return _parse_json(result)


async def career_advisor_reply(
    persona: dict,
    history: list[dict],
    message: str,
    image_base64: str | None = None,
    image_media_type: str | None = None,
) -> str:
    """Continue a career-advice conversation, grounded in the user's persona."""
    client = get_ai_client()
    settings = get_settings()
    system = CAREER_ADVISOR_SYSTEM_PROMPT.format(persona_json=json.dumps(persona, indent=2))

    messages = [
        {"role": m["role"], "content": m["content"] if m["content"].strip() else "[Image attached]"}
        for m in history
    ]

    if image_base64 and image_media_type:
        user_content = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": image_media_type,
                    "data": image_base64,
                },
            },
        ]
        if message.strip():
            user_content.append({"type": "text", "text": message})
        else:
            user_content.append({"type": "text", "text": "What do you make of this image?"})
    else:
        user_content = message

    messages.append({"role": "user", "content": user_content})

    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=2048,
        thinking={"type": "adaptive"},
        system=system,
        messages=messages,
    )
    text = next(
        (block.text for block in response.content if hasattr(block, "text")),
        "",
    )
    return text.strip()
