# 公开工具链制作

适用于没有SlideP和editor_sdk的环境。Node.js 20+、Python 3.10+，在SKILL_DIR安装npm依赖和requirements.txt。不要求用户材料目录包含node_modules，也不使用全局模块路径作为默认依赖。

```sh
npm ci --ignore-scripts --prefix "<SKILL_DIR>"
python -m pip install -r "<SKILL_DIR>/requirements.txt"
python "<SKILL_DIR>/scripts/build_course.py" --course "<COURSE>/course.json" --engine pptxgenjs
```

先编写课程DESIGN.md和authoring源码，接口见input-format.md。源码在材料目录，接收工具注入的PptxGenJS演示文稿对象，不必import工具安装目录。根据当前内容逐页设置布局，不把一个固定renderer当成所有课程的样式。

用原生文字、表格、图表、形状和线条保持可编辑。margin:0有助于与图形对齐；需要内边距时明确配置。色值是6位HEX，不带#；图片按宽高比放置。长文字先删减或换结构，不用自动缩字。每份课时PPT独立创建，不共享上一次的页面状态。

通用工具负责素材裁切、notes、页数一致性、讲稿与清单，课程源码负责画面。生物example仅示范这种分工，不要求新课程调用它的文件。

Windows导出使用PowerPoint，其他平台使用LibreOffice并通过PyMuPDF制作预览。COURSE_PPT_PYTHON和COURSE_PPT_NODE_MODULES可用于已有依赖的显式配置；未配置时从当前skill安装位置解析。
