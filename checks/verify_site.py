"""Check static resources and links, including GitHub Pages project paths."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
if len(sys.argv) > 1:
    ROOT = (ROOT / sys.argv[1]).resolve()


def check_resource(value, parent):
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return
    path = unquote(parsed.path)
    assert not path.startswith("/"), f"Use a relative Pages path: {value}"
    target = (parent / path).resolve()
    assert target.is_relative_to(ROOT), f"Resource outside project: {value}"
    assert target.is_file() and target.stat().st_size, f"Missing resource: {value}"


class Site(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.anchors = []
        self.resources = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        for key in ("href", "src", "poster"):
            value = attrs.get(key)
            if not value:
                continue
            if value.startswith("#"):
                self.anchors.append(value[1:])
            else:
                self.resources.append(value)


page = Site()
page.feed((ROOT / "index.html").read_text(encoding="utf-8"))
duplicates = [name for name, count in Counter(page.ids).items() if count > 1]
assert not duplicates, f"Duplicate IDs: {duplicates}"
assert all(name in page.ids for name in page.anchors), "Broken section link"
for resource in page.resources:
    check_resource(resource, ROOT)

css_files = [ROOT / "styles.css", *sorted((ROOT / "assets").rglob("*.css"))]
for css in css_files:
    for match in re.finditer(r"url\(\s*(?:'([^']*)'|\"([^\"]*)\"|([^\)\s]+))\s*\)", css.read_text(encoding="utf-8")):
        check_resource(next(value for value in match.groups() if value is not None), css.parent)

print(f"PASS: {len(page.ids)} unique IDs, {len(page.anchors)} section links, HTML resources and {len(css_files)} CSS files; relative paths work on GitHub Pages.")
