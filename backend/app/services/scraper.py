import asyncio
import re
from typing import Optional
from playwright.async_api import async_playwright


async def scrape_job_page(url: str) -> Optional[str]:
    """Scrape job posting text from a URL. Returns None on failure."""
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            page = await context.new_page()
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)

            text = await _extract_job_text(page, url)
            await browser.close()
            return text
    except Exception as e:
        print(f"Scraping failed for {url}: {e}")
        return None


async def _extract_job_text(page, url: str) -> str:
    """Try platform-specific selectors, fall back to generic body text."""
    selectors_by_platform = {
        "linkedin.com": [
            ".job-view-layout",
            ".description__text",
            ".jobs-description",
        ],
        "indeed.com": [
            "#jobDescriptionText",
            ".jobsearch-jobDescriptionText",
        ],
        "greenhouse.io": ["#content", ".job-post"],
        "lever.co": [".posting-page", ".content"],
        "workday.com": ["[data-automation-id='job-posting-details']"],
    }

    for domain, selectors in selectors_by_platform.items():
        if domain in url:
            for sel in selectors:
                try:
                    el = await page.query_selector(sel)
                    if el:
                        return (await el.inner_text()).strip()
                except Exception:
                    continue

    # Generic fallback: grab main content areas
    for sel in ["main", "article", "#main-content", ".job-description", "body"]:
        try:
            el = await page.query_selector(sel)
            if el:
                text = (await el.inner_text()).strip()
                if len(text) > 200:
                    return _clean_text(text)
        except Exception:
            continue

    return await page.inner_text("body")


def _clean_text(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()
