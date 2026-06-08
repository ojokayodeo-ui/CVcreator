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
  ]
}}

Generate 15-20 likely interview questions. Be specific to this role and company.
"""
