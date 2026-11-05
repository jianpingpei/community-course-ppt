// Shared course IO; geometry and visual language belong to each course author.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const PptxGenJS = require(
  process.env.COURSE_PPT_NODE_MODULES
    ? path.join(process.env.COURSE_PPT_NODE_MODULES, "pptxgenjs")
    : "pptxgenjs",
);
const args = process.argv.slice(2),
  value = (k) => args[args.indexOf(k) + 1];
if (!args.includes("--course"))
  throw new Error("Required: --course <course.json>");
const input = path.resolve(value("--course")),
  root = path.dirname(input);
const course = JSON.parse(await fs.readFile(input, "utf8"));
for (const key of [
  "templateId",
  "templateProfile",
  "themeId",
  "sourceTemplate",
]) {
  if (course[key])
    throw new Error(
      `请迁移旧配置字段 ${key}：阅读 references/input-format.md，提供 DESIGN.md 和课程 authoring 源码；不再解析内置模板。`,
    );
}
if (!course.authoring)
  throw new Error("课程需要 authoring 指向自己的 .mjs 页面制作源码");
await fs.access(path.join(root, "DESIGN.md"));
const author = await import(
  pathToFileURL(path.resolve(root, course.authoring)).href
);
if (typeof author.renderLesson !== "function")
  throw new Error("authoring must export renderLesson({ppt,course,lesson})");
const out = path.resolve(
  args.includes("--out") ? value("--out") : path.join(root, "output"),
);
await fs.mkdir(out, { recursive: true });
const cache = await fs.mkdtemp(path.join(os.tmpdir(), "course-figures-"));
try {
  for (const lesson of course.lessons) {
    for (const [index, slide] of lesson.slides.entries()) {
      if (
        course.includeExercises !== true &&
        (slide.type === "exercise" || /练习|判断题/.test(slide.title))
      )
        throw new Error("纯讲授课程不能包含练习：" + slide.title);
      for (const id of slide.sourceIds || [])
        if (!course.sources.some((s) => s.id === id))
          throw new Error("未知来源 " + id);
      if (slide.figure) {
        const f = slide.figure;
        if (!f.credit || !f.sourceUrl || !f.alt)
          throw new Error("图片需要 credit/sourceUrl/alt");
        f.prepared = path.join(cache, `${lesson.id}-${index}.png`);
        [f.width, f.height] = execFileSync(
          process.env.COURSE_PPT_PYTHON || "python",
          [
            path.join(here, "crop_figure.py"),
            path.resolve(root, f.path),
            f.prepared,
            "--crop",
            ...(f.crop || [0, 0, 1, 1]).map(String),
          ],
          { encoding: "utf8" },
        )
          .trim()
          .split(/\s+/)
          .map(Number);
      }
    }
    const ppt = new PptxGenJS();
    ppt.layout = "LAYOUT_WIDE";
    ppt.lang = "zh-CN";
    ppt.title = lesson.title;
    ppt.subject = course.title;
    ppt.author =
      course.materialType === "own-research"
        ? course.institution || "课程编制"
        : "课程编制";
    ppt.company =
      course.materialType === "own-research" ? course.institution || "" : "";
    await author.renderLesson({ ppt, course, lesson });
    if (ppt._slides.length !== lesson.slides.length)
      throw new Error("authoring 生成页数与教案不符");
    for (const [index, s] of ppt._slides.entries()) {
      const d = lesson.slides[index];
      const sources = (d.sourceIds || []).map((id) =>
        course.sources.find((r) => r.id === id),
      );
      const credit = d.figure
        ? `\n图片：${d.figure.credit}\n${d.figure.sourceUrl}`
        : "";
      s.addNotes(
        `本页安排 ${d.seconds || 0} 秒\n\n${d.notes || ""}\n\n参考来源\n${sources.map((r) => `${r.title}\n${r.url}`).join("\n")}${credit}`,
      );
    }
    const name = `${lesson.id}-${lesson.title.replace(/[\\/:*?"<>|]/g, "")}`;
    await ppt.writeFile({ fileName: path.join(out, name + ".pptx") });
  }
} finally {
  await fs.rm(cache, { recursive: true, force: true });
}
