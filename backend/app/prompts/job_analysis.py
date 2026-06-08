JOB_ANALYSIS_PROMPT = """
You are an expert job market analyst. Analyse the following job posting and extract structured data.

JOB POSTING:
{job_text}

Return ONLY valid JSON with this exact structure:
{{
  "title": "",
  "company": "",
  "location": "",
  "description": "",
  "responsibilities": [],
  "requirements": [],
  "keywords": [],
  "salary_range": "",
  "job_type": ""
}}

For keywords: extract the most important technical skills, tools, soft skills, and domain-specific terms used throughout the posting.
"""

MATCH_ANALYSIS_PROMPT = """
You are a career coach and recruitment expert. Compare this candidate persona against the job requirements and provide a detailed match analysis.

CANDIDATE PERSONA:
{persona_json}

JOB REQUIREMENTS:
{job_json}

Return ONLY valid JSON:
{{
  "overall_score": 0,
  "skill_match": 0,
  "experience_match": 0,
  "education_match": 0,
  "matching_skills": [],
  "skill_gaps": [],
  "recommendations": []
}}

Scores are 0-100. Be honest and precise. Recommendations should be actionable.
"""
