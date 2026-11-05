import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile


class WebPackageTest(unittest.TestCase):
    def test_upload_is_small_and_contains_no_templates_or_course(self):
        repo = Path(__file__).resolve().parents[3]
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "skill.zip"
            subprocess.run(
                [
                    sys.executable,
                    str(repo / "scripts/package-skill.py"),
                    "--out",
                    str(target),
                ],
                check=True,
                capture_output=True,
            )
            self.assertLess(target.stat().st_size, 5_242_880)
            with ZipFile(target) as archive:
                entry = archive.read("community-course-ppt/SKILL.md").decode("utf-8")
                self.assertIn("display_name:", entry.split("---")[1])
                for name in archive.namelist():
                    self.assertFalse(
                        any(
                            part in name.split("/")
                            for part in [
                                "templates",
                                "assets",
                                "node_modules",
                                "example",
                            ]
                        )
                    )
                    self.assertNotIn(
                        Path(name).suffix, [".pptx", ".pdf", ".png", ".jpeg"]
                    )
                for reference in [
                    "design.md",
                    "slidep.md",
                    "pptxgenjs.md",
                    "quality.md",
                ]:
                    self.assertIn(
                        "community-course-ppt/references/" + reference,
                        archive.namelist(),
                    )


class InstallationTest(unittest.TestCase):
    def test_upgrade_removes_only_old_managed_resources(self):
        repo = Path(__file__).resolve().parents[3]
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "skill"
            templates = target / "assets/templates"
            templates.mkdir(parents=True)
            (target / "SKILL.md").write_text("name: community-course-ppt", "utf-8")
            (templates / "catalog.json").write_text(
                json.dumps({"templates": [{"id": "wps-16", "file": "old.pptx"}]}),
                "utf-8",
            )
            (templates / "old.pptx").write_bytes(b"old")
            (templates / "custom.pptx").write_bytes(b"user content")
            subprocess.run(
                [
                    sys.executable,
                    str(repo / "scripts/install-skill.py"),
                    "--dest",
                    str(target),
                    "--update",
                ],
                check=True,
                capture_output=True,
            )
            self.assertFalse((templates / "old.pptx").exists())
            self.assertEqual((templates / "custom.pptx").read_bytes(), b"user content")
            self.assertTrue((target / "scripts/build_course.py").is_file())
