import { drawTeachingDiagram } from "./relations.mjs";
let ppt;
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

export function drawDiagram(presentation, slide, data, region, theme) {
  ppt = presentation;
  diagram(slide, data, region, theme);
}
