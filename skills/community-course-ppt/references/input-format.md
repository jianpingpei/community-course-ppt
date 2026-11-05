# 课程输入与制作源码

每门课一个UTF-8 course.json，路径以其目录为基准。该目录还需DESIGN.md，output/为脚本专用生成目录。course.json是教学内容的唯一来源；DESIGN.md控制呈现，制作源码落实排版。

## 课程字段

- courseId、title、community、audience：稳定标识、课程总名、领域与受众。
- materialType：survey或own-research；只有本人研究采用确认的institution/projectId/logo。
- includeExercises默认false；minimumSlidesPerLesson默认21，通常22–26页。
- sources：id/title/url/shortCitation；可选displayTitle作为参考页短标题。
- lessons：id/title/slides；每课时独立PPTX，但使用同一课程设计。
- authoring：公开路线的课程自有.mjs文件，相对课程目录；导出renderLesson({ppt,course,lesson})。
- lesson.dslDir：SlideP路线的页源码目录，默认slides/<lesson.id>/，每页01.slide、02.slide等。

页面记录type/title/body（字符串数组）/notes/seconds/sourceIds，可加purpose、figure、table、diagram及该课程需要的设计字段。type通常cover/concept/process/compare/figure/case/summary/references；图解kind不设固定领域词表，由课程源码实现。不要复制生物专用图解到天文课程当默认能力。

## 公开路线的最小源码

```js
export function renderLesson({ppt,course,lesson}) {
  ppt.theme={headFontFace:'Noto Sans CJK SC',bodyFontFace:'Noto Sans CJK SC'};
  for (const page of lesson.slides) {
    const slide=ppt.addSlide();
    // 根据这门课的DESIGN.md制作原生文字、图形、表格与图表。
    // ppt由工具注入；无须从材料仓库安装或import pptxgenjs。
    slide.addText(page.title,{x:.7,y:.7,w:12,h:.8,fontSize:32});
    // 其余内容由课程作者按关系排版；这不是可交付的完整页面。
  }
}
```

返回时页数必须与lesson.slides一致。工具统一附加备注、来源和讲稿，课程源码不要重复addNotes。不得私自重排教案；改变顺序先更新course.json和DESIGN.md。

论文图配置figure.path/crop/alt/credit/sourceUrl；crop为归一化[左,上,宽,高]。公开路线预处理后注入figure.prepared/width/height，源码按真实比例放图。原图只存一份，面板裁切在临时目录。SlideP路线把实际面板准备在assets，并在.slide引用；未提供的图片不能伪造占位。

SlideP源码必须包含与教案一致的中文notes、页面内容与来源。文件中最后表达式为Slide，不使用import/export/hooks。组件语法见slidep.md及slidep-components.md；具体版本支持范围以宿主为准。

## 从旧配置迁移

移除templateId/templateProfile/themeId/sourceTemplate。新流程不解析wps-ID，也不会回退到灰色模板；旧字段会报迁移提示。将原课程需要的版式写进自己的制作源码和DESIGN.md，旧成品由Git历史保留，example只保存当前课程与制作源码，不作为其他课程的运行依赖。用户主动提供模板时由Agent分析适配，不依靠旧内置profile。

现有命令仍接收--course；新增--engine auto|slidep|pptxgenjs。直接Node入口只负责公开路线PPTX；完整交付通过build_course.py或PowerShell薄包装。
