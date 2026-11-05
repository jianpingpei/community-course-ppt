// Course-specific scientific atlas: shared grammar, varied information layouts.
import { drawDiagram } from "./diagrams.mjs";
const t = {
  bg: "FCFCF7",
  ink: "19342C",
  accent: "21634D",
  secondary: "E8F0E9",
  font: "Microsoft YaHei",
};
const txt = (s, v, x, y, w, h, size = 24, o = {}) =>
  s.addText(String(v), {
    x,
    y,
    w,
    h,
    fontSize: size,
    fontFace: t.font,
    color: t.ink,
    margin: 0,
    breakLine: false,
    vertAnchor: "mid",
    ...o,
  });
const rect = (ppt, s, x, y, w, h, fill) =>
  s.addShape(ppt.ShapeType.rect, {
    x,
    y,
    w,
    h,
    line: { transparency: 100 },
    fill: { color: fill },
  });
const rule = (ppt, s, x, y, w, color = "C6D5C9") =>
  s.addShape(ppt.ShapeType.line, {
    x,
    y,
    w,
    h: 0,
    line: { color, width: 0.7 },
  });
function picture(s, f, box) {
  const k = Math.min(box.w / f.width, box.h / f.height),
    w = f.width * k,
    h = f.height * k;
  s.addImage({
    path: f.prepared,
    x: box.x + (box.w - w) / 2,
    y: box.y + (box.h - h) / 2,
    w,
    h,
    altText: f.alt,
  });
}
function cover(ppt, s, d, course, lesson) {
  s.background = { color: t.ink };
  txt(s, course.title, 0.68, 0.64, 11.9, 0.45, 18, { color: "E6EEDD" });
  txt(s, "BIOLOGICAL\nFOUNDATION MODELS", 0.7, 1.66, 6.7, 1.1, 19, {
    color: "ACCAAE",
    charSpacing: 2,
  });
  const title = d.title
    .replace("DNA/RNA 与生物序列建模", "DNA / RNA\n与生物序列建模")
    .replace("蛋白质表示、结构与设计", "蛋白质表示、\n结构与设计")
    .replace("单细胞与空间模型", "单细胞\n与空间模型")
    .replace("跨模态与模型选型", "跨模态\n与模型选型");
  txt(s, title, 0.68, 3.0, 7.4, 1.65, 38, {
    color: "FFFFFF",
    bold: true,
    breakLine: false,
  });
  txt(s, d.body.join("\n"), 0.72, 5.42, 7.1, 1.15, 24, { color: "E1EBDD" });
  // Native scientific marks encode the lesson's data object, not decorative cards.
  const x = 9.0,
    y = 2.05;
  if (lesson.id === "01") {
    ["A", "C", "G", "T", "A", "G"].forEach((v, i) => {
      const yy = y + i * 0.55;
      txt(s, v, x, yy, 0.5, 0.4, 24, { color: "B7D6AE", bold: true });
      txt(s, ["T", "G", "C", "A", "T", "C"][i], x + 2, yy, 0.5, 0.4, 24, {
        color: "FFFFFF",
        bold: true,
      });
      rule(ppt, s, x + 0.65, yy + 0.21, 1.1, "7EA188");
    });
    txt(s, "SEQUENCE", x, 6.25, 3, 0.4, 18, {
      color: "ACCAAE",
      charSpacing: 2,
    });
  } else {
    const pts =
      lesson.id === "02"
        ? [
            [0, 0],
            [1, 0.5],
            [2, 0],
            [2.5, 1],
            [1.5, 1.7],
            [0.3, 1.1],
            [0, 2.3],
            [1.4, 2.8],
            [2.6, 2.3],
          ]
        : lesson.id === "03"
          ? [
              [0, 0],
              [1.1, 0.1],
              [2.3, 0.4],
              [0.3, 1.2],
              [1.5, 1.3],
              [2.5, 1.8],
              [0, 2.6],
              [1.2, 2.7],
              [2.4, 3],
            ]
          : [
              [0, 0],
              [2.2, 0],
              [1.1, 1.5],
              [0, 3],
              [2.2, 3],
            ];
    pts.forEach(([xx, yy], i) => {
      s.addShape(ppt.ShapeType.ellipse, {
        x: x + xx,
        y: y + yy,
        w: 0.27,
        h: 0.27,
        line: { color: "BCD4B3", width: 1 },
        fill: { color: i % 3 === 0 ? "BCD4B3" : "42624E" },
      });
      if (lesson.id === "02" && i) {
        const [px, py] = pts[i - 1];
        s.addShape(ppt.ShapeType.line, {
          x: x + Math.min(px, xx) + 0.13,
          y: y + Math.min(py, yy) + 0.13,
          w: Math.abs(px - xx),
          h: Math.abs(py - yy),
          flipV: yy < py,
          flipH: xx < px,
          line: { color: "8CAE91", width: 2 },
        });
      }
    });
    txt(
      s,
      { "02": "STRUCTURE", "03": "CELLULAR CONTEXT", "04": "CROSS-MODAL" }[
        lesson.id
      ],
      x - 0.2,
      6.25,
      3.5,
      0.4,
      18,
      { color: "ACCAAE", charSpacing: 1 },
    );
  }
}
function frame(ppt, s, d, course, lesson, i, total) {
  s.background = { color: t.bg };
  txt(s, d.title, 0.68, 0.62, 12, 0.75, 32, { bold: true });
  if (d.type !== "references") {
    const cites = [
      ...new Set(
        (d.sourceIds || []).map((id) => {
          const r = course.sources.find((r) => r.id === id);
          return r.shortCitation || r.title;
        }),
      ),
    ];
    txt(
      s,
      cites.slice(0, 2).join(" · ") + (cites.length > 2 ? " 等" : ""),
      0.7,
      6.72,
      10.6,
      0.3,
      14,
      { color: "50675C" },
    );
    txt(
      s,
      `${String(i + 1).padStart(2, "0")} / ${total}`,
      11.55,
      6.96,
      1.05,
      0.25,
      14,
      { align: "right", color: "50675C" },
    );
  }
}
function table(ppt, s, d) {
  if (d.body[0]) txt(s, d.body[0], 0.7, 1.55, 11.9, 0.8, 24);
  const { headers, rows } = d.table;
  const widths =
    headers.length === 2
      ? [3.15, 8.75]
      : headers.length === 4
        ? [2.2, 3.15, 3.15, 3.4]
        : [2.55, 4.65, 4.7];
  const height = Math.min(3.5, 0.78 * (rows.length + 1));
  const data = [
    headers.map((text) => ({
      text,
      options: { bold: true, color: "FFFFFF", fill: t.accent },
    })),
    ...rows.map((row, i) =>
      row.map((text) => ({
        text: String(text),
        options: { fill: i % 2 ? "F6F8F2" : "E8F0E9" },
      })),
    ),
  ];
  s.addTable(data, {
    x: 0.7,
    y: 2.6,
    w: 11.9,
    h: height,
    colW: widths,
    fontFace: t.font,
    fontSize: 24,
    color: t.ink,
    margin: 0.12,
    border: { color: t.bg, pt: 2 },
    autoPage: false,
    verbose: false,
  });
  if (d.takeaway) txt(s, d.takeaway, 0.7, 6.05, 11.9, 0.5, 24, { bold: true });
}
function figure(ppt, s, d) {
  const wide = d.layout === "paper-wide";
  if (wide) {
    if (d.body[0]) txt(s, d.body[0], 0.7, 1.55, 11.9, 0.65, 24);
    picture(s, d.figure, { x: 0.75, y: 2.42, w: 11.8, h: 3.35 });
  } else {
    picture(s, d.figure, { x: 0.72, y: 1.75, w: 7.3, h: 4.05 });
    rule(ppt, s, 8.55, 1.85, 3.95, t.accent);
    d.body.forEach((v, i) =>
      txt(s, v, 8.55, 2.15 + i * 1.48, 4, 1.15, 24, { bold: i === 0 }),
    );
  }
  if (d.caption)
    txt(s, d.caption, 0.73, 6.06, 11.85, 0.48, 20, { color: "315746" });
}
function rna(ppt, s, d) {
  txt(
    s,
    `5′  ${d.diagram.sequence.split("").join(" ")}  3′`,
    0.72,
    1.55,
    11.9,
    0.6,
    28,
    { bold: true },
  );
  drawDiagram(ppt, s, d.diagram, { x: 1.0, y: 2.55, w: 5.1, h: 3.35 }, t);
  const seq = d.diagram.sequence;
  txt(s, "茎区：互补配对", 7.0, 2.43, 5, 0.5, 26, { bold: true });
  s.addTable(
    [
      ["位置", "碱基"],
      ...d.diagram.pairs.map(([a, b]) => [
        `${a}—${b}`,
        `${seq[a - 1]}—${seq[b - 1]}`,
      ]),
    ],
    {
      x: 7,
      y: 3.1,
      w: 5.1,
      h: 2.15,
      fontFace: t.font,
      fontSize: 24,
      color: t.ink,
      fill: t.secondary,
      border: { color: t.bg, pt: 2 },
      margin: 0.12,
      autoPage: false,
    },
  );
  txt(s, "环区：第 4—6 位", 7, 5.65, 5, 0.5, 24, { bold: true });
}
function summary(ppt, s, d) {
  d.body.forEach((v, i) => {
    const yy = 1.85 + i * 1.48;
    const split = v.indexOf("：");
    const heading = split > 0 ? v.slice(0, split) : "回顾";
    const body = split > 0 ? v.slice(split + 1) : v;
    txt(s, heading, 0.72, yy, 1.6, 0.5, 24, { color: t.accent, bold: true });
    txt(s, body, 2.5, yy, 10.05, 0.95, 26);
    if (i < d.body.length - 1) rule(ppt, s, 2.5, yy + 1.12, 10.0);
  });
}
export function renderLesson({ ppt, course, lesson }) {
  ppt.theme = { headFontFace: t.font, bodyFontFace: t.font, lang: "zh-CN" };
  lesson.slides.forEach((d, i) => {
    const s = ppt.addSlide();
    if (d.type === "cover") {
      cover(ppt, s, d, course, lesson);
      return;
    }
    frame(ppt, s, d, course, lesson, i, lesson.slides.length);
    if (d.type === "references") {
      (d.sourceIds || []).forEach((id, j) => {
        const r = course.sources.find((r) => r.id === id);
        const y = 1.55 + j * 0.94;
        txt(s, r.displayTitle || r.title, 0.76, y, 11.8, 0.46, 24, {
          hyperlink: { url: r.url },
        });
        txt(s, r.shortCitation || "", 0.76, y + 0.5, 11.8, 0.27, 14, {
          color: "50675C",
        });
      });
    } else if (d.layout === "rna") rna(ppt, s, d);
    else if (d.figure) figure(ppt, s, d);
    else if (d.table) table(ppt, s, d);
    else if (d.diagram) {
      if (d.layout === "visual" || d.diagram.kind === "translation") {
        if (d.body[0]) txt(s, d.body[0], 0.72, 1.57, 11.9, 0.8, 24);
        drawDiagram(
          ppt,
          s,
          d.diagram,
          { x: 1.0, y: 2.78, w: 11.25, h: 3.12 },
          t,
        );
      } else {
        d.body.forEach((v, j) => txt(s, v, 0.72, 1.95 + j * 1.4, 5.8, 1, 24));
        drawDiagram(ppt, s, d.diagram, { x: 7.2, y: 2.05, w: 5.1, h: 3.8 }, t);
      }
      if (d.caption)
        txt(s, d.caption, 0.73, 6.12, 11.85, 0.44, 20, { color: "315746" });
    } else summary(ppt, s, d);
  });
}
