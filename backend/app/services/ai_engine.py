import json
import re
from openai import AsyncOpenAI
from ..core.config import get_settings
from ..prompts.persona import PERSONA_EXTRACTION_PROMPT
from ..prompts.job_analysis import JOB_ANALYSIS_PROMPT, MATCH_ANALYSIS_PROMPT
from ..prompts.cv_optimisation import CV_OPTIMISATION_PROMPT
from ..prompts.cover_letter import COVER_LETTER_PROMPT
from ..prompts.strategy import STRATEGY_PROMPT

_client: AsyncOpenAI | None = None


def get_ai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=get_settings().openai_api_key)
    return _client


async def _chat(prompt: str, json_mode: bool = False) -> str:
    client = get_ai_client()
    kwargs = dict(
        model=get_settings().openai_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message.content.strip()


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
