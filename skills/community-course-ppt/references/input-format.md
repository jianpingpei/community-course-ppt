# 输入与运行

UTF-8 JSON。每门课一个course.json，所有相对资源路径以该文件为基准。配置保留内容与模板身份，生成器不修改它。

## 课程与课时

- courseId：目录对应的稳定ID；title/community/audience：课程、社区和受众。
- materialType：survey或own-research。只有后者读取已确认的institution/projectId/logo。
- templateId：已安装模板库ID，优先使用此字段，构建时按当前skill安装位置解析。sourceTemplate/templateProfile用于自带模板，相对路径以课程JSON为准。同课所有课时共用，不在lesson中覆盖。
- themeId：本仓库底稿为research-notes，最终设计取自真实PPTX模板。
- includeExercises：默认false，本项目不设练习。
- minimumSlidesPerLesson：按用户页数要求配置，默认完整课时21页起；样例的24页仅是该课程的设置。
- sources：id/title/url/shortCitation；lessons：id/title/slides。

## 页面

每页有type、title、body（字符串数组）、notes（中文口语讲稿）、seconds、sourceIds。type可用cover/concept/process/compare/figure/case/summary/references。页数与时间包含封面和参考页。讲解、读图和案例都纳入预算，预计时间不当作试讲实测。

封面左上角读取课程根字段title，作为所有课时共用的课程名称；封面页的title为该课时主题。community和lesson.id属于课程记录，不自动拼成封面标签。

显示文字通常一句导读或两条短解释。一般文字页最多3段，图旁最多2段。数组直接保存完整字符串，不使用分隔符拆解正文，避免误拆条件概率公式。

### 原图

```json
{
  "type": "figure",
  "title": "ESM3的信息轨道",
  "layout": "paper-wide",
  "body": ["ESM3联合建模序列、结构与功能。"],
  "figure": {
    "path": "assets/esm3.webp",
    "crop": [0.17, 0, 0.72, 0.19],
    "alt": "序列、结构和功能三条轨道",
    "credit": "EvolutionaryScale，ESM3方法图",
    "sourceUrl": "https://www.evolutionaryscale.ai/blog/esm3-release"
  },
  "caption": "三条轨道分别提供残基、几何与功能信息",
  "notes": "沿三个横向轨道解释每类信息的含义及互补关系。",
  "seconds": 50,
  "sourceIds": ["esm3official"]
}
```

crop为原图内归一化[左,上,宽,高]，省略时使用整图。原始文件只存一份；裁切面板在生成时提取。paper-wide保留一句导读，paper-side保留1–2条图旁解释。credit/sourceUrl写入备注，sourceIds用于页脚和参考文献。用中文解释必要的英文图内标签；关键细节看不清时换更小的面板。

### 可编辑表格与科学图解

table含headers和rows；body一句导读，可选takeaway。图表内容以事实或明确给定的计算输入为依据，详细解释放notes。

短概念对照可用headers记录共同维度，例如“观察维度、含义、例子”，每行对应一个概念。需要展示流程或空间关系时再使用diagram。compare图解的短标签须检查文本框高度与垂直对齐，不能仅凭配置中有两列，就认定成品排版合理。

diagram含kind及该图需要的数据。通用图可用flow/sequence/matrix/compare/fusion。flow须确有先后关系，使用宽区域且最多4步；窄区域不会自动变成编号竖列。fusion将多个条件并行指向共同输出，不用串联暗示错误因果。生物样例还支持masked-sequence、rna-pairing、protein-completion、complex、spatial和translation；其他领域按真实输入提供核实素材或扩展必要图解。

按关系选用的整页图在scripts/teaching-diagrams.mjs中：

| kind | 含义与字段 |
| --- | --- |
| learning-map | 输入、表示与任务分支；input为sequence或matrix，outputs为两个任务名 |
| embedding | 序列位置、上下文特征与两种表示读取方式 |
| probability-product | ACG序列的条件概率乘积展开 |
| holdout | 训练与测试分区；rows每行是维度、训练对象、测试新对象 |
| routes | 并行建模路线；rows每行是已知条件、模型、目标输出 |
| cell-state | 静息与激活T细胞的状态变化 |
| selection | 根据DNA序列、表达矩阵或分子组分筛选模型 |
| variant-scores | 参考与变异序列的得分差 |
| annotation | 带标签参考数据的训练与新细胞推断 |
| task-outputs | 分类、回归、结构三种输出形态 |
| trainable-blocks | 固定表示与微调的参数更新范围 |

这些图使用原生对象，具体生物例子按当前样例实现；换研究对象时先核对图中内容，不把固定例子当任意数据的通用图。它们用于表达不同关系，不要求每门课凑齐所有kind。

整页图使用layout: visual，body一句导读、caption一句说明。RNA使用layout: rna、9个碱基的diagram.sequence和diagram.pairs位置对。正文、序列、配对表分开排。

## 模板

SKILL_DIR/assets/templates/catalog.json的ready项可推荐和分配；其余仅入库，需阅读源模板、补充assets/template-profiles.json并渲染后再标ready。推荐算法按其他课程使用次数升序排列。已有课程的templateId保持锁定，只有明确换模板时才执行select_template.py --set。
