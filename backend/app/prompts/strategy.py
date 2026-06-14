STRATEGY_PROMPT = """
You are a senior career strategist and interview coach. Create a comprehensive job-winning strategy for this application.

CANDIDATE PERSONA:
{persona_json}

TARGET JOB:
{job_json}

MATCH ANALYSIS:
{match_json}

Return ONLY valid JSON:
{{
  "strategy_plan": "Full markdown strategy document",
  "interview_stages": [
    {{
      "stage": "Stage name",
      "format": "Phone/Video/In-person/Technical",
      "duration": "estimated duration",
      "focus": "What they assess",
      "tips": []
    }}
  ],
  "interview_questions": [
    {{
      "category": "Behavioural/Technical/Situational/Culture",
      "question": "The question",
      "why_asked": "What they're testing",
      "suggested_answer_framework": "STAR/Direct/etc",
      "key_points": []
    }}
  ],
  "preparation_roadmap": [
    {{
      "week": "Week 1",
      "tasks": []
    }}
  ],
  "ideal_candidate_profile": "Full markdown description of the LinkedIn profile of an ideal, highly competitive candidate for this role"
}}

Generate 15-20 likely interview questions. Be specific to this role and company.

For "ideal_candidate_profile": describe, in markdown, what the LinkedIn profile of a top candidate who would land this role would look like. Include a sample headline, an "About" summary, key skills to list, the kind of experience entries and achievements they'd show, and any certifications or activity (posts, endorsements) that would stand out. Use this to highlight the gap between the candidate's current profile and this ideal.

Do not use em dashes (—) anywhere in the output. Use commas, periods, or "and" instead.
"""
