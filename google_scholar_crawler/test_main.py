import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from bs4 import BeautifulSoup
import requests

import main as crawler


SCHOLAR_ID = "test_author"
PROFILE = """
<div id="gsc_prf_in">Test Author</div>
<table id="gsc_rsb_st"><tbody>
  <tr><td>Citations</td><td class="gsc_rsb_std">1,234</td><td class="gsc_rsb_std">1,000</td></tr>
  <tr><td>h-index</td><td class="gsc_rsb_std">12</td><td class="gsc_rsb_std">10</td></tr>
  <tr><td>i10-index</td><td class="gsc_rsb_std">20</td><td class="gsc_rsb_std">18</td></tr>
</tbody></table>
<span class="gsc_g_t">2026</span><span class="gsc_g_al">234</span>
<table><tr class="gsc_a_tr">
  <td class="gsc_a_t"><a class="gsc_a_at" href="/citations?citation_for_view=test_author:paper1">A &amp; B</a>
    <div class="gs_gray">Test Author, Coauthor</div><div class="gs_gray">Test Conference, 2026</div></td>
  <td class="gsc_a_c"><a>42*</a></td><td class="gsc_a_y"><span>2026</span></td>
</tr></table>
<button id="gsc_bpf_more" disabled>Show more</button>
"""


def response(html=PROFILE, status=200):
    result = requests.Response()
    result.status_code = status
    result._content = html.encode("utf-8")
    result.encoding = "utf-8"
    return result


class CitationCrawlerTests(unittest.TestCase):
    def test_public_profile_produces_total_and_per_paper_statistics(self):
        session = Mock()
        session.get.return_value = response()
        author = crawler.collect_author(session, SCHOLAR_ID)
        self.assertEqual(author["citedby"], 1234)
        self.assertEqual(author["hindex"], 12)
        self.assertEqual(author["cites_per_year"], {"2026": 234})
        self.assertEqual(author["publications"]["test_author:paper1"]["num_citations"], 42)
        self.assertEqual(author["publications"]["test_author:paper1"]["bib"]["title"], "A & B")
        session.get.assert_called_once()
        self.assertEqual(session.get.call_args.kwargs["timeout"], (10, 20))

    def test_uncited_publication_counts_as_zero(self):
        soup = BeautifulSoup(PROFILE.replace("<a>42*</a>", ""), "html.parser")
        self.assertEqual(crawler.parse_publications(soup, SCHOLAR_ID)["test_author:paper1"]["num_citations"], 0)

    def test_missing_statistics_are_rejected_instead_of_publishing_zero(self):
        session = Mock()
        session.get.return_value = response("<html><body>Temporarily unavailable</body></html>")
        with self.assertRaisesRegex(crawler.CitationFetchError, "complete public citation profile"):
            crawler.collect_author(session, SCHOLAR_ID)

    def test_captcha_and_rate_limit_stop_without_retrying(self):
        for html, status in (("<form id='captcha-form'></form>", 200), ("blocked", 403), ("slow down", 429)):
            with self.subTest(status=status):
                session = Mock()
                session.get.return_value = response(html, status)
                with self.assertRaisesRegex(crawler.CitationFetchError, "CAPTCHA"):
                    crawler.collect_author(session, SCHOLAR_ID)
                session.get.assert_called_once()

    @patch("main.time.sleep")
    def test_transient_timeout_can_recover(self, sleep):
        session = Mock()
        session.get.side_effect = [requests.Timeout("temporary"), response()]
        self.assertEqual(crawler.collect_author(session, SCHOLAR_ID)["citedby"], 1234)
        self.assertEqual(session.get.call_count, 2)

    @patch("main.time.sleep")
    def test_repeated_timeout_has_a_finite_retry_limit(self, sleep):
        session = Mock()
        session.get.side_effect = requests.Timeout("offline")
        with self.assertRaisesRegex(crawler.CitationFetchError, "3 attempts"):
            crawler.collect_author(session, SCHOLAR_ID)
        self.assertEqual(session.get.call_count, 3)

    def test_pagination_collects_each_page_and_rejects_repeating_pages(self):
        first = PROFILE.replace(" disabled", "")
        second = PROFILE.replace("test_author:paper1", "test_author:paper2")
        session = Mock()
        session.get.side_effect = [response(first), response(second)]
        author = crawler.collect_author(session, SCHOLAR_ID)
        self.assertEqual(len(author["publications"]), 2)
        self.assertEqual(session.get.call_args.kwargs["params"]["cstart"], 100)
        session.get.side_effect = [response(first), response(first)]
        with self.assertRaisesRegex(crawler.CitationFetchError, "repeating"):
            crawler.collect_author(session, SCHOLAR_ID)

    def test_publications_from_another_author_are_rejected(self):
        soup = BeautifulSoup(PROFILE.replace("test_author:paper1", "other_author:paper1"), "html.parser")
        with self.assertRaisesRegex(crawler.CitationFetchError, "different"):
            crawler.parse_publications(soup, SCHOLAR_ID)

    @patch.dict("os.environ", {"GOOGLE_SCHOLAR_ID": SCHOLAR_ID})
    @patch("main.write_results")
    @patch("main.collect_author", side_effect=crawler.CitationFetchError("CAPTCHA"))
    def test_failed_fetch_does_not_overwrite_last_valid_data(self, collect, write):
        self.assertEqual(crawler.main(), 1)
        write.assert_not_called()

    def test_badge_and_statistics_files_agree(self):
        session = Mock()
        session.get.return_value = response()
        author = crawler.collect_author(session, SCHOLAR_ID)
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as directory:
            crawler.write_results(author, Path(directory))
            data = json.loads((Path(directory) / "gs_data.json").read_text(encoding="utf-8"))
            badge = json.loads((Path(directory) / "gs_data_shieldsio.json").read_text(encoding="utf-8"))
            self.assertEqual(badge["message"], str(data["citedby"]))
            self.assertTrue(data["updated"].endswith("+00:00"))


if __name__ == "__main__":
    unittest.main()
