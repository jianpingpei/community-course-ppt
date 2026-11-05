# community-course-ppt

一个可安装的科学与AI课程制作Skill：阅读材料、讨论选题、设计课时和视觉方案，逐页制作可编辑PPTX、PDF和中文讲稿。适用于天文、地学、社会、生物等领域。

**不捆绑PPT模板。** 同一门课的各课时保持设计一致，新课程按内容自主设计。生物课程只作为example，不是默认样式或运行依赖。

[Skill指引](skills/community-course-ppt/SKILL.md) · [上传ZIP](release/community-course-ppt.zip) · [生物课程](example/biology-foundation-models/README.md)

## 上传到 WorkBuddy

在“技能 → 添加技能 → 上传技能”选择release/community-course-ppt.zip。包内有指引、脚本和公开依赖清单，没有模板、课程成品或腾讯内部运行时，打包硬限制为5,242,880字节。

```text
使用 community-course-ppt，先检查当前制作工具，再阅读我上传的材料。
先讨论课程主题与课时安排，再制定视觉方案并制作课件。
每课时15–20分钟、超过20页，无练习，包含PPTX、PDF和逐页中文讲稿。
根据课程内容自主设计，不沿用生物样例。
```

优先使用宿主已有的SlideP和editor_sdk。工具不可用时，生成前改用公开PptxGenJS路线。导入成功不等于已验证运行；[网页试用说明](skills/community-course-ppt/references/web-upload.md)列出了需要带回的成品和诊断。

## 安装到其他 Agent

clone后在仓库根目录执行：

```powershell
python scripts/install-skill.py
```

默认只复制到~/.agents/skills/community-course-ppt。公开路线需要Node.js 20+、Python 3.10+，可安装依赖：

```powershell
python scripts/install-skill.py --with-dependencies
python scripts/install-skill.py --update --with-dependencies
```

--dest可指定其他Agent的skills目录。更新时仅清理旧skill管理的模板与工具，不修改其他skill。安装后到**自己的课程材料工作区**提出需求，可自然触发，也可显式使用$community-course-ppt；未发现时重新打开Agent。

## 制作与输出

先形成course.json和DESIGN.md，再准备逐页制作源码；脚本不会自动阅读论文或决定设计。格式见[输入约定](skills/community-course-ppt/references/input-format.md)。

```sh
python "<SKILL_DIR>/scripts/build_course.py" --course "<WORKSPACE>/courses/<id>/course.json" --engine auto
```

--engine可选auto、slidep、pptxgenjs。SlideP路线读取课程自己的.slide文件；公开路线读取course.authoring指向的.mjs。课程源码决定版式，skill提供构建、讲稿和检查工具。

Windows默认用本机PowerPoint导出；其他平台用LibreOffice。--renderer可选powerpoint或libreoffice，--soffice指定可执行文件。仅在接受缺PDF时使用--pptx-only；显式短预览用--preview。

输出到course.json同目录的output/；该目录专供生成，成功构建后替换，不放用户原稿。课程源、素材和来源留在外侧。验证摘要区分结构检查、PDF导出、视觉检查和实际试讲。

## 仓库结构

```text
skills/community-course-ppt/  核心指引、按需参考、公开工具与测试
scripts/                     安装、打包和重建样例的薄入口
release/community-course-ppt.zip  当前上传包
example/biology-foundation-models/  四课时完整样例与独立设计源码
```

旧模板库和自动分配逻辑已移除。旧templateId/themeId等配置需要迁移，不再悄悄套用灰色模板。用户明确提供PPTX模板时，Agent先分析原稿再适配，不承诺任意模板自动复刻。

## 开发与验证

```powershell
python -m unittest discover -s skills/community-course-ppt/tests
python scripts/package-skill.py
./scripts/build-course.ps1 -CourseId biology-foundation-models
```

安装、路径或依赖变化需在独立材料目录验证解压安装副本。排版变化检查最终PPTX和PDF，不以脚本成功替代视觉检查。上传包只保留当前一份。

本机Windows公开路线实际生成并通过PowerPoint导出；SlideP命令流程有受控测试，WorkBuddy真实验收待用户试用，Linux/macOS渲染未实测。详细边界见各样例的validation.json及网页试用说明。
