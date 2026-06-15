import asyncio
import re
import shutil
import httpx
from bs4 import BeautifulSoup
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

# CSS selectors for the main job description container, by platform domain.
SELECTORS_BY_PLATFORM = {
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
    "adzuna.": [".adp-body", "#job-ad-container", ".job-ad-content", "main"],
}

GENERIC_CANDIDATES = [
    "main", "article", "#main-content", "#job-description", ".job-description",
    "[class*='description']", "[class*='job-detail']", "[id*='description']",
    "[role='main']",
]


async def scrape_job_page(url: str) -> Optional[str]:
    """Scrape job posting text from a URL. Returns None on failure or if blocked."""
    text = await _scrape_with_httpx(url)
    if text and not _looks_blocked(text):
        return text

    print(f"httpx scrape insufficient for {url}, trying browser")
    text = await _scrape_with_browser(url)
    if text and not _looks_blocked(text):
        return text

    print(f"Scraping blocked or failed for {url}")
    return None


async def _scrape_with_httpx(url: str) -> Optional[str]:
    """Fetch the page HTML directly — works for server-rendered job pages
    without the overhead/fragility of a headless browser."""
    headers = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20, headers=headers) as client:
            response = await client.get(url)
            response.raise_for_status()
    except Exception as e:
        print(f"httpx fetch failed for {url}: {e}")
        return None

    final_url = str(response.url)
    soup = BeautifulSoup(response.text, "lxml")

    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    for domain, selectors in SELECTORS_BY_PLATFORM.items():
        if domain in final_url:
            for sel in selectors:
                el = soup.select_one(sel)
                if el:
                    text = _clean_text(el.get_text("\n"))
                    if len(text) > 100:
                        print(f"httpx extracted {len(text)} chars from '{sel}' on {final_url}")
                        return text

    best_text = ""
    for sel in GENERIC_CANDIDATES:
        for el in soup.select(sel):
            text = el.get_text("\n").strip()
            if len(text) > len(best_text):
                best_text = text

    if len(best_text) > 200:
        print(f"httpx extracted {len(best_text)} chars from generic candidates on {final_url}")
        return _clean_text(best_text)

    body = soup.body
    body_text = body.get_text("\n").strip() if body else ""
    print(f"httpx extracted {len(body_text)} chars from <body> fallback on {final_url}")
    return _clean_text(body_text)


async def _scrape_with_browser(url: str) -> Optional[str]:
    """Headless-browser fallback for JS-rendered pages."""
    try:
        async with async_playwright() as p:
            system_chromium = shutil.which("chromium") or shutil.which("chromium-browser")
            browser = await p.chromium.launch(
                headless=True,
                executable_path=system_chromium,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                ],
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

            async def _block(route):
                await route.abort()

            await context.route(
                re.compile(r"\.(png|jpe?g|gif|svg|webp|woff2?|ttf|mp4|avi|css)(\?.*)?$", re.I),
                _block,
            )
            await context.route(
                re.compile(r"(doubleclick|googlesyndication|google-analytics|googletagmanager|facebook\.net|hotjar|criteo|adsystem)"),
                _block,
            )

            page = await context.new_page()
            text = await _load_and_extract(page, url)
            await browser.close()
            return text
    except Exception as e:
        print(f"Browser scraping failed for {url}: {e}")
        return None


async def _load_and_extract(page, url: str) -> Optional[str]:
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    except Exception:
        try:
            await page.goto(url, wait_until="commit", timeout=30000)
        except Exception as e:
            print(f"Navigation failed for {url}: {e}")
            return None

    await page.wait_for_timeout(2000)
    print(f"Loaded '{await page.title()}' at {page.url}")
    return await _extract_job_text(page, url)


def _looks_blocked(text: str) -> bool:
    if len(text) < 200:
        return True
    lowered = text.lower()
    return any(marker in lowered for marker in BLOCKED_MARKERS)


async def _extract_job_text(page, url: str) -> str:
    """Try platform-specific selectors, fall back to generic body text."""
    for domain, selectors in SELECTORS_BY_PLATFORM.items():
        if domain in url:
            for sel in selectors:
                try:
                    el = await page.query_selector(sel)
                    if el:
                        text = _clean_text((await el.inner_text()).strip())
                        if len(text) > 100:
                            print(f"Extracted {len(text)} chars from '{sel}' on {page.url}")
                            return text
                except Exception:
                    continue

    # Generic fallback: evaluate candidate content containers and pick whichever
    # has the most text — avoids grabbing a near-empty <main> while the real
    # description sits in an unstyled div.
    best_text = ""
    for sel in GENERIC_CANDIDATES:
        try:
            elements = await page.query_selector_all(sel)
            for el in elements:
                text = (await el.inner_text()).strip()
                if len(text) > len(best_text):
                    best_text = text
        except Exception:
            continue

    if len(best_text) > 200:
        print(f"Extracted {len(best_text)} chars from generic candidates on {page.url}")
        return _clean_text(best_text)

    body_text = await page.inner_text("body")
    print(f"Extracted {len(body_text)} chars from <body> fallback on {page.url}")
    return _clean_text(body_text)


def _clean_text(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()
