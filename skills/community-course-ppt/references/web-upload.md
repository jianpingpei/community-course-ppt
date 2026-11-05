# 网页端上传与运行

上传 release/community-course-ppt.zip，不上传整个仓库或仅上传 SKILL.md。包内为单一 community-course-ppt/ 目录，包含脚本、依赖清单、格式指引和一套已适配灰色原生模板；不包含生物样例、node_modules 或开发机器路径。解压后不依赖原仓库。上传包小于5 MiB（5,242,880字节）；为控制体积，包内模板移除内嵌字体及相应引用，原始模板、页面、图片和版式保留。请在运行环境安装所用中文字体。

先确认宿主能执行命令、读写任务文件、安装依赖。能导入技能不等于能执行脚本。无执行工具时不能生成实际 PPTX，不以 Markdown 大纲代替成品。

在技能实际解压目录安装依赖（不预设 ~/.agents 或 Windows 路径）：

```sh
npm ci --ignore-scripts --prefix "<SKILL_DIR>"
python -m pip install -r "<SKILL_DIR>/requirements.txt"
python "<SKILL_DIR>/scripts/build_course.py" --course "<WORKSPACE>/courses/<course-id>/course.json"
```

需要 Node.js 20+、Python 3.10+、LibreOffice 和中文字体。Debian/Ubuntu 且有安装权限时可使用系统包 libreoffice-impress 和 fonts-noto-cjk；没有权限时使用宿主已有导出工具，或说明缺失项。不要自动要求用户购买 Office。预览字体可通过 COURSE_PPT_FONT 指定字体文件；幻灯片字体也需在渲染环境中可用。

Python 入口使用 LibreOffice 导出最终 PPTX，再由 PyMuPDF 渲染 PDF 页面并制作预览；Windows 已装 PowerPoint 时仍可使用 build-course.ps1。不同导出器可能导致换行变化，必须检查最终 PDF，不能沿用其他环境的视觉验收。

仅在用户明确接受暂不导出 PDF 时使用 --pptx-only。validation.json 会记录导出器、PDF 是否生成及待完成的视觉检查。缺少 LibreOffice 的默认调用失败，不把不完整输出标为完成。

首次使用建议提示：“使用 community-course-ppt，先检查运行环境和依赖，再阅读我上传的材料，与我确定课程主题和课时，制作可编辑 PPTX、PDF 和逐页讲稿。”

WorkBuddy 上传路径为“技能 → 添加技能 → 上传技能”。官方文档未在此说明具体账号网页沙箱的运行时与上传大小限制；须以实际界面和运行结果为准。导入若报错，保留准确错误用于定位，不能承诺未经实际测试的网页版兼容性。

为满足上传限制，网页包只含wps-16。不同课程需要其他模板时使用用户上传的PPTX并检查适配，不声称本包自带多套可轮换模板。本机安装仍保留完整模板库。
