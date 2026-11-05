import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class PortableTemplateTest(unittest.TestCase):
    def test_assignment_survives_a_different_materials_repository(self):
        script = Path(__file__).resolve().parents[1] / "scripts/select_template.py"
        with tempfile.TemporaryDirectory(prefix="course-template-test-") as directory:
            root = Path(directory)
            usage = root / "usage.json"
            first = root / "repo-a/courses/a/course.json"
            second = root / "repo-b/courses/b/course.json"
            for course, course_id in [(first, "a"), (second, "b")]:
                course.parent.mkdir(parents=True)
                course.write_text(json.dumps({"courseId": course_id}), "utf-8")
            subprocess.run(
                [
                    sys.executable,
                    str(script),
                    "--course",
                    str(first),
                    "--usage-file",
                    str(usage),
                    "--set",
                    "wps-16",
                ],
                check=True,
                capture_output=True,
                cwd=first.parent,
            )
            assigned = json.loads(first.read_text("utf-8"))
            self.assertEqual(assigned["templateId"], "wps-16")
            self.assertNotIn("sourceTemplate", assigned)
            result = subprocess.run(
                [
                    sys.executable,
                    str(script),
                    "--course",
                    str(second),
                    "--usage-file",
                    str(usage),
                ],
                check=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                cwd=second.parent,
            )
            self.assertEqual(
                json.loads(result.stdout)["recommended"][0]["id"], "wps-25"
            )


if __name__ == "__main__":
    unittest.main()
