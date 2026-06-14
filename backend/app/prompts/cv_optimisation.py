CV_OPTIMISATION_PROMPT = """
You are an expert CV writer and ATS optimisation specialist. Rewrite the candidate's CV to be perfectly tailored for the target job.

CANDIDATE PERSONA:
{persona_json}

TARGET JOB:
{job_json}

MATCH ANALYSIS:
{match_json}

Rules:
1. Rewrite in clean, professional Markdown format
2. Use strong action verbs (Led, Delivered, Achieved, Built, Drove, etc.)
3. Incorporate job keywords naturally — do NOT keyword-stuff
4. Quantify achievements wherever possible (%, £/$, time saved, team size)
5. Reorder experience bullets to prioritise relevance to this role
6. Keep it concise: 1-2 pages equivalent
7. ATS-friendly: no tables, graphics descriptions, or special characters
8. Structure: Summary → Skills → Experience → Education → Certifications
9. For every role listed under Experience, add a final bullet starting with "**Key achievement:**" that highlights the single most impactful, quantified result from that role
10. Do not use em dashes (—) anywhere in the output. Use commas, periods, or "and" instead

Generate the full optimised CV now:
"""
