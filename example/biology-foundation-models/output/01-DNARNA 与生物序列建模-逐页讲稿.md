# DNA/RNA 与生物序列建模

生物大模型：序列、蛋白质、细胞与跨模态

预计时长：19.0 分钟。实际试讲时长：未记录。

## 01 DNA/RNA 与生物序列建模

时间：0:00–0:20（20秒）

欢迎来到第一课。我们从两段只差一个碱基的DNA开始，逐步看清序列编码、预训练和任务输出。接着比较Nucleotide Transformer与Evo 2怎样学习序列，最后用一条RNA读懂配对表和二级结构。请带着一个问题听课：手里的数据经过模型以后，究竟变成了什么？

- [Wang et al. Large Language Models in Bioinformatics: A Survey. ACL Findings, 2025](https://aclanthology.org/2025.findings-acl.184/)

## 02 本课要回答的问题

时间：0:20–0:55（35秒）

这一课沿着输入、学习、输出三步展开。输入部分会把碱基和token分开，因为模型看到的单元取决于切分方式。学习部分用一次遮盖恢复和一次续写比较两种训练目标。输出部分回到具体的生物任务，我们会读一张配对表，再沿着计算过程解释精确率与召回率。

- [Wang et al. Large Language Models in Bioinformatics: A Survey. ACL Findings, 2025](https://aclanthology.org/2025.findings-acl.184/)

## 03 DNA、RNA 与蛋白质

时间：0:55–1:45（50秒）

先建立三个对象之间的关系。DNA可以转录为RNA，编码RNA中的密码子又可以翻译成氨基酸。许多RNA本身还会折叠并参与调控。建模时，首先要选定观察对象：DNA模型处理碱基上下文，RNA模型还常面对碱基配对，蛋白质模型则关心残基、三维构象和功能。

- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)

## 04 序列窗口决定模型能看到什么

时间：1:45–2:35（50秒）

把模型的视野想成一个窗口。只看一个字母时，我们知道它是A，却无法读到附近的调控模式；扩大到一段序列后，才能观察组合关系。窗口继续加长，模型就有机会利用更远的信息。输入长度的单位需要读清：有的按碱基计，有的按token计，换模型时要做一次单位换算。

- [Genome modelling and design across all domains of life with Evo 2. Nature, 2026](https://www.nature.com/articles/s41586-026-10176-5)

## 05 一次T→G替换怎样进入模型

时间：2:35–3:25（50秒）

看右侧两行序列，先找到第四位的T到G替换。最直接的计算是分别编码两条序列，再比较两个向量；另一种方法是比较模型给出的序列概率。若研究调控区域，就可以把表示接到表达或活性预测头。这个小例子把位置变化、模型计算和研究任务连接了起来。

- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)
- [Benchmarking DNA foundation models for genomic and genetic tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-65823-8)

## 06 序列如何变成 token

时间：3:25–4:15（50秒）

请从第一行读起。单碱基编码把六个字符变成六个token；以不重叠的三联体切分时，会得到ACG和TAC两个单元；六联体则把整段作为一个单元。token数量变少后，同样的token窗口可以覆盖更长的DNA，但每个单元的粒度也会改变。阅读模型时要同时看切分规则与上下文长度。

- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)
- [Penić et al. RiNALMo: general-purpose RNA language models can generalize well on structure prediction tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-60872-5)

## 07 token怎样变成上下文向量

时间：4:15–5:05（50秒）

token编号本身只是离散索引，模型首先通过嵌入表把它转成向量。随后，编码器根据可见上下文更新每个位置。相同的ACG出现在不同片段中，更新后的向量可能不同。模型输出可以保留整排位置向量，也可以进一步聚合成一个向量，分别服务于位置级和序列级任务。

- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)

## 08 掩码预训练学到什么

时间：5:05–5:55（50秒）

原始序列是ACGTAC，现在把第三位G遮住。训练过程中，模型只能根据可见的A、C、T、A、C来预测这一位。训练标签直接来自原序列，因此大量未人工标注的DNA也能提供学习信号。反复完成恢复任务，会推动表示捕捉局部模式和跨位置关系。下一页把这一步写成训练目标。

- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)
- [Penić et al. RiNALMo: general-purpose RNA language models can generalize well on structure prediction tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-60872-5)

## 09 一次掩码训练怎样产生学习信号

时间：5:55–6:45（50秒）

看原图左侧的输入、切分和遮盖步骤。DNA首先转成token，部分token再被替换成MASK。图中的编码器读取可见上下文，语言模型头根据位置表示恢复目标token。原始序列提供监督目标，因此大量序列可以形成自监督训练数据。图中显示的是token级流程，具体token覆盖几个碱基由分词方式决定。

- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)

## 10 Nucleotide Transformer

时间：6:45–7:35（50秒）

Nucleotide Transformer把基因组片段作为预训练材料，核心做法与刚才的掩码恢复一致。训练结束后，同一个碱基片段会因为周围序列不同而得到不同的表示。原论文把这些表示用于多种基因组预测任务。我们可以把它理解为先学一套通用的序列特征，再针对目标任务训练读出方式。

- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)

## 11 NT的表示可以接到哪些任务

时间：7:35–8:25（50秒）

原论文把NT用于多种基因组任务。这一页选三个容易理解的输出：启动子识别回答区域类别，调控预测回答某类活性或状态，剪接位点任务回答特定位置的标签。它们共用序列表示，但监督信号的组织方式不同。请特别看最后一列，任务头需要输出整段标签还是逐位置标签。

- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)

## 12 从表示到一个任务

时间：8:25–9:15（50秒）

现在把编码器接到一个任务上。若标签是启动子或非启动子，就训练分类头；若标签是调控活性，就训练回归头。冻结编码器能快速检验已有表示是否好用，微调则让表示进一步适应任务。请注意图中的任务头：它把通用表示转成我们真正需要的生物学输出。

- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)

## 13 Evo 2 的建模方向

时间：9:15–10:05（50秒）

与遮盖后同时观察两侧上下文不同，生成式序列建模沿着序列逐步预测下一个位置。Evo 2展示了这条路线在基因组上的扩展。给定一段前缀，模型输出下一个碱基的分布；采样一个碱基并拼回输入，就能继续生成。已有序列也可以沿同样的步骤计算概率或任务相关评分。

- [Genome modelling and design across all domains of life with Evo 2. Nature, 2026](https://www.nature.com/articles/s41586-026-10176-5)

## 14 序列概率把局部预测连接起来

时间：10:05–10:55（50秒）

这个乘积把整条序列的概率拆成一串条件概率。生成时，模型在每一步预测下一位，并把选中的碱基交给下一步。评分时则沿着已经给定的序列读取概率，通常累积对数概率以方便计算。两种用法共享同一分解方式，只是生成要选择新字符，评分要评价已有字符。

- [Genome modelling and design across all domains of life with Evo 2. Nature, 2026](https://www.nature.com/articles/s41586-026-10176-5)

## 15 两类预训练任务

时间：10:55–11:45（50秒）

比较两种模型时，先对齐正在做的任务。Nucleotide Transformer这一页突出掩码恢复和表示迁移，Evo 2这一页突出生成式序列建模。若需要一个分类器，就看表示怎样接到分类头；若需要序列续写，就看生成接口、上下文范围和采样方式。模型名字只是入口，训练目标决定了后续怎么使用它。

- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)
- [Genome modelling and design across all domains of life with Evo 2. Nature, 2026](https://www.nature.com/articles/s41586-026-10176-5)

## 16 RNA任务把序列连接到配对关系

时间：11:45–12:35（50秒）

RNA让我们看到另一种输出：除了给整条序列一个标签，还可以回答哪两个位置互相配对。两个配对位置在一维序列上可能相隔很远，因此上下文表示需要捕捉远距离关联。RiNALMo学习的是RNA表示，二级结构任务再把表示转成位置之间的配对关系。接着我们用九个核苷酸案例读这种关系。

- [Penić et al. RiNALMo: general-purpose RNA language models can generalize well on structure prediction tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-60872-5)

## 17 读懂一条RNA的茎与环

时间：12:35–13:25（50秒）

先从左到右给这条RNA编号：A是一号，G是二号，最后一个U是九号。把一号A与九号U连起来，再连接二号G和八号C、三号C和七号G，就得到三层配对。中间四到六号的三个A形成未配对的环区。图中的骨架线按一到九连接，横向连接则表示碱基配对。

- [Penić et al. RiNALMo: general-purpose RNA language models can generalize well on structure prediction tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-60872-5)

## 18 配对表与括号串怎样对应

时间：13:25–14:15（50秒）

继续使用刚才这条RNA。一到九、二到八、三到七构成三对，所以前三位写左括号，后三位写右括号。四到六没有配对，分别写一个点，得到三个左括号、三个点、三个右括号。配对表适合检查具体位置，括号串适合与原序列逐位对齐。

- [Penić et al. RiNALMo: general-purpose RNA language models can generalize well on structure prediction tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-60872-5)

## 19 把位置配对写成二维矩阵

时间：14:15–15:05（50秒）

如果输出头要为每对位置打分，就可以把配对关系排成矩阵。这里只取一到三号作为行、七到九号作为列。第一行对应一到九，第二行对应二到八，第三行对应三到七。因此三个一落在反向对角线上。模型也可以在这些格子里输出连续概率，再通过结构解码得到最终位置对。

- [Penić et al. RiNALMo: general-purpose RNA language models can generalize well on structure prediction tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-60872-5)

## 20 让测试集对应新的序列家族

时间：15:05–15:55（50秒）

生物序列存在大量相似成员。设计测试集时，可以按序列相似性或家族来分组，让测试对应新家族或新序列的目标。接着在同一划分上比较不同方法。这样读到的差异才会对应明确的应用场景。RNA结构尤其适合按家族看结果，因为同一家族往往共享结构模式。

- [Benchmarking DNA foundation models for genomic and genetic tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-65823-8)
- [Penić et al. RiNALMo: general-purpose RNA language models can generalize well on structure prediction tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-60872-5)

## 21 配对预测的精确率与召回率

时间：15:55–16:45（50秒）

正确配对2组，预测配对3组，参考配对3组。精确率关心预测中有多少正确，召回率关心参考中找回多少。这一例两者都是三分之二。F1把精确率和召回率合并，便于用一个量概括配对恢复情况。读结构评价时，要同时看预测集合与参考集合。

- [Penić et al. RiNALMo: general-purpose RNA language models can generalize well on structure prediction tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-60872-5)

## 22 RiNALMo的下游任务

时间：16:45–17:50（65秒）

这张图并列展示二级结构与RNA分类两类任务。二级结构任务使用位置级表示，预测位置对关系。RNA分类汇聚整条序列的表示，输出类别。另一些任务输出与表达或翻译相关的数值。共享的是RNA编码器，变化的是任务头和标签。

- [Penić et al. RiNALMo: general-purpose RNA language models can generalize well on structure prediction tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-60872-5)

## 23 本课小结

时间：17:50–18:40（50秒）

回顾开头的T到G替换，现在我们能够分别描述输入怎样变、模型计算什么，以及研究任务读取什么输出。DNA与RNA共享序列学习的思路，也各自有重要的任务特点。接下来进入蛋白质世界，看看序列表示怎样与三维结构、功能注释和生成设计结合。

- [Wang et al. Large Language Models in Bioinformatics: A Survey. ACL Findings, 2025](https://aclanthology.org/2025.findings-acl.184/)
- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)
- [Genome modelling and design across all domains of life with Evo 2. Nature, 2026](https://www.nature.com/articles/s41586-026-10176-5)
- [Penić et al. RiNALMo: general-purpose RNA language models can generalize well on structure prediction tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-60872-5)

## 24 延伸阅读

时间：18:40–19:00（20秒）

本课的三篇重点阅读分别对应NT、Evo 2和RiNALMo。建议先阅读每篇论文的模型总图，找出输入、训练目标和输出，再看一个与自己研究问题接近的实验。综述用于建立整体分类，原始论文用于理解具体模型。

- [Wang et al. Large Language Models in Bioinformatics: A Survey. ACL Findings, 2025](https://aclanthology.org/2025.findings-acl.184/)
- [Dalla-Torre et al. Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods, 2025](https://www.nature.com/articles/s41592-024-02523-z)
- [Genome modelling and design across all domains of life with Evo 2. Nature, 2026](https://www.nature.com/articles/s41586-026-10176-5)
- [Penić et al. RiNALMo: general-purpose RNA language models can generalize well on structure prediction tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-60872-5)
- [Benchmarking DNA foundation models for genomic and genetic tasks. Nature Communications, 2025](https://www.nature.com/articles/s41467-025-65823-8)
