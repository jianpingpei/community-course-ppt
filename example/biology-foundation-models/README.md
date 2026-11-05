# 生物大模型课程示例

这是community-course-ppt Skill的使用示例，用于查看成品效果、课程JSON、素材组织和来源记录。它不限定Skill的使用领域或新课程内容。

[查看课件与讲稿](output/预览目录.html) · [课程配置](course.json) · [设计方案](DESIGN.md) · [参考文献](sources.md)

《生物大模型：序列、蛋白质、细胞与跨模态》面向有AI基础的跨专业学生。四课时各24页，每节预计19分钟，提供PPTX、PDF、中文逐页讲稿与预览。

| 课时 | 内容 |
| --- | --- |
| 01 | DNA/RNA：NT、Evo 2、RiNALMo |
| 02 | 蛋白质：ESM3、AlphaFold 3 |
| 03 | 单细胞与空间：scGPT、Geneformer、Nicheformer |
| 04 | 跨模态与选型：LucaOne及研究案例 |

本示例采用独立设计的科学图谱式版面：深绿封面、暖白正文、原论文面板和可编辑科学图解。纯讲授，无内置模板依赖。资料来自外部研究综述与论文，未标注校徽、编制单位或课题号。预计时间来自教案预算。

素材在assets中，成品在output中。在工具仓库根目录运行以下命令可重建：

```powershell
./scripts/build-course.ps1 -CourseId biology-foundation-models
```

制作新课时，请安装Skill并到新课的材料仓库工作，不直接改写此示例。
