# WorkBuddy 的 SlideP 路线

本说明根据用户提供的CLI、设计和组件文档独立整理，不包含腾讯内部包。不要假定公开npm可安装，不要求访问内部registry。实际版本、命令和服务以当前WorkBuddy环境为准。

## 能力与来源

SlideP使用受限JSX页源码。已提供的CLI文档说明：create/upsert-dsl/inspect连接editor_sdk，默认读取TENCENT_DOCS_LOCAL_MCP，否则使用localhost:39099；lint在本地进行布局检查。不自行给服务加未经文档确认的health或导出端点。

先检查slidep --version、slidep --help，按需要检查子命令帮助。构建入口用临时空白文件的实际create请求探测服务，成功后才选择此引擎。用户转述的包版本不写死。SlideP命令存在但服务不可用，不算可运行。

逐页源码默认在slides/<lesson-id>/<NN>.slide。每份课时的assets路径相对同一课程项目根。一次只准备当前页所需素材，打开核对后排版；本地文件名使用英文、数字、下划线。不要把网页URL、image://或待补图片放进可交付页面。

## 写入与检查

```sh
slidep create "<output.pptx>"
slidep upsert-dsl "<output.pptx>" --dsl-file "<page.slide>" --project-dir "<COURSE>" --strict-resources
slidep lint "<output.pptx>" --dsl-file "<page.slide>" --page-index 0 --project-dir "<COURSE>" --full-output "<temporary-diagnostics.json>"
```

每页先写入，再检查。新页省略page-index；修复已写入页时指定原下标（从0开始），不能追加成重复页。以实际返回slide_count核对顺序，不从文件名猜测文件内下标。strict-resources失败时页面可能已经写入且不完整；检查实际结果，修复后替换同一页，不能盲目重发追加。自动构建遇此情况停止，修复源码后整稿在新临时目录重建；不中途自动换引擎。

error必须修；warning要逐条确认，不以ok:true掩盖模板文字残留。诊断截断时读取指定文件的完整JSON。baseline豁免仅针对继承且未加重的原有问题，不代表输出可读。临时诊断不作为交付物；将尚需人工判断的项保存在validation.json摘要。

源码完成、修改后构建：

```sh
python "<SKILL_DIR>/scripts/build_course.py" --course "<COURSE>/course.json" --engine slidep
```

构建入口从course.json写讲稿和清单；Slide.notes需由作者写入.slide，最终结构检查核对备注。建议每页内容先看输入、关系和结果，再写自然讲稿，不固定使用元描述。

## 预览与最终检查

宿主有present_files时，可在创建后打开文件让用户看制作进度；工具缺失时使用宿主已有的文件交付方式，不伪造调用。用户预览与Agent验收是不同证据。

screenshot等能力先读实际--help。只有宿主确实返回逐页截图/视觉诊断时才记录对应证据；lint文档只承诺布局检查，不把它叫做完整视觉验收。优先使用宿主已有检查，不重复启动同等渲染；只有结构诊断时，仍需实际检查最终成品。不要照搬“禁止复检”而跳过科学图片、中文换行和整课节奏。

用户提供的CLI没有PDF导出参数。不得虚构slidep export-pdf。使用宿主实际可用的导出功能，或由公开的PowerPoint/LibreOffice导出器处理最终PPTX。不能导出则记录PDF未完成，不能声称完整交付。

## 当前验证边界

本机没有SlideP/editor_sdk。自动路由、命令参数、追加/替换及诊断处理可用受控模拟测试；这些测试不证明腾讯引擎输出。WorkBuddy真实验收按web-upload.md进行。
