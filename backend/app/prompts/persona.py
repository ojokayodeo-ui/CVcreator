PERSONA_EXTRACTION_PROMPT = """
You are an expert CV analyst. Extract and structure the following CV text into a clean JSON object.

CV TEXT:
{cv_text}

Return ONLY valid JSON with this exact structure:
{{
  "full_name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin_url": "",
  "summary": "",
  "skills": [],
  "experience": [
    {{
      "title": "",
      "company": "",
      "start_date": "",
      "end_date": "",
      "location": "",
      "responsibilities": [],
      "achievements": []
    }}
  ],
  "education": [
    {{
      "degree": "",
      "institution": "",
      "year": "",
      "grade": ""
    }}
  ],
  "achievements": [],
  "certifications": []
}}
"""
