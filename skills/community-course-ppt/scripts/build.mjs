import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { drawTeachingDiagram } from "./teaching-diagrams.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const skill = path.dirname(here);
let require = createRequire(import.meta.url),
  PptxGenJS;
try {
  PptxGenJS = require("pptxgenjs");
} catch (e) {
  if (!process.env.COURSE_PPT_NODE_MODULES)
    throw new Error(
      "请先在skill目录执行npm install，或设置COURSE_PPT_NODE_MODULES指向已有node_modules。",
    );
  PptxGenJS = require(
    path.join(process.env.COURSE_PPT_NODE_MODULES, "pptxgenjs"),
  );
}
const themes = JSON.parse(
  await fs.readFile(path.join(skill, "assets/themes.json"), "utf8"),
);
const args = process.argv.slice(2),
  arg = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const out = path.resolve(arg("--out") || "output");
await fs.mkdir(out, { recursive: true });
const W = 13.333333,
  H = 7.5;
let ppt;
let figureCache;
function text(s, t, x, y, w, h, size, theme, opts = {}) {
  s.addText(String(t ?? ""), {
    x,
    y,
    w,
    h,
    fontFace: theme.font,
    fontSize: size,
    color: theme.ink,
    margin: 0,
    breakLine: false,
    vertAnchor: "mid",
    charSpacing: 0,
    paraSpaceAfterPt: 0,
    ...opts,
  });
}
function rect(s, x, y, w, h, c, opts = {}) {
  s.addShape(ppt.ShapeType.rect, {
    x,
    y,
    w,
    h,
    line: { color: c, transparency: 100 },
    fill: { color: c },
    ...opts,
  });
}
function line(s, x1, y1, x2, y2, color, width = 1, opts = {}) {
  s.addShape(ppt.ShapeType.line, {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
    flipH: x2 < x1,
    flipV: y2 < y1,
    line: { color, width, ...opts },
  });
}
function baseSlide(theme, course, lesson, n, total, slideData) {
  const s = ppt.addSlide();
  s.background = { color: theme.bg };
  line(s, 0.65, 1.3, 12.68, 1.3, theme.accent, 1.7);
  text(s, slideData.title, 0.72, 0.62, 11.8, 0.64, 32, theme, {
    bold: true,
    align: "left",
  });
  text(s, lesson.title, 0.72, 6.99, 10.9, 0.28, 14, theme, {
    color: theme.ink,
    transparency: 20,
  });
  text(
    s,
    `${String(n).padStart(2, "0")} / ${total}`,
    11.73,
    6.99,
    0.85,
    0.28,
    14,
    theme,
    { align: "right" },
  );
  return s;
}
function diagram(s, d, region, t) {
  const { x, y, w, h } = region;
  const labels = d.labels || [];
  if (
    drawTeachingDiagram(s, d, region, t, {
      text,
      rect,
      line,
      shapeType: ppt.ShapeType,
    })
  )
    return;
  if (d.kind === "translation") {
    const rows = [
      ["编码DNA", "ATG", "AAA", "ACC"],
      ["mRNA", "AUG", "AAA", "ACC"],
      ["蛋白质", "M", "K", "T"],
    ];
    rows.forEach((row, i) => {
      text(s, row[0], x, y + i * 1.04, 2.1, 0.6, 24, t, { bold: true });
      row.slice(1).forEach((v, j) =>
        text(s, v, x + 2.4 + j * 2.6, y + i * 1.04, 2, 0.6, 30, t, {
          align: "center",
          bold: i === 2,
        }),
      );
      if (i < 2)
        line(
          s,
          x + 3.4,
          y + i * 1.04 + 0.65,
          x + 3.4,
          y + (i + 1) * 1.04 - 0.08,
          t.accent,
          1.5,
          { endArrowType: "triangle" },
        );
    });
    return;
  }
  if (d.kind === "fusion") {
    const ins = labels.slice(0, -1),
      nodeW = w * 0.38,
      nodeH = 0.86,
      outputX = x + w * 0.58;
    ins.forEach((v, i) => {
      const yy = y + 0.12 + (i * (h - 0.95)) / Math.max(ins.length - 1, 1);
      rect(s, x, yy, nodeW, nodeH, t.secondary);
      text(s, v, x + 0.12, yy + 0.05, nodeW - 0.24, nodeH - 0.1, 22, t, {
        align: "center",
      });
      line(
        s,
        x + nodeW + 0.1,
        yy + nodeH / 2,
        outputX - 0.15,
        y + h / 2,
        t.accent,
        1.5,
        { endArrowType: "triangle" },
      );
    });
    rect(s, outputX, y + h / 2 - 0.7, w * 0.42, 1.4, t.secondary);
    text(
      s,
      labels.at(-1),
      outputX + 0.12,
      y + h / 2 - 0.57,
      w * 0.42 - 0.24,
      1.14,
      24,
      t,
      { align: "center", bold: true },
    );
    return;
  }
  if (
    d.kind === "sequence" &&
    /^[ACGT]+$/.test(labels[0] || "") &&
    /^[ACGT]+$/.test(labels.at(-1) || "")
  ) {
    const ref = labels[0],
      alt = labels.at(-1),
      step = Math.min(0.72, w / ref.length),
      xx = x + (w - ref.length * step) / 2;
    text(s, "参考", x, y, w, 0.4, 20, t);
    text(s, "变异", x, y + 1.9, w, 0.4, 20, t);
    [...ref].forEach((v, i) => {
      text(s, String(i + 1), xx + i * step, y + 0.5, step, 0.35, 20, t, {
        align: "center",
      });
      text(s, v, xx + i * step, y + 0.94, step, 0.7, 36, t, {
        align: "center",
        bold: ref[i] !== alt[i],
        color: ref[i] !== alt[i] ? t.accent : t.ink,
      });
      text(s, alt[i], xx + i * step, y + 2.45, step, 0.7, 36, t, {
        align: "center",
        bold: ref[i] !== alt[i],
        color: ref[i] !== alt[i] ? t.accent : t.ink,
      });
      if (ref[i] !== alt[i])
        line(
          s,
          xx + i * step + step / 2,
          y + 1.64,
          xx + i * step + step / 2,
          y + 2.28,
          t.accent,
          1.6,
          { endArrowType: "triangle" },
        );
    });
    return;
  }
  if (d.kind === "rna-pairing") {
    const seq = d.sequence;
    if (!seq || seq.length !== 9)
      throw new Error("茎环版式需要9个碱基的sequence及pairs");
    const subs = ["₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
    const coords = [
      [0.45, 0.35],
      [1.5, 0.35],
      [2.55, 0.35],
      [3.65, 0.8],
      [4.05, 1.65],
      [3.65, 2.5],
      [2.55, 2.95],
      [1.5, 2.95],
      [0.45, 2.95],
    ];
    const nodes = coords.map(([nx, ny], i) => [seq[i] + subs[i], nx, ny]);
    const scale = Math.min(w / 4.7, h / 3.6),
      px = (v) => x + v * scale,
      py = (v) => y + v * scale;
    nodes
      .slice(1)
      .forEach((n, i) =>
        line(
          s,
          px(nodes[i][1]),
          py(nodes[i][2]),
          px(n[1]),
          py(n[2]),
          t.ink,
          1.7,
        ),
      );
    d.pairs.forEach(([aa, bb]) => {
      const a = aa - 1,
        b = bb - 1;
      line(
        s,
        px(nodes[a][1]),
        py(nodes[a][2] + 0.4),
        px(nodes[b][1]),
        py(nodes[b][2] - 0.4),
        t.accent,
        2,
      );
    });
    nodes.forEach(([v, nx, ny]) => {
      rect(s, px(nx) - 0.32, py(ny) - 0.25, 0.64, 0.55, t.bg);
      text(s, v, px(nx) - 0.4, py(ny) - 0.3, 0.8, 0.6, 28, t, {
        align: "center",
        bold: true,
      });
    });
    return;
  }
  if (d.kind === "spatial") {
    const cx = x + w * 0.5,
      cy = y + 1.7,
      colors = ["167B71", "4A6584", "9B774B"];
    s.addShape(ppt.ShapeType.ellipse, {
      x: cx - 1.65,
      y: cy - 1.65,
      w: 3.3,
      h: 3.3,
      line: { color: t.accent, width: 1.4, dashType: "dash" },
      fill: { color: t.bg, transparency: 100 },
    });
    const points = [
      [-1.2, -0.8, 0],
      [-0.4, -1.15, 0],
      [0.8, -0.95, 0],
      [1.3, -0.25, 0],
      [1, 0.65, 0],
      [0.15, 1.1, 0],
      [-0.9, 0.8, 1],
      [-1.4, 0.1, 1],
      [0.65, 0.15, 1],
      [0, -0.55, 2],
    ];
    points.forEach(([dx, dy, k]) =>
      s.addShape(ppt.ShapeType.ellipse, {
        x: cx + dx - 0.13,
        y: cy + dy - 0.13,
        w: 0.26,
        h: 0.26,
        line: { color: colors[k] },
        fill: { color: colors[k] },
      }),
    );
    s.addShape(ppt.ShapeType.ellipse, {
      x: cx - 0.2,
      y: cy - 0.2,
      w: 0.4,
      h: 0.4,
      line: { color: t.ink, width: 2 },
      fill: { color: t.bg },
    });
    text(s, "中心细胞", cx - 0.85, cy + 0.3, 1.7, 0.4, 20, t, {
      align: "center",
    });
    ["T类", "B类", "其他类"].forEach((v, i) => {
      s.addShape(ppt.ShapeType.ellipse, {
        x: x + 0.25 + i * 1.7,
        y: y + h - 0.42,
        w: 0.18,
        h: 0.18,
        line: { color: colors[i] },
        fill: { color: colors[i] },
      });
      text(s, v, x + 0.5 + i * 1.7, y + h - 0.5, 1.2, 0.4, 20, t);
    });
    return;
  }
  if (d.kind === "masked-sequence") {
    const seq = ["A", "C", "?", "T", "A", "C"],
      step = w / 7;
    seq.forEach((v, i) => {
      const xx = x + (i + 0.5) * step;
      if (v === "?") rect(s, xx, y + 0.45, step * 0.9, 0.9, t.secondary);
      text(s, v, xx, y + 0.55, step * 0.9, 0.7, 36, t, {
        align: "center",
        color: v === "?" ? t.accent : t.ink,
        bold: true,
      });
    });
    text(
      s,
      "利用两侧上下文预测第三位；恢复目标为 G",
      x,
      y + 1.9,
      w,
      0.7,
      26,
      t,
      { align: "center" },
    );
    return;
  }
  if (d.kind === "protein-completion") {
    text(s, "已知条件", x, y, w * 0.3, 0.5, 22, t, { color: t.accent });
    text(s, "保留指定位置／局部结构", x + w * 0.25, y, w * 0.72, 0.5, 24, t);
    text(s, "M  A  ?  ?  K  ?  L", x, y + 1.15, w, 0.8, 36, t, {
      align: "center",
      bold: true,
    });
    line(s, x + w / 2, y + 2.05, x + w / 2, y + 2.45, t.accent, 1.7, {
      endArrowType: "triangle",
    });
    text(s, "补全未知位置 → 得到待筛选候选", x, y + 2.55, w, 0.5, 26, t, {
      align: "center",
    });
    return;
  }
  if (d.kind === "complex") {
    const types = ["蛋白质", "核酸", "小分子"];
    types.forEach((v, i) => {
      text(s, v, x, y + 0.2 + i * 0.95, w * 0.28, 0.55, 24, t);
      line(
        s,
        x + w * 0.25,
        y + 0.5 + i * 0.95,
        x + w * 0.47,
        y + 1.5,
        t.accent,
        1.4,
        { endArrowType: "triangle" },
      );
    });
    const xx = x + w * 0.55,
      yy = y + 0.2;
    const chains = [
      [
        [0, 0.2],
        [0.4, 0.1],
        [0.8, 0.45],
        [0.65, 0.9],
        [1.1, 1.15],
        [1.6, 1.0],
        [2.0, 1.3],
      ],
      [
        [1.1, 2.6],
        [1.3, 2.1],
        [1.8, 1.95],
        [2.2, 2.2],
        [2.6, 1.8],
      ],
    ];
    chains.forEach((chain, j) =>
      chain.forEach(([cx, cy], i) => {
        if (i)
          line(
            s,
            xx + chain[i - 1][0],
            yy + chain[i - 1][1],
            xx + cx,
            yy + cy,
            j ? t.ink : t.accent,
            3,
          );
        s.addShape(ppt.ShapeType.ellipse, {
          x: xx + cx - 0.07,
          y: yy + cy - 0.07,
          w: 0.14,
          h: 0.14,
          line: { color: j ? t.ink : t.accent },
          fill: { color: j ? t.ink : t.accent },
        });
      }),
    );
    text(s, "读取各组分的空间位置与接触区域", x, y + h - 0.3, w, 0.5, 20, t, {
      align: "center",
      color: t.accent,
    });
    return;
  }
  if (d.kind === "matrix") {
    const cells = [
      ["", "基因A", "基因B", "基因C"],
      ["细胞1", "8", "0", "3"],
      ["细胞2", "0", "6", "1"],
      ["细胞3", "4", "2", "0"],
    ];
    s.addTable(cells, {
      x,
      y: y + 0.25,
      w,
      h: h - 0.4,
      border: { type: "solid", color: t.bg, pt: 2 },
      fill: t.secondary,
      color: t.ink,
      fontFace: t.font,
      fontSize: 22,
      rowH: 0.65,
      margin: 0.08,
      bold: false,
      autoPage: false,
    });
    if (labels[0])
      text(s, labels[0], x, y + h - 0.15, w, 0.42, 20, t, {
        align: "center",
        color: t.accent,
      });
    return;
  }
  if (d.kind === "compare") {
    const n = labels.length,
      cols = n > 4 ? 2 : n > 2 ? 2 : n,
      rows = Math.ceil(n / cols),
      cw = w / cols;
    labels.forEach((v, i) => {
      const xx = x + (i % cols) * cw,
        yy = y + Math.floor(i / cols) * (h / rows);
      line(s, xx + 0.1, yy + 0.05, xx + cw - 0.22, yy + 0.05, t.accent, 1.4);
      text(
        s,
        v,
        xx + 0.16,
        yy + 0.22,
        cw - 0.38,
        Math.min(1.0, h / rows - 0.35),
        24,
        t,
        { bold: i < 2, vertAnchor: "top" },
      );
    });
    return;
  }
  const n = Math.max(labels.length, 1);
  if (d.kind !== "flow") throw new Error("未实现的科学图解：" + d.kind);
  if (n > 4 || w < 7)
    throw new Error(
      "流程图需要宽区域且最多4步；请选用整页图或按实际关系拆解。",
    );
  const gap = 0.38,
    cw = (w - (n - 1) * gap) / n;
  labels.forEach((v, i) => {
    const xx = x + i * (cw + gap);
    rect(s, xx, y + 0.65, cw, 1.5, t.secondary);
    text(s, v, xx + 0.12, y + 0.82, cw - 0.24, 1.12, 22, t, {
      align: "center",
      bold: true,
    });
    if (i < n - 1)
      line(
        s,
        xx + cw + 0.05,
        y + 1.4,
        xx + cw + gap - 0.05,
        y + 1.4,
        t.accent,
        1.6,
        { beginArrowType: "none", endArrowType: "triangle" },
      );
  });
}
function cover(s, d, t, course) {
  s.background = { color: t.bg };
  const x = 0.85,
    y = 1.6,
    w = 11.4,
    align = "left";
  text(s, course.title, x, y - 0.65, w, 0.4, 18, t, { color: t.accent, align });
  text(s, d.title, x, y, w, 1.5, 40, t, {
    bold: true,
    align,
    breakLine: false,
  });
  if (d.subtitle || course.title)
    text(s, d.subtitle || course.title, x, y + 1.75, w, 0.8, 22, t, { align });
  const meta = course.institution
    ? `课程编制单位：${course.institution}${course.projectId ? "\n课题号：" + course.projectId : ""}`
    : "";
  if (meta)
    text(s, meta, x, 6.12, w, 0.7, 15, t, { align, lineSpacingMultiple: 1.15 });
  if (course.logo) {
    const a = course.logoAspect || 1,
      ww = a >= 1 ? 0.9 : 0.9 * a,
      hh = a >= 1 ? 0.9 / a : 0.9;
    s.addImage({
      path: course.logo,
      x: 11.5 + (0.9 - ww) / 2,
      y: 0.55 + (0.9 - hh) / 2,
      w: ww,
      h: hh,
    });
  }
}
function page(d, t, course, lesson, n, total) {
  const s =
    d.type === "cover"
      ? ppt.addSlide()
      : baseSlide(t, course, lesson, n, total, d);
  const body = d.body || [];
  if (d.type === "cover")
    cover(s, { ...d, subtitle: d.subtitle || body.join("\n") }, t, course);
  else if (d.type === "references") {
    const refs = (d.sourceIds || [])
      .map((id) => course.sources.find((r) => r.id === id))
      .filter(Boolean);
    if (refs.length > 6) throw new Error("参考文献超过6条，请拆页");
    refs.forEach((r, i) =>
      text(s, `${i + 1}. ${r.title}`, 0.82, 1.65 + i * 0.8, 11.65, 0.7, 18, t, {
        hyperlink: { url: r.url },
      }),
    );
  } else if (d.layout === "rna") {
    const seq = d.diagram.sequence;
    text(
      s,
      `5′－${seq.split("").join(" ")}－3′`,
      0.88,
      1.62,
      11.55,
      0.6,
      28,
      t,
      { bold: true },
    );
    text(
      s,
      "按1—9给碱基编号；骨架线连接相邻位置，配对线连接互补碱基。",
      0.88,
      2.23,
      11.55,
      0.5,
      24,
      t,
    );
    diagram(s, d.diagram, { x: 1.05, y: 2.92, w: 5.1, h: 3.45 }, t);
    text(s, "茎：由三组碱基配对构成", 6.95, 2.95, 5.45, 0.55, 24, t, {
      bold: true,
    });
    s.addTable(
      [
        ["位置对", "碱基对"],
        ...d.diagram.pairs.map(([a, b]) => [
          `${a}—${b}`,
          `${seq[a - 1]}—${seq[b - 1]}`,
        ]),
      ],
      {
        x: 6.95,
        y: 3.58,
        w: 5.35,
        h: 1.9,
        fontFace: t.font,
        fontSize: 24,
        color: t.ink,
        fill: t.secondary,
        border: { type: "solid", color: t.bg, pt: 2 },
        margin: 0.08,
        autoPage: false,
      },
    );
    text(s, "环区：4—6位的 A A A", 6.95, 5.98, 5.35, 0.5, 24, t);
  } else if (d.figure) {
    const f = d.figure,
      wide = d.layout === "paper-wide";
    const box = wide
      ? { x: 0.86, y: 2.3, w: 11.55, h: 3.6 }
      : { x: 0.86, y: 1.65, w: 7.45, h: 4.2 };
    const scale = Math.min(box.w / f.width, box.h / f.height),
      iw = f.width * scale,
      ih = f.height * scale;
    s.addImage({
      path: f.prepared,
      x: box.x + (box.w - iw) / 2,
      y: box.y + (box.h - ih) / 2,
      w: iw,
      h: ih,
      altText: f.alt,
    });
    if (wide) {
      if (body[0]) text(s, body[0], 0.86, 1.58, 11.55, 0.65, 26, t);
      if (d.caption) text(s, d.caption, 0.86, 6.02, 11.55, 0.5, 22, t);
    } else {
      body.forEach((v, i) =>
        text(s, v, 8.72, 1.95 + i * 1.65, 3.65, 1.4, 24, t),
      );
      if (d.caption) text(s, d.caption, 0.86, 6.12, 11.55, 0.35, 20, t);
    }
  } else if (d.table) {
    if (body.length > 1)
      throw new Error(
        "表格页body保留一句导读，其余写入takeaway或表格：" + d.title,
      );
    if (body[0]) text(s, body[0], 0.84, 1.62, 11.6, 0.96, 24, t);
    const rows = [d.table.headers, ...d.table.rows];
    s.addTable(rows, {
      x: 0.84,
      y: 2.75,
      w: 11.6,
      h: 2.83,
      border: { type: "solid", color: t.bg, pt: 2 },
      fill: t.secondary,
      color: t.ink,
      fontFace: t.font,
      fontSize: 24,
      margin: 0.1,
      rowH: 0.7,
      autoPage: false,
    });
    if (d.takeaway) text(s, d.takeaway, 0.84, 5.83, 11.6, 0.7, 24, t);
  } else if (d.diagram) {
    if (d.layout === "visual") {
      if (body.length > 1)
        throw new Error("整页图解的导读需独立成句：" + d.title);
      if (body[0]) text(s, body[0], 0.84, 1.62, 11.6, 0.95, 24, t);
      diagram(s, d.diagram, { x: 1.0, y: 2.75, w: 11.25, h: 3.1 }, t);
      if (d.caption) text(s, d.caption, 0.84, 5.98, 11.6, 0.55, 22, t);
    } else {
      body.forEach((v, i) =>
        text(s, v, 0.84, 1.68 + i * 1.54, 6.0, 1.42, 24, t),
      );
      diagram(s, d.diagram, { x: 7.25, y: 1.98, w: 5.1, h: 4.1 }, t);
    }
  } else {
    if (body.length > 3) throw new Error("正文段落超过3段，请拆页：" + d.title);
    body.forEach((v, i) =>
      text(s, v, 0.86, 1.85 + i * 1.46, 11.45, 1.15, 26, t),
    );
  }
  if (d.type !== "cover" && d.type !== "references" && d.sourceIds?.length) {
    const cites = [
      ...new Set(
        d.sourceIds.map((id) => {
          const r = course.sources.find((r) => r.id === id);
          return r?.shortCitation || r?.title || id;
        }),
      ),
    ];
    let cite = cites.slice(0, 2).join(" · ");
    if (cites.length > 2) cite += " 等";
    text(s, cite, 0.84, 6.65, 11.6, 0.3, 14, t);
  }
  const refs = (d.sourceIds || [])
    .map((id) => course.sources.find((r) => r.id === id))
    .filter(Boolean)
    .map((r) => `${r.title}\n${r.url}`)
    .join("\n");
  const figureSource = d.figure
    ? `\n\n图片：${d.figure.credit}\n${d.figure.sourceUrl}\n截取区域：${JSON.stringify(d.figure.crop || [0, 0, 1, 1])}`
    : "";
  s.addNotes(
    `本页安排 ${d.seconds || 0} 秒\n\n${d.notes || ""}\n\n参考来源\n${refs}${figureSource}`,
  );
  return s;
}
async function buildCourse(course, dir) {
  const t = themes.find((t) => t.id === course.themeId);
  if (!t) throw new Error("未知themeId: " + course.themeId);
  await fs.mkdir(dir, { recursive: true });
  const manifest = [];
  for (const lesson of course.lessons) {
    for (const slide of lesson.slides) {
      if (
        course.includeExercises !== true &&
        (slide.type === "exercise" || /练习|判断题/.test(slide.title))
      )
        throw new Error("当前课程不包含练习：" + slide.title);
      if (slide.figure) {
        const f = slide.figure;
        if (!f.credit || !f.sourceUrl || !f.alt)
          throw new Error("论文图需要credit/sourceUrl/alt：" + slide.title);
        f.prepared = path.join(
          figureCache,
          `${lesson.id}-${lesson.slides.indexOf(slide)}.png`,
        );
        const dims = execFileSync(
          process.env.COURSE_PPT_PYTHON || "python",
          [
            path.join(here, "crop_figure.py"),
            f.path,
            f.prepared,
            "--crop",
            ...(f.crop || [0, 0, 1, 1]).map(String),
          ],
          { encoding: "utf8" },
        )
          .trim()
          .split(/\s+/)
          .map(Number);
        [f.width, f.height] = dims;
      }
    }
    ppt = new PptxGenJS();
    ppt.layout = "LAYOUT_WIDE";
    ppt.author = course.institution || "课程编制";
    ppt.subject = course.title;
    ppt.title = lesson.title;
    ppt.company = course.institution || "";
    ppt.lang = "zh-CN";
    ppt.theme = { headFontFace: t.font, bodyFontFace: t.font, lang: "zh-CN" };
    lesson.slides.forEach((d, i) =>
      page(d, t, course, lesson, i + 1, lesson.slides.length),
    );
    const name = `${lesson.id}-${lesson.title.replace(/[\\/:*?"<>|]/g, "")}`;
    const finalFile = path.join(dir, name + ".pptx");
    const draftFile = course.nativeTemplate
      ? path.join(dir, ".content-" + name + ".pptx")
      : finalFile;
    await ppt.writeFile({ fileName: draftFile });
    if (course.nativeTemplate) {
      execFileSync(
        process.env.COURSE_PPT_PYTHON || "python",
        [
          path.join(here, "apply_template.py"),
          "--template",
          course.nativeTemplate,
          "--input",
          draftFile,
          "--output",
          finalFile,
          "--profile",
          course.templateProfile,
        ],
        { stdio: "inherit" },
      );
      await fs.unlink(draftFile);
    }
    let sec = 0;
    const md = [
      `# ${lesson.title}`,
      `\n${course.title}\n\n受众：${course.audience || "科学与AI学习者"}\n模板：${course.nativeTemplate ? path.basename(course.nativeTemplate, ".pptx") : t.name + "（内容底稿）"}\n预计总时长：${(lesson.slides.reduce((a, s) => a + s.seconds, 0) / 60).toFixed(1)}分钟。\n`,
    ];
    for (let i = 0; i < lesson.slides.length; i++) {
      const d = lesson.slides[i],
        fmt = (x) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`;
      md.push(
        `## ${String(i + 1).padStart(2, "0")} ${d.title}\n\n时间：${fmt(sec)}–${fmt(sec + d.seconds)}（${d.seconds}秒）\n\n${d.notes}\n\n${(
          d.sourceIds || []
        )
          .map((id) => {
            const r = course.sources.find((r) => r.id === id);
            return r ? `- [${id}] [${r.title}](${r.url})` : "";
          })
          .join("\n")}\n`,
      );
      sec += d.seconds;
    }
    await fs.writeFile(
      path.join(dir, name + "-逐页讲稿.md"),
      md.join("\n"),
      "utf8",
    );
    manifest.push({
      id: lesson.id,
      title: lesson.title,
      pptx: name + ".pptx",
      slides: lesson.slides.length,
      seconds: sec,
      templateId: course.templateId,
      themeId: t.id,
    });
  }
  await fs.writeFile(
    path.join(dir, "manifest.json"),
    JSON.stringify(
      { title: course.title, themeId: t.id, lessons: manifest },
      null,
      2,
    ),
  );
  return manifest;
}
if (args.includes("--templates"))
  throw new Error("请从现成模板库选择模板，不再生成模板。");
{
  const input = arg("--course");
  if (!input) throw new Error("需要--course course.json");
  const course = JSON.parse(await fs.readFile(input, "utf8"));
  for (const lesson of course.lessons)
    for (const slide of lesson.slides)
      if (slide.figure)
        slide.figure.path = path.resolve(
          path.dirname(input),
          slide.figure.path,
        );
  if (course.materialType !== "own-research") {
    for (const key of ["institution", "projectId", "logo", "brandingLabel"])
      delete course[key];
  }
  if (course.logo && !path.isAbsolute(course.logo))
    course.logo = path.resolve(path.dirname(input), course.logo);
  let nativeTemplate = arg("--template") || course.sourceTemplate;
  if (!nativeTemplate && course.templateId) {
    const candidates = [
      path.join(skill, "assets/templates/catalog.json"),
      path.resolve(skill, "../../templates/catalog.json"),
    ];
    let catalog;
    for (const file of candidates) {
      try {
        catalog = JSON.parse(await fs.readFile(file, "utf8"));
        catalog.directory = path.dirname(file);
        break;
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
    const selected = catalog?.templates.find(
      (item) => item.id === course.templateId && item.status === "ready",
    );
    if (!selected)
      throw new Error("找不到已适配的模板ID：" + course.templateId);
    nativeTemplate = path.join(catalog.directory, selected.file);
    course.templateProfile = arg("--profile") || selected.profile;
  }
  if (nativeTemplate) {
    course.nativeTemplate = path.resolve(path.dirname(input), nativeTemplate);
    course.templateProfile = arg("--profile") || course.templateProfile;
    if (!course.templateProfile)
      throw new Error("原生模板需要已检查的templateProfile");
  }
  if (course.logo && path.extname(course.logo).toLowerCase() === ".png") {
    const b = await fs.readFile(course.logo);
    course.logoAspect = b.readUInt32BE(16) / b.readUInt32BE(20);
  }
  figureCache = await fs.mkdtemp(
    path.join(os.tmpdir(), "community-course-figures-"),
  );
  try {
    const m = await buildCourse(course, out);
    console.log(JSON.stringify(m, null, 2));
  } finally {
    if (
      path.dirname(figureCache) !== path.resolve(os.tmpdir()) ||
      !path.basename(figureCache).startsWith("community-course-figures-")
    )
      throw new Error("临时图片清理路径异常");
    await fs.rm(figureCache, { recursive: true, force: true });
  }
}
