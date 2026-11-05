# SlideDSL 按需速查

这是用户提供文档的简要接口记录，不是通用React/HTML。仅在当前页使用相关组件时读取。本机无SlideP，语法仍须在目标版本验证。

|组件|使用约束|
|---|---|
|Slide|默认1280×720；最后表达式为Slide；不写import/export/hooks。课程要求每页notes，不能沿用通用工具默认无备注。|
|Box|Flex布局，默认column，border-box；不使用grid或calc。宽高、padding、border、gap先算总量，不能靠flex:1猜剩余高度。|
|Text|富文本用内部span，换行用br；不将普通HTML标签当受支持组件。字体和颜色取课程设计。|
|Image|本地相对路径，资源先存在；contain完整展示，cover可能裁切，科研图先看必要标签。|
|Chart|二维data第一行为表头，数值为number；指定高度。barDirection为bar或column。饼/圆环仅单系列。|
|Table|指定尺寸、defaultTextStyle与defaultCellStyle；行列数一致；保持原生可编辑，不拿截图代替数值表。|
|svg|指定width/height/viewBox并保持比例；用于结构图，不用几个形状冒充真实科研照片。|
|FAIcon|明确有效name、fill和尺寸；无fill可能不可见。课程不要求每页图标。|

Chart数据例：[['类别','模型A','模型B'],['任务1',10,20]]。趋势使用lineChart，比较barChart，面积areaChart，比例doughnutChart；不因组件支持bar3dChart就使用3D。相关性和不受支持的科学图优先原始数据图或独立可编辑图解。

组件支持不等于设计推荐：颜色渐变、阴影、动画等可用能力只在服务教学目标时使用。知识内容不按组件槽位硬塞。

SlideP输入为px，课程要求为实际pt；先做真实字号测试，检查输出PPTX的rPr/defRPr尺寸以及最终视觉。不要假定24px等于24pt。

## 最小页面语法

下面只说明语法，不是新课程的默认版式。最终表达式为Slide，讲稿取自当前教案。先用较充裕的像素字号做小样，再测量PPTX中的实际pt；若不达课程字号要求，调整字号与布局后重建。

```jsx
<Slide
  notes={`我们先确定输入对象，再解释编码如何把输入变成模型可用的表示。`}
  style={{ width: 1280, height: 720, padding: 64, background: '#FFFFFF', gap: 24 }}
>
  <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#182F42' }}>
    从输入对象到模型表示
  </Text>
  <Box style={{ flexDirection: 'column', gap: 24, height: 420 }}>
    <Text style={{ fontSize: 36, color: '#182F42' }}>
      先固定输入单位，再确定模型需要输出什么。
    </Text>
  </Box>
</Slide>
```

内联局部强调用`<span style={{fontWeight:'bold'}}>...</span>`，段内换行用`<br />`。表格和图片参与Box布局，明确可用高度；不要通过绝对定位越过安全区。

## 图、表与素材接口

```jsx
<Chart
  chartType='barChart'
  barDirection='bar'
  style={{ width: 1000, height: 360 }}
  colors={['#315B72', '#B26432']}
  showLegend={true}
  data={[
    ['任务', '方法A', '方法B'],
    ['任务1', 10, 12],
    ['任务2', 15, 13],
  ]}
/>
```

这里的数字只用于接口例子。实际课程必须替换为有来源、口径和单位的数据；不能当成论文实验结果。若轴标签字号无法满足讲授需求，先查当前引擎支持的设置，再决定保留原生图表或改用原数据重绘。

```jsx
<Table
  style={{ width: 1100, height: 300 }}
  defaultTextStyle={{ fontSize: 36, color: '#182F42', textAlign: 'left' }}
  defaultCellStyle={{ background: { color: '#F3F6F7' } }}
  cells={[
    ['对象', '输入', '输出'],
    ['序列任务', '序列片段', '类别或数值'],
  ]}
/>
```

单元格可用`{text:'内容', textStyle:{bold:true}, cellStyle:{...}}`覆盖样式。表格数据用cells，图表数据用data，不混淆两者。

```jsx
<Image src='assets/figure.png' style={{ width: 700, height: 390, objectFit: 'contain' }} />
<svg width={240} height={100} viewBox='0 0 240 100'>
  <path d='M20 50 L220 50' stroke='#315B72' strokeWidth='2' fill='none' />
</svg>
```

Image所引用文件必须先存在并核对。含科学坐标、图例或实验条件的图片，不直接用cover裁掉边缘。原生机制图与SVG按语义选用；不把所有科学关系都转换成箭头。
