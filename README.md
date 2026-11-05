# community-course-ppt

## 网页端上传

可上传包为[release/community-course-ppt.zip](release/community-course-ppt.zip)，包含Skill、脚本、依赖清单和一套已适配灰色原生模板（仓库保留全部27套），不包含生物样例或node_modules。上传包约4.9 MB，模板副本移除了内嵌字体，页面和图片保持原样，原始模板不变；渲染环境需安装所用字体。打包脚本检查文件小于5,242,880字节。WorkBuddy通过“技能 → 添加技能 → 上传技能”导入。

导入后Agent需检查并安装Node.js/Python依赖。跨平台入口`python <SKILL_DIR>/scripts/build_course.py --course <course.json>`使用LibreOffice导出PDF，不依赖本机PowerPoint；Windows原入口仍保留。无脚本执行环境时不能完成实际课件生成。具体说明见[网页上传与运行](skills/community-course-ppt/references/web-upload.md)。包的解压独立运行与WorkBuddy网页端实际导入是不同的验证；后者需要在目标账号环境确认。

维护者修改Skill后运行`python scripts/package-skill.py`更新同一个上传包。包为联网安装依赖版本，不是离线运行环境。

一个可安装的课程PPT制作Skill。安装后，在有课程材料的仓库里提出制作课程的需求，Agent会读取材料、讨论选题、设计课时，并生成可编辑PPTX、PDF和中文逐页讲稿。

支持天文、地学、社会、生物等科学与AI课程。仓库主要维护Skill的指引、生成工具、模板资源和安装方式；example中的生物课程是使用示例，用于参考成品与输入格式。

[Skill说明](skills/community-course-ppt/SKILL.md) · [输入格式](skills/community-course-ppt/references/input-format.md) · [模板目录](templates/模板目录.html)

## 安装

clone本仓库后，在仓库根目录执行：

```powershell
python scripts/install-skill.py
```

需要Python 3.10+和Node.js 20+。安装脚本默认将Skill、运行依赖和模板复制到用户目录~/.agents/skills/community-course-ppt。更新已有安装：

```powershell
python scripts/install-skill.py --update
```

其他Agent可通过--dest指定它支持的Skill目录；只复制文件、不安装依赖可用--skip-dependencies。宿主需要支持标准SKILL.md及本机命令执行。

Codex按描述匹配普通需求，也支持显式指定Skill，安装后可在下一轮使用；未显示时重新打开Agent。见[官方Skill说明](https://developers.openai.com/codex/skills/)。

## 在材料仓库使用

安装后切换到课程材料所在的仓库，直接说：

```text
根据当前仓库的课程材料，帮我制作一门天文与AI课程，先讨论选题和课时安排。
```

也可以显式指定：

```text
使用 $community-course-ppt，根据当前仓库材料制作课程。
面向有AI基础的跨专业学生。每课时15–20分钟、超过20页，不安排练习。
先讨论主题，再完成PPT、PDF、逐页讲稿和页面检查。
```

用户可以另行指定受众、课时、时长、页数和输出位置。Skill从安装目录读取工具与模板，课程资料和成品写回材料仓库；使用者无需把工具仓库复制进去。

未指定位置时，课程保存在材料仓库的courses/<course-id>/，包含course.json、素材、来源和output/。Agent负责材料理解、选题讨论、教案与图表准备；脚本读取course.json完成排版、导出与结构检查。

完整一键导出需要Windows、PowerShell 7+和本机Microsoft PowerPoint。目前在该环境验证；macOS/Linux可生成PPTX，PDF导出和中文字体需另行配置。

## 工作方式

- 先理解材料，主题未定时讨论候选；信息明确后直接制作。
- 同课各课时保持模板一致，新课优先使用较少采用的可用模板。
- 图表服务于内容关系，结合原论文图、局部放大、数据图与可编辑科学图解。
- 默认纯讲授，正文简洁，完整解释进入讲稿和讲者备注。
- 外部资料保留来源；单位、校徽和课题号按材料性质及确认信息配置。
- 交付前检查最终PPTX和导出的PDF；脚本成功不代替视觉检查。

具体制作规则以[SKILL.md](skills/community-course-ppt/SKILL.md)为准。样例的领域、模型、页数和署名设置不作为新课程的固定内容。

## 模板资源

仓库收录27套原生模板，其中灰色科研（wps-16）和蓝色典雅（wps-25）已适配自动生成，其余在catalog中标为needs-layout-review。新增模板需检查实际版式、补充profile并渲染验证后再标ready。

使用记录保存在~/.cache/community-course-ppt/template-usage.json。默认模板按ID从安装位置解析，自带模板库可用--catalog指定。来源及原有说明保存在templates/provenance.json。

## 仓库结构

```text
skills/community-course-ppt/  核心Skill：指引、格式、脚本、版式参数与测试
scripts/install-skill.py     安装与更新入口
scripts/build-course.ps1     开发时重建示例的便捷入口
templates/                  安装时随Skill携带的原生模板库
example/                    使用示例、课程输入与对应成品
```

通用构建流程位于skills/community-course-ppt/scripts/build-course.ps1，接收-Course <course.json路径>；仓库级包装脚本只用于重建example。

## 开发与验证

在核心Skill目录安装开发依赖，然后运行聚焦测试：

```powershell
cd skills/community-course-ppt
npm ci
python -m pip install -r requirements.txt
cd ../..
python -m unittest discover -s skills/community-course-ppt/tests
```

修改安装、模板解析或输出路径时，应在独立材料目录验证安装副本，确认不依赖本工具仓库。修改排版时检查受影响的最终页面。临时产物验证后清理，版本历史由Git管理。

## 使用示例

[生物大模型课程](example/biology-foundation-models/README.md)展示四课时课件、讲稿、来源及course.json。它是参考样例，不是使用Skill的前置步骤。需要重建该样例时，在本仓库运行：

```powershell
./scripts/build-course.ps1 -CourseId biology-foundation-models
```
