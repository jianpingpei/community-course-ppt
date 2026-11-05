import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET
from zipfile import ZipFile


class CourseCoverTest(unittest.TestCase):
    def test_lessons_share_course_name_in_cover_header(self):
        script = Path(__file__).resolve().parents[1] / "scripts/build.mjs"
        course = {
            "title": "One course",
            "community": "Biology",
            "themeId": "research-notes",
            "sources": [],
            "lessons": [
                {
                    "id": "01",
                    "title": "Topic A",
                    "slides": [
                        {
                            "type": "cover",
                            "title": "Topic A",
                            "body": ["Overview A"],
                            "seconds": 20,
                            "notes": "",
                        }
                    ],
                },
                {
                    "id": "02",
                    "title": "Topic B",
                    "slides": [
                        {
                            "type": "cover",
                            "title": "Topic B",
                            "body": ["Overview B"],
                            "seconds": 20,
                            "notes": "",
                        }
                    ],
                },
            ],
        }
        ns = {
            "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
            "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
        }
        with tempfile.TemporaryDirectory(prefix="course-cover-test-") as directory:
            root = Path(directory)
            source, output = root / "course.json", root / "output"
            source.write_text(json.dumps(course), "utf-8")
            subprocess.run(
                ["node", str(script), "--course", str(source), "--out", str(output)],
                check=True,
                capture_output=True,
            )
            decks = sorted(output.glob("*.pptx"))
            self.assertEqual(len(decks), 2)
            for deck in decks:
                with ZipFile(deck) as package:
                    slide = ET.fromstring(package.read("ppt/slides/slide1.xml"))
                headers = []
                for shape in slide.findall(".//p:sp", ns):
                    offset = shape.find("p:spPr/a:xfrm/a:off", ns)
                    if offset is not None and int(offset.get("y")) < 914400 * 1.3:
                        headers.append(
                            "".join(t.text or "" for t in shape.findall(".//a:t", ns))
                        )
                self.assertEqual(headers, ["One course"])
