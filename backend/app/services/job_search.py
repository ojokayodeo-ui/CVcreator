"""Search live job vacancies via the Adzuna API."""
import httpx
from ..core.config import get_settings

ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs"

# Adzuna country codes it supports
SUPPORTED_COUNTRIES = {
    "gb": "United Kingdom",
    "us": "United States",
    "ca": "Canada",
    "au": "Australia",
    "de": "Germany",
    "fr": "France",
    "nl": "Netherlands",
    "ie": "Ireland",
    "in": "India",
    "sg": "Singapore",
    "za": "South Africa",
    "nz": "New Zealand",
    "br": "Brazil",
    "it": "Italy",
    "es": "Spain",
    "pl": "Poland",
    "mx": "Mexico",
}


async def search_jobs(
    keyword: str,
    country: str = "gb",
    location: str = "",
    page: int = 1,
    results_per_page: int = 20,
    max_days_old: int | None = None,
    sort_by: str = "relevance",
) -> dict:
    """Search for job vacancies on Adzuna."""
    settings = get_settings()
    if not settings.adzuna_app_id or not settings.adzuna_app_key:
        raise ValueError("Job search is not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY.")

    country = (country or "gb").lower()
    if country not in SUPPORTED_COUNTRIES:
        raise ValueError(f"Unsupported country code '{country}'.")

    params = {
        "app_id": settings.adzuna_app_id,
        "app_key": settings.adzuna_app_key,
        "what": keyword,
        "results_per_page": results_per_page,
        "content-type": "application/json",
    }
    if location:
        params["where"] = location
    if max_days_old:
        params["max_days_old"] = max_days_old
    if sort_by in ("date", "salary", "relevance"):
        params["sort_by"] = sort_by

    url = f"{ADZUNA_BASE_URL}/{country}/search/{page}"

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    results = []
    for job in data.get("results", []):
        results.append({
            "id": job.get("id"),
            "title": job.get("title", ""),
            "company": (job.get("company") or {}).get("display_name", ""),
            "location": (job.get("location") or {}).get("display_name", ""),
            "description": job.get("description", ""),
            "salary_min": job.get("salary_min"),
            "salary_max": job.get("salary_max"),
            "url": job.get("redirect_url", ""),
            "created": job.get("created", ""),
        })

    return {
        "count": data.get("count", 0),
        "results": results,
    }
