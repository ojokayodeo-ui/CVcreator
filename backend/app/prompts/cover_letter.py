COVER_LETTER_PROMPT = """
You are an expert cover letter writer. Write a compelling, personalised cover letter for this application.

CANDIDATE PERSONA:
{persona_json}

TARGET JOB:
{job_json}

MATCH SCORE: {match_score}/100

Rules:
1. Opening paragraph: hook with genuine enthusiasm + strongest relevant achievement
2. Middle paragraphs (2): connect specific experiences to specific job requirements
3. Closing: confident call to action, not desperate
4. Tone: professional but human — avoid corporate clichés
5. Length: 3-4 paragraphs, ~300-350 words
6. Do NOT repeat the CV — tell a story the CV cannot
7. Reference the company name and role title specifically
8. Output clean Markdown

Write the cover letter now:
"""
