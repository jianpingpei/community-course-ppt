import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile


class WebPackageTest(unittest.TestCase):
    def test_upload_contains_resolvable_ready_templates(self):
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
                prefix = "community-course-ppt/"
                entry = archive.read(prefix + "SKILL.md").decode("utf-8")
                self.assertIn("display_name:", entry.split("---")[1])
                catalog = json.loads(
                    archive.read(prefix + "assets/templates/catalog.json")
                )
                self.assertEqual([t["id"] for t in catalog["templates"]], ["wps-16"])
                for template in catalog["templates"]:
                    name = prefix + "assets/templates/" + template["file"]
                    self.assertIn(name, archive.namelist())
                    with ZipFile(io.BytesIO(archive.read(name))) as packed, ZipFile(
                        repo / "templates" / template["file"]
                    ) as original:
                        self.assertFalse(
                            any(n.startswith("ppt/fonts/") for n in packed.namelist())
                        )
                        self.assertNotIn(
                            b"embeddedFontLst", packed.read("ppt/presentation.xml")
                        )
                        for part in original.namelist():
                            if part.startswith(("ppt/slides/", "ppt/media/")):
                                self.assertEqual(packed.read(part), original.read(part))
                self.assertFalse(
                    any(
                        "/node_modules/" in n or "/example/" in n
                        for n in archive.namelist()
                    )
                )

    def test_no_renderer_does_not_silently_complete(self):
        script = Path(__file__).resolve().parents[1] / "scripts/build_course.py"
        spec = importlib.util.spec_from_file_location("portable_build", script)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "course.json"
            source.write_text("{}", "utf-8")
            with patch.object(
                sys, "argv", [str(script), "--course", str(source)]
            ), patch.object(
                module.shutil,
                "which",
                side_effect=lambda name: "node" if name == "node" else None,
            ):
                with self.assertRaises(SystemExit) as error:
                    module.main()
                self.assertEqual(error.exception.code, 2)
            self.assertFalse((source.parent / "output").exists())
