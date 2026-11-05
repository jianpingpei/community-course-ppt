import importlib.util
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location(
    "select_template",
    Path(__file__).resolve().parents[1] / "scripts/select_template.py",
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TemplateSelectionTest(unittest.TestCase):
    def setUp(self):
        self.catalog = {
            "templates": [
                {"id": "grey", "status": "ready"},
                {"id": "blue", "status": "ready"},
                {"id": "unreviewed", "status": "needs-layout-review"},
            ]
        }

    def test_new_course_prefers_unused_reviewed_template(self):
        courses = [{"courseId": "biology", "templateId": "grey"}]
        result = module.recommendations(self.catalog, courses, "astronomy")
        self.assertEqual([item["id"] for item in result], ["blue", "grey"])

    def test_current_course_does_not_count_as_another_assignment(self):
        courses = [
            {"courseId": "biology", "templateId": "grey"},
            {"courseId": "astronomy", "templateId": "blue"},
        ]
        result = module.recommendations(self.catalog, courses, "biology")
        self.assertEqual(result[0]["id"], "grey")


if __name__ == "__main__":
    unittest.main()
