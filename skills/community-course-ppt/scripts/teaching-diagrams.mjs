// Native teaching diagrams express the actual relation, rather than a numbered list.
export function drawTeachingDiagram(
  s,
  d,
  { x, y, w, h },
  t,
  { text, rect, line, shapeType },
) {
  const label = (value, xx, yy, ww, hh = 0.5, size = 24, opts = {}) =>
    text(s, value, xx, yy, ww, hh, size, t, opts);
  const arrow = (x1, y1, x2, y2) =>
    line(s, x1, y1, x2, y2, t.accent, 1.5, { endArrowType: "triangle" });
  const box = (value, xx, yy, ww, hh = 0.85, fill = t.secondary) => {
    rect(s, xx, yy, ww, hh, fill);
    label(value, xx + 0.1, yy + 0.1, ww - 0.2, hh - 0.2, 24, {
      align: "center",
    });
  };
  const cell = (xx, yy, active = false) => {
    s.addShape(shapeType.ellipse, {
      x: xx,
      y: yy,
      w: 1.45,
      h: 1.45,
      line: { color: active ? "4A6584" : t.ink, width: active ? 3 : 1.5 },
      fill: { color: active ? "DFE9F2" : t.secondary },
    });
    s.addShape(shapeType.ellipse, {
      x: xx + 0.46,
      y: yy + 0.42,
      w: 0.55,
      h: 0.55,
      line: { color: t.ink, width: 1 },
      fill: { color: t.bg },
    });
  };
  if (d.kind === "learning-map") {
    label(
      d.input === "sequence" ? "核酸序列" : "表达矩阵",
      x,
      y,
      3.2,
      0.5,
      26,
      { bold: true },
    );
    if (d.input === "sequence") {
      label("A  C  G  …", x, y + 1.1, 3.2, 0.7, 32, {
        bold: true,
        align: "center",
      });
    } else {
      s.addTable(
        [
          ["", "基因A", "基因B"],
          ["细胞1", "8", "1"],
          ["细胞2", "1", "7"],
        ],
        {
          x,
          y: y + 0.72,
          w: 3.25,
          h: 1.8,
          fontFace: t.font,
          fontSize: 22,
          color: t.ink,
          fill: t.secondary,
          margin: 0.06,
          border: { type: "solid", color: t.bg, pt: 2 },
          autoPage: false,
        },
      );
    }
    arrow(x + 3.4, y + 1.4, x + 4.05, y + 1.4);
    box(
      d.input === "sequence" ? "上下文表示" : "细胞表示",
      x + 4.2,
      y + 0.95,
      2.6,
      1.0,
    );
    d.outputs.forEach((v, i) => {
      const yy = y + 0.18 + i * 1.8;
      arrow(x + 6.95, y + 1.45, x + 8.0, yy + 0.48);
      label(v, x + 8.25, yy, 2.8, 0.9, 24, { bold: true });
    });
    return true;
  }
  if (d.kind === "embedding") {
    label("序列位置", x, y, 2.0, 0.5, 24, { bold: true });
    label("上下文特征", x + 2.6, y, 4.2, 0.5, 24, { bold: true });
    const colors = ["DDE5ED", "9CB4CA", "CFDCD5", "7E9D91", "BACBDD", "ECDFCB"];
    [..."ACGT"].forEach((v, i) => {
      label(v, x + 0.55, y + 0.7 + i * 0.54, 0.7, 0.45, 28, {
        bold: true,
        align: "center",
      });
      for (let j = 0; j < 6; j++)
        rect(
          s,
          x + 2.6 + j * 0.58,
          y + 0.76 + i * 0.54,
          0.49,
          0.33,
          colors[(i + j) % colors.length],
        );
    });
    arrow(x + 1.6, y + 1.6, x + 2.3, y + 1.6);
    arrow(x + 6.2, y + 1.55, x + 7.7, y + 0.9);
    arrow(x + 6.2, y + 1.55, x + 7.7, y + 2.3);
    label("保留各位置向量", x + 7.9, y + 0.55, 3.2, 0.7, 24);
    label("汇聚为序列向量", x + 7.9, y + 1.95, 3.2, 0.7, 24);
    return true;
  }
  if (d.kind === "probability-product") {
    const terms = ["P(A)", "P(C∣A)", "P(G∣AC)"],
      prefixes = ["A", "A C", "A C G"];
    terms.forEach((v, i) => {
      const xx = x + i * 3.9;
      label(prefixes[i], xx, y + 0.25, 3.2, 0.6, 28, {
        align: "center",
        bold: true,
      });
      label(v, xx, y + 1.25, 3.2, 0.85, 30, { align: "center" });
      if (i < 2)
        label("×", xx + 3.25, y + 1.25, 0.6, 0.85, 32, { align: "center" });
    });
    return true;
  }
  if (d.kind === "holdout") {
    label("训练时可见", x + 2.5, y, 3.5, 0.55, 26, { bold: true });
    label("测试时的新对象", x + 7.1, y, 3.9, 0.55, 26, { bold: true });
    line(s, x + 6.5, y + 0.65, x + 6.5, y + 2.95, t.accent, 1.5, {
      dashType: "dash",
    });
    d.rows.forEach((row, i) => {
      const yy = y + 0.9 + i * 0.76;
      label(row[0], x, yy, 2, 0.5, 24, { bold: true });
      box(row[1], x + 2.5, yy, 3.45, 0.58);
      box(row[2], x + 7.1, yy, 3.75, 0.58, "DFE9F2");
    });
    return true;
  }
  if (d.kind === "routes") {
    d.rows.forEach((row, i) => {
      const yy = y + 0.25 + i * 1.6;
      box(row[0], x, yy, 3.0, 1.0);
      arrow(x + 3.15, yy + 0.5, x + 4.0, yy + 0.5);
      box(row[1], x + 4.15, yy, 2.7, 1.0);
      arrow(x + 7.0, yy + 0.5, x + 7.85, yy + 0.5);
      label(row[2], x + 8.0, yy, 3.1, 1.0, 25, { bold: true });
    });
    return true;
  }
  if (d.kind === "cell-state") {
    cell(x + 1.05, y + 0.38);
    cell(x + 8.4, y + 0.38, true);
    label("静息T细胞", x + 0.5, y + 2.1, 2.6, 0.6, 26, { align: "center" });
    label("激活T细胞", x + 7.85, y + 2.1, 2.6, 0.6, 26, { align: "center" });
    label("激活过程", x + 4.0, y + 0.45, 3.2, 0.55, 24, { align: "center" });
    arrow(x + 3.0, y + 1.17, x + 7.75, y + 1.17);
    label("同一细胞类型，表达状态发生变化", x + 3.25, y + 1.65, 4.6, 1.0, 24, {
      align: "center",
    });
    return true;
  }
  if (d.kind === "selection") {
    box("手头的数据", x, y + 1.05, 2.25, 1.0);
    const rows = [
      ["DNA序列", "NT／Evo 2"],
      ["表达矩阵", "scGPT"],
      ["分子组分", "AlphaFold 3"],
    ];
    rows.forEach((row, i) => {
      const yy = y + i * 1.03;
      arrow(x + 2.4, y + 1.55, x + 3.25, yy + 0.42);
      box(row[0], x + 3.4, yy, 2.7, 0.85);
      arrow(x + 6.25, yy + 0.42, x + 7.15, yy + 0.42);
      label(row[1], x + 7.4, yy, 3.7, 0.85, 26, { bold: true });
    });
    return true;
  }
  if (d.kind === "variant-scores") {
    const seqs = ["ACGTAC", "ACGGAC"];
    seqs.forEach((seq, i) => {
      const yy = y + i * 1.05;
      label(i ? "变异" : "参考", x, yy, 1.2, 0.6, 24);
      [...seq].forEach((v, j) => {
        if (j === 3) rect(s, x + 1.4 + j * 0.68, yy, 0.6, 0.66, "DFE9F2");
        label(v, x + 1.4 + j * 0.68, yy, 0.6, 0.66, 28, {
          align: "center",
          bold: j === 3,
        });
      });
      arrow(x + 5.7, yy + 0.33, x + 7.0, yy + 0.33);
      label(i ? "S(alt)" : "S(ref)", x + 7.4, yy, 3, 0.66, 28, {
        align: "center",
      });
    });
    label("ΔS = S(alt) − S(ref)", x + 2.9, y + 2.35, 6, 0.65, 28, {
      align: "center",
      bold: true,
    });
    return true;
  }
  if (d.kind === "annotation") {
    label("参考细胞（训练）", x, y + 0.3, 3.15, 0.7, 24);
    label("待注释的新细胞", x, y + 1.85, 3.15, 0.7, 24);
    box("共享细胞\n编码器", x + 3.7, y + 0.45, 2.6, 2.2);
    arrow(x + 2.9, y + 0.6, x + 3.55, y + 1.0);
    arrow(x + 2.9, y + 2.3, x + 3.55, y + 2.1);
    arrow(x + 6.45, y + 1.0, x + 7.3, y + 1.0);
    arrow(x + 6.45, y + 2.1, x + 7.3, y + 2.3);
    label("真实类型标签", x + 7.6, y - 0.05, 3.35, 0.45, 22);
    arrow(x + 9.1, y + 0.4, x + 9.1, y + 0.66);
    label("训练类型分类头", x + 7.6, y + 0.72, 3.35, 0.6, 24, { bold: true });
    label("输出细胞类型", x + 7.6, y + 1.8, 3.35, 0.6, 24, { bold: true });
    label("T细胞／B细胞等", x + 7.6, y + 2.45, 3.35, 0.6, 24);
    return true;
  }
  if (d.kind === "task-outputs") {
    const titles = ["分类", "回归", "结构"],
      outputs = ["T细胞／B细胞", "ŷ", "(x, y, z)"],
      meanings = ["离散类别", "活性或表达数值", "空间坐标"];
    titles.forEach((v, i) => {
      const xx = x + i * 3.85;
      label(v, xx, y, 3.4, 0.55, 26, { bold: true });
      label(outputs[i], xx, y + 1.05, 3.4, 0.8, i ? 32 : 26, {
        align: "center",
      });
      label(meanings[i], xx, y + 2.2, 3.4, 0.55, 24, { align: "center" });
    });
    return true;
  }
  if (d.kind === "trainable-blocks") {
    ["固定表示", "微调"].forEach((v, i) => {
      const yy = y + i * 1.6;
      label(v, x, yy + 0.1, 2.0, 0.6, 24, { bold: true });
      box("细胞编码器", x + 2.4, yy, 3.5, 0.8, i ? "DFE9F2" : t.secondary);
      arrow(x + 6.05, yy + 0.4, x + 6.7, yy + 0.4);
      box("类型分类头", x + 6.85, yy, 3.6, 0.8, "DFE9F2");
      label(
        i ? "部分或全部参数更新" : "参数固定",
        x + 2.4,
        yy + 0.92,
        3.5,
        0.45,
        22,
        { align: "center" },
      );
      label("参数更新", x + 6.85, yy + 0.92, 3.6, 0.45, 22, {
        align: "center",
      });
    });
    return true;
  }
  return false;
}
