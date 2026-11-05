import json
from pathlib import Path
import subprocess
import tempfile
import unittest


class DiagramLayoutTest(unittest.TestCase):
    def test_narrow_flow_requires_a_layout_choice(self):
        skill = Path(__file__).resolve().parents[1]
        course = {
            "title": "Layout check",
            "themeId": "research-notes",
            "lessons": [
                {
                    "id": "01",
                    "title": "Flow",
                    "slides": [
                        {
                            "type": "process",
                            "title": "Input to output",
                            "body": [],
                            "diagram": {"kind": "flow", "labels": ["Input", "Output"]},
                            "notes": "",
                            "seconds": 10,
                        }
                    ],
                }
            ],
        }
        with tempfile.TemporaryDirectory(prefix="course-layout-test-") as directory:
            root = Path(directory)
            source, output = root / "course.json", root / "output"
            source.write_text(json.dumps(course), "utf-8")
            result = subprocess.run(
                [
                    "node",
                    str(skill / "scripts/build.mjs"),
                    "--course",
                    str(source),
                    "--out",
                    str(output),
                ],
                capture_output=True,
                text=True,
                encoding="utf-8",
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("流程图需要宽区域", result.stderr)
            self.assertEqual(list(output.glob("*.pptx")), [])


if __name__ == "__main__":
    unittest.main()
