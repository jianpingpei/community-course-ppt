// An independent astronomical reading layout; no biology renderer or assets.
export function renderLesson({ ppt, course, lesson }) {
  const ink = "102B4C",
    orange = "C86726",
    paper = "F7F7F1";
  const text = (s, v, x, y, w, h, size = 26, o = {}) =>
    s.addText(v, {
      x,
      y,
      w,
      h,
      fontFace: "SimSun",
      fontSize: size,
      color: ink,
      margin: 0,
      ...o,
    });
  const line = (s, x1, y1, x2, y2, c = ink, arrow = false) =>
    s.addShape(ppt.ShapeType.line, {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1),
      flipH: x2 < x1,
      flipV: y2 < y1,
      line: {
        color: c,
        width: 1.5,
        ...(arrow ? { endArrowType: "triangle" } : {}),
      },
    });
  const disk = (s, x, y, w, h, rotate = 0) =>
    s.addShape(ppt.ShapeType.ellipse, {
      x,
      y,
      w,
      h,
      rotate,
      line: { color: orange, width: 2 },
      fill: { color: paper, transparency: 100 },
    });
  ppt.theme = { headFontFace: "SimSun", bodyFontFace: "SimSun" };
  lesson.slides.forEach((d, i) => {
    const s = ppt.addSlide();
    s.background = { color: paper };
    if (i === 0) {
      text(s, course.title, 0.7, 0.65, 11.9, 0.4, 18);
      text(s, "从观测\n到形态判断", 0.7, 2.05, 7, 2.1, 44, { bold: true });
      text(s, d.body[0], 0.7, 5.35, 7.1, 0.8, 26);
      [0, 45, 90, 135].forEach((a) => disk(s, 9, 2.3, 2.25, 1.2, a));
      text(s, "IMAGE  ×  SYMMETRY", 8.1, 5.5, 4.5, 0.5, 20, {
        fontFace: "Georgia",
        color: orange,
      });
      return;
    }
    text(s, d.title, 0.7, 0.65, 12, 0.8, 34, { bold: true });
    text(s, d.body[0], 0.7, 1.75, 11.9, 0.8, 26);
    if (i === 1) {
      const pixels = [
          [0, 0, 1, 0, 0],
          [0, 1, 2, 1, 0],
          [1, 2, 3, 2, 1],
          [0, 1, 2, 1, 0],
          [0, 0, 1, 0, 0],
        ],
        colors = ["EFF1ED", "B1C3D2", "6487A3", ink];
      pixels.forEach((row, y) =>
        row.forEach((v, x) =>
          s.addShape(ppt.ShapeType.rect, {
            x: 1 + x * 0.55,
            y: 2.9 + y * 0.55,
            w: 0.49,
            h: 0.49,
            line: { transparency: 100 },
            fill: { color: colors[v] },
          }),
        ),
      );
      text(s, "像素信号", 4.35, 3.05, 2.6, 0.5, 28, { bold: true });
      text(s, "背景、噪声与观测条件", 4.35, 3.9, 7.5, 0.7, 26);
      text(s, "先确定观测对象，再决定模型输入", 4.35, 5.05, 7.7, 0.7, 26, {
        color: orange,
      });
    } else if (i === 2) {
      [0, 45, 90].forEach((a, j) => {
        disk(s, 1 + j * 3.55, 3.1, 1.9, 0.95, a);
        text(s, `${a}°`, 1 + j * 3.55, 4.7, 1.9, 0.5, 26, {
          align: "center",
          fontFace: "Georgia",
        });
      });
      text(
        s,
        "旋转改变图像方向，不改变同一星系的身份",
        0.75,
        5.8,
        11.85,
        0.6,
        26,
        { color: orange },
      );
    } else if (i === 3) {
      const labels = ["多个旋转视角", "共享卷积特征", "汇总形态预测"];
      labels.forEach((v, j) => {
        text(s, v, 0.8 + j * 4.25, 3.35, 3.2, 0.8, 28, { bold: true });
        if (j < 2)
          line(s, 3.9 + j * 4.25, 3.75, 4.65 + j * 4.25, 3.75, orange, true);
      });
      text(
        s,
        "Dieleman、Willett 与 Dambre：用对称性组织星系图像模型",
        0.8,
        5.4,
        11.8,
        0.8,
        24,
      );
    } else {
      const rows = [
        ["研究对象", "图像中的星系形态"],
        ["输入约定", "观测图像与预处理规则"],
        ["建模重点", "旋转视角与形态信息"],
        ["评测条件", "标注口径与独立测试样本"],
      ];
      rows.forEach(([a, b], j) => {
        const y = 2.75 + j * 0.8;
        text(s, a, 0.8, y, 2.5, 0.5, 24, { bold: true, color: orange });
        text(s, b, 3.8, y, 8.7, 0.5, 26);
        if (j < 3) line(s, 0.8, y + 0.64, 12.5, y + 0.64, "C9D2D8");
      });
    }
    text(
      s,
      "Dieleman et al., 2015 · arXiv:1503.07077",
      0.7,
      6.8,
      10.7,
      0.3,
      14,
      { fontFace: "Georgia" },
    );
    text(s, `${i + 1} / ${lesson.slides.length}`, 11.6, 6.8, 1, 0.3, 14, {
      align: "right",
      fontFace: "Georgia",
    });
  });
}
