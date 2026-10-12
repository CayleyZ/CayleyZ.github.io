"""Read citation statistics from a public Google Scholar author profile."""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
import re
import sys
import time
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup
import requests

PROFILE_URL = "https://scholar.google.com/citations"
PAGE_SIZE = 100
MAX_PAGES = 5
REQUEST_TIMEOUT = (10, 20)
MAX_ATTEMPTS = 3
LOGGER = logging.getLogger(__name__)


class CitationFetchError(RuntimeError):
    """The profile could not be read safely; retain the last published data."""


def parse_number(text):
    value = text.strip().removesuffix("*").replace(",", "")
    if not value.isdecimal():
        raise CitationFetchError(f"Invalid citation statistic: {text!r}")
    return int(value)


def fetch_page(session, scholar_id, start):
    for attempt in range(1, MAX_ATTEMPTS + 1):
        LOGGER.info("Reading profile, publication offset %s, attempt %s", start, attempt)
        try:
            response = session.get(
                PROFILE_URL,
                params={"user": scholar_id, "hl": "en", "cstart": start, "pagesize": PAGE_SIZE},
                timeout=REQUEST_TIMEOUT,
            )
            soup = BeautifulSoup(response.text, "html.parser")
            if response.status_code in (403, 429) or soup.select_one(
                "#captcha-form, #gs_captcha_ccl, #recaptcha, .rc-doscaptcha-body"
            ):
                raise CitationFetchError(
                    "Google Scholar blocked this request or requires a CAPTCHA. "
                    "No data was published; the next scheduled run can try again."
                )
            response.raise_for_status()
            return soup
        except (requests.Timeout, requests.ConnectionError) as error:
            last_error = error
        except requests.HTTPError as error:
            if error.response.status_code < 500:
                raise CitationFetchError(
                    f"Google Scholar returned HTTP {error.response.status_code}"
                ) from error
            last_error = error
        if attempt < MAX_ATTEMPTS:
            LOGGER.warning("Temporary request failure: %s", last_error)
            time.sleep(2 ** attempt)
    raise CitationFetchError(
        f"Profile request failed after {MAX_ATTEMPTS} attempts: {last_error}"
    )


def parse_profile(soup, scholar_id):
    name = soup.select_one("#gsc_prf_in")
    statistics = soup.select("#gsc_rsb_st td.gsc_rsb_std")
    if name is None or len(statistics) != 6:
        raise CitationFetchError("The response does not contain a complete public citation profile.")
    keys = ("citedby", "citedby5y", "hindex", "hindex5y", "i10index", "i10index5y")
    author = {
        "scholar_id": scholar_id,
        "name": name.get_text(" ", strip=True),
        "source": "AUTHOR_PROFILE_PAGE",
        **dict(zip(keys, (parse_number(cell.get_text()) for cell in statistics))),
        "publications": {},
    }
    years = soup.select(".gsc_g_t")
    counts = soup.select(".gsc_g_al")
    if len(years) != len(counts):
        raise CitationFetchError("Incomplete citation history in the profile response.")
    author["cites_per_year"] = {
        str(parse_number(year.get_text())): parse_number(count.get_text())
        for year, count in zip(years, counts)
    }
    return author


def parse_publications(soup, scholar_id):
    publications = {}
    for row in soup.select("tr.gsc_a_tr"):
        title = row.select_one("a.gsc_a_at")
        citations = row.select_one(".gsc_a_c")
        if title is None or citations is None:
            raise CitationFetchError("Incomplete publication row in the profile response.")
        publication_id = parse_qs(urlparse(title.get("href", "")).query).get(
            "citation_for_view", [""]
        )[0]
        if not publication_id.startswith(f"{scholar_id}:"):
            raise CitationFetchError("Publication belongs to a different or missing author profile.")
        details = row.select(".gsc_a_t .gs_gray")
        year = row.select_one(".gsc_a_y")
        citation_text = citations.get_text(strip=True)
        publications[publication_id] = {
            "author_pub_id": publication_id,
            "num_citations": parse_number(citation_text) if citation_text else 0,
            "bib": {
                "title": title.get_text(" ", strip=True),
                "author": details[0].get_text(" ", strip=True) if details else "",
                "citation": details[1].get_text(" ", strip=True) if len(details) > 1 else "",
                "pub_year": year.get_text(strip=True) if year else "",
            },
        }
    return publications


def collect_author(session, scholar_id):
    author = None
    for page in range(MAX_PAGES):
        soup = fetch_page(session, scholar_id, page * PAGE_SIZE)
        if author is None:
            author = parse_profile(soup, scholar_id)
        publications = parse_publications(soup, scholar_id)
        more = soup.select_one("#gsc_bpf_more")
        has_more = more is not None and not more.has_attr("disabled")
        if (not publications and (author["citedby"] or has_more)) or (
            publications and not publications.keys() - author["publications"].keys()
        ):
            raise CitationFetchError("Publication pagination is empty or repeating; refusing incomplete data.")
        author["publications"].update(publications)
        if not has_more:
            author["updated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            return author
    raise CitationFetchError(f"Profile exceeds the {MAX_PAGES * PAGE_SIZE}-publication safety limit.")


def write_results(author, output_directory):
    payloads = {
        "gs_data.json": author,
        "gs_data_shieldsio.json": {
            "schemaVersion": 1,
            "label": "citations",
            "message": str(author["citedby"]),
        },
    }
    output_directory.mkdir(parents=True, exist_ok=True)
    for filename, payload in payloads.items():
        temporary = output_directory / f"{filename}.tmp"
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        temporary.replace(output_directory / filename)


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    scholar_id = os.environ.get("GOOGLE_SCHOLAR_ID", "").strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]+", scholar_id):
        LOGGER.error("Set GOOGLE_SCHOLAR_ID to the author ID from the Google Scholar profile URL.")
        return 1
    try:
        with requests.Session() as session:
            session.headers.update({"User-Agent": "CitationStats/1.0", "Accept-Language": "en-US,en;q=0.9"})
            author = collect_author(session, scholar_id)
        write_results(author, Path(__file__).resolve().parent / "results")
    except (CitationFetchError, requests.RequestException) as error:
        LOGGER.error("Citation update failed: %s", error)
        return 1
    LOGGER.info(
        "Updated %s: %s citations, %s publications",
        author["name"], author["citedby"], len(author["publications"]),
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
