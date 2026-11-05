import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

script = Path(__file__).resolve().parents[1] / "scripts/build_course.py"
spec = importlib.util.spec_from_file_location("course_build", script)
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class EngineTest(unittest.TestCase):
    def test_auto_prefers_ready_slidep_and_falls_back_before_build(self):
        with patch.object(build, "slidep_ready", return_value=(True, "ready")):
            self.assertEqual(build.choose_engine("auto", "slidep"), "slidep")
        with patch.object(build, "slidep_ready", return_value=(False, "no service")):
            self.assertEqual(build.choose_engine("auto", "slidep"), "pptxgenjs")
            with self.assertRaisesRegex(RuntimeError, "no service"):
                build.choose_engine("slidep", "slidep")

    def test_append_then_lint_and_explicit_replacement(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(
                build,
                "slidep_json",
                side_effect=[
                    {"slide_count": 1},
                    {
                        "diagnostics": [
                            {"severity": "warning", "ruleId": "template-text-residue"}
                        ]
                    },
                ],
            ) as invoke:
                warnings = build.write_page(
                    "slidep", root / "one.pptx", root / "01.slide", root, 0
                )
                self.assertEqual(warnings[0]["ruleId"], "template-text-residue")
                commands = [c.args[0] for c in invoke.call_args_list]
                self.assertEqual(commands[0][1], "upsert-dsl")
                self.assertIn("--strict-resources", commands[0])
                self.assertNotIn("--page-index", commands[0])
                self.assertEqual(commands[1][1], "lint")
            with patch.object(
                build,
                "slidep_json",
                side_effect=[{"slide_count": 2}, {"diagnostics": []}],
            ) as invoke:
                build.write_page(
                    "slidep",
                    root / "one.pptx",
                    root / "01.slide",
                    root,
                    0,
                    append=False,
                )
                self.assertIn("--page-index", invoke.call_args_list[0].args[0])

    def test_resource_failure_is_not_retried_as_an_append(self):
        payload = {
            "ok": False,
            "failures": [{"path": "assets/missing.png"}],
            "slide_count": 1,
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            result = subprocess.CompletedProcess([], 1, json.dumps(payload), "")
            with patch.object(build.subprocess, "run", return_value=result) as invoke:
                with self.assertRaisesRegex(RuntimeError, "missing.png"):
                    build.write_page(
                        "slidep", root / "one.pptx", root / "01.slide", root, 0
                    )
                self.assertEqual(invoke.call_count, 1)

    def test_layout_error_and_truncated_diagnostics_are_not_ignored(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(
                build,
                "slidep_json",
                side_effect=[
                    {"slide_count": 1},
                    {"diagnostics": [{"severity": "error", "ruleId": "no-overflow"}]},
                ],
            ):
                with self.assertRaisesRegex(RuntimeError, "no-overflow"):
                    build.write_page(
                        "slidep", root / "one.pptx", root / "01.slide", root, 0
                    )
            full = root / "one-diagnostics-0.json"
            full.write_text(
                json.dumps(
                    {
                        "diagnostics": [
                            {"severity": "error", "ruleId": "text-slot-overflow"}
                        ]
                    }
                ),
                "utf-8",
            )
            with patch.object(
                build,
                "slidep_json",
                side_effect=[{"slide_count": 1}, {"output_summary": {"total": 2001}}],
            ):
                with self.assertRaisesRegex(RuntimeError, "text-slot-overflow"):
                    build.write_page(
                        "slidep", root / "one.pptx", root / "01.slide", root, 0
                    )
