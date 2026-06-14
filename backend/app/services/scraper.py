import asyncio
import re
from typing import Optional
from playwright.async_api import async_playwright

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

BLOCKED_MARKERS = [
    "checking your browser",
    "verify you are a human",
    "additional verification required",
    "access denied",
    "are you a robot",
    "enable javascript and cookies",
    "request blocked",
]


async def scrape_job_page(url: str) -> Optional[str]:
    """Scrape job posting text from a URL. Returns None on failure or if blocked."""
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled"],
            )
            context = await browser.new_context(
                user_agent=USER_AGENT,
                viewport={"width": 1366, "height": 900},
                locale="en-US",
                timezone_id="Europe/London",
                extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
            )
            await context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
            )
            page = await context.new_page()

            text = await _load_and_extract(page, url)
            await browser.close()

            if text and _looks_blocked(text):
                print(f"Scraping blocked for {url}")
                return None

            return text
    except Exception as e:
        print(f"Scraping failed for {url}: {e}")
        return None


async def _load_and_extract(page, url: str) -> Optional[str]:
    try:
        await page.goto(url, wait_until="networkidle", timeout=45000)
    except Exception:
        # Some sites never go fully idle (live chat widgets etc.) — fall back to DOM ready
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        except Exception as e:
            print(f"Navigation failed for {url}: {e}")
            return None

    await page.wait_for_timeout(2000)
    return await _extract_job_text(page, url)


def _looks_blocked(text: str) -> bool:
    if len(text) < 200:
        return True
    lowered = text.lower()
    return any(marker in lowered for marker in BLOCKED_MARKERS)


async def _extract_job_text(page, url: str) -> str:
    """Try platform-specific selectors, fall back to generic body text."""
    selectors_by_platform = {
        "linkedin.com": [
            ".job-view-layout",
            ".description__text",
            ".jobs-description",
            ".jobs-box__html-content",
        ],
        "indeed.com": [
            "#jobDescriptionText",
            ".jobsearch-jobDescriptionText",
        ],
        "greenhouse.io": ["#content", ".job-post", "#main"],
        "lever.co": [".posting-page", ".content", ".posting-requirements"],
        "workday.com": ["[data-automation-id='job-posting-details']"],
        "smartrecruiters.com": [".job-sections", "#job-description"],
        "bamboohr.com": ["#JobDescriptionContainer", ".job-description"],
        "ashbyhq.com": ["[class*='job-posting']", "main"],
        "myworkdayjobs.com": ["[data-automation-id='jobPostingDescription']"],
    }

    for domain, selectors in selectors_by_platform.items():
        if domain in url:
            for sel in selectors:
                try:
                    el = await page.query_selector(sel)
                    if el:
                        text = _clean_text((await el.inner_text()).strip())
                        if len(text) > 100:
                            return text
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

    return _clean_text(await page.inner_text("body"))


def _clean_text(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()
