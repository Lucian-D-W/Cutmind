# 脑闸（Cutmind）产品设计与开发需求梳理

更新日期：2026-05-23

本文是从当前代码、README、历史计划和调试报告倒推出来的产品/开发说明。它描述的是当前项目已经形成的产品逻辑，不是全新的规划案。

主要依据：

- `README.md`
- `src/types.ts`
- `src/App.tsx`
- `src/stores/*`
- `src/components/TaskBox/*`
- `src/components/IdeaBox/*`
- `src/components/Calendar/*`
- `src/components/Settings/SettingsPanel.tsx`
- `src/platform/runtime/*`
- `src-tauri/src/*`
- `docs/plans/*`
- `docs/reports/*`

GitNexus 状态：`npx gitnexus status` 显示当前索引已存在且与当前提交一致。

## 1. 产品定位

Cutmind，是一个为执行功能容易过载的人设计的桌面工作台。它不是传统项目管理工具，也不是普通待办清单，而是把“想法捕获、任务拆解、专注计时、休息闸门、日历回看、日志导出”放进同一套轻量桌面流里。

一句话定位：

> 用多个轻量浮动盒子，把脑内混乱的想法和任务变成可执行、可休息、可回看的日常工作流。

核心用户不是想维护复杂项目结构的人，而是这些人：

- 开始执行前容易过载，需要一个很低摩擦的入口。
- 想法很多，但需要快速把其中一段转成实际任务。
- 喜欢便签式、浮窗式、靠近桌面当前上下文的工具。
- 需要计时和休息约束，但不希望工具像番茄钟一样只记录一轮一轮的机械时间。
- 希望一天结束后能从任务数据生成 Markdown 日志。

## 2. 设计逻辑

Cutmind的设计中心不是“管理所有任务”，而是“降低下一步行动的心理阻力”。当前代码体现出几条很明确的产品判断。

### 2.1 任务是可执行对象，不只是列表项

`Task` 同时包含标题、正文、颜色、标签、计时、状态、专注记录、窗口状态和样式配置。这说明任务被设计成一个可独立打开、可悬浮、可计时、可继续推进的工作对象。

任务在产品里有两个主要形态：

- `TaskBox`：小型执行窗口，用于当下工作。
- `Calendar / TaskDetailModal`：日历上的时间块和详情面板，用于安排、回看和编辑。

### 2.2 想法先低摩擦捕获，再按需转任务

`IdeaBox` 是独立的便签窗口，不要求马上变成任务。它支持富文本、背景样式、标题、隐藏/显示、托盘管理，以及“选中文字创建任务”。

这代表一个明确分层：

- 想法可以先存在，不必立刻结构化。
- 只有当用户从想法中选中一段内容时，才进入任务系统。
- IdeaBox 的隐藏不是删除，而是从屏幕上暂时收起来。

### 2.3 计时结束不是完成，而是分流点

历史计划和当前代码都明确：计时结束后不直接把任务标记为完成，而是进入下一步选择。

倒计时结束后有四种分流：

1. 继续这个任务。
2. 继续这个任务，并改标题。
3. 开一个全新任务。
4. 结束任务。

这个逻辑很重要：任务完成必须来自显式“结束任务”，而不是来自计时器自然归零。计时器只是推动用户做下一步决策。

### 2.4 休息是闸门，不是提示

`RestModal` 不只是显示“休息一下”。它要求用户先规划下一步内容和休息时间，然后进入休息倒计时。休息结束前按钮不可用。

这背后的产品逻辑是：

- 在休息前先把“接下来干什么”写下来，减少休息后重新启动的成本。
- 根据任务时长设置最短休息时间，避免短路休息。
- 休息结束后才允许继续当前任务或打开新任务。

### 2.5 日历是任务时间化后的第二工作台

日历不是简单记录页，而是一个可编辑任务时间结构的地方。

- 月视图：按日期快速定位任务。
- 周视图：按时间轴展示任务块，支持拖动和调整时长。
- 任务详情：集中编辑标题、颜色、标签、时长、笔记和专注历史。
- 日志按钮：把某一天的任务导出为 Markdown 文件。

因此，产品的第二工作台是“时间化任务视图”，而不是项目列表。

### 2.6 多窗口体验优先于单页应用体验

项目使用 Tauri 多窗口模型。Calendar、TaskBox、IdeaBox、Settings 都通过同一个 React 入口，用 URL 参数决定视图：

- `/?view=calendar`
- `/?view=task&id=...`
- `/?view=idea&id=...`
- `/?view=settings`

这让用户可以同时打开多个执行对象。TaskBox 和 IdeaBox 是无边框、透明、可置顶、跳过任务栏的浮动窗口；Calendar 和 Settings 是常规窗口。

### 2.7 科学原则与文献依据

这些原则不是把产品包装成医疗工具，而是解释为什么Cutmind要用“开闸/关闸、下一步记录、休息闸门、低摩擦浮窗、日历时间块”这些设计。它们只能支持产品设计方向，不能替代睡眠医学、心理治疗或临床建议。

#### 原则 1：任务切换需要明确的关闸动作

产品含义：

- TaskBox 计时结束后不应直接关闭或完成，而应要求用户写下“做到哪了/下一步是什么”。
- RestModal 的下一步草稿、休息前规划、任务详情里的专注记录，都是为了让任务 A 有一个心理收束点，再切到休息或任务 B。
- IdeaBox 转 TaskBox 时，也应该尽量让意图被明确命名，而不是只留下模糊想法。

文献依据：

- Leroy 的 attention residue 研究表明，从一个未完成任务切到另一个任务时，注意力会残留在前一个任务上，并损害后续任务表现。见 Sophie Leroy, 2009, "Why is it so hard to do my work? The challenge of attention residue when switching between work tasks", *Organizational Behavior and Human Decision Processes*, 109(2), 168-181. https://doi.org/10.1016/j.obhdp.2009.04.002
- Ariga 和 Lleras 的持续注意研究表明，短暂、稀少的心理休息可以通过目标的停用和重新激活，减少 vigilance decrement。见 Atsunori Ariga & Alejandro Lleras, 2011, "Brief and rare mental breaks keep you focused: Deactivation and reactivation of task goals preempt vigilance decrements", *Cognition*, 118(3), 439-443. https://doi.org/10.1016/j.cognition.2010.12.007

#### 原则 2：intending 可以被实现为可重复的注意力控制流程

产品含义：

- “intending”不必依赖神秘状态，可以被设计成一个短流程：写意图、给注意力落点、启动计时。
- TaskBox 的标题、正文、倒计时和开始按钮共同构成“开闸”。
- 计时结束后的下一步记录和窗口/休息切换共同构成“关闸”。

文献依据：

- Hasenkamp 等人在专注冥想研究中把注意波动拆成 mind wandering、awareness、shifting attention、sustained attention 等阶段，这和“觉察偏离 - 拉回 - 稳住”的 intending 训练很接近。见 Wendy Hasenkamp et al., 2012, "Mind wandering and attention during focused meditation: A fine-grained temporal analysis of fluctuating cognitive states", *NeuroImage*, 59(1), 750-760. https://doi.org/10.1016/j.neuroimage.2011.07.008
- Jha、Krompinger 和 Baime 的研究支持正念训练可能改善注意力子系统。见 Amishi P. Jha, Jason Krompinger & Michael J. Baime, 2007, "Mindfulness training modifies subsystems of attention", *Cognitive, Affective, & Behavioral Neuroscience*, 7, 109-119. https://doi.org/10.3758/CABN.7.2.109

#### 原则 3：明确的 if-then 计划比模糊意愿更容易执行

产品含义：

- “我要专注”太模糊，产品应引导用户写成更具体的启动承诺：接下来多少分钟，只做什么。
- “结束后写下一步”要变成流程要求，而不是依靠用户记得复盘。
- 快捷键、托盘、新建 TaskBox 的低摩擦入口，是为了让行动触发尽量具体、可重复。

文献依据：

- Gollwitzer 的 implementation intentions 研究说明，把目标落实为具体的 if-then 计划，可以显著提高目标执行概率。见 Peter M. Gollwitzer, 1999, "Implementation intentions: Strong effects of simple plans", *American Psychologist*, 54(7), 493-503. https://doi.org/10.1037/0003-066X.54.7.493

#### 原则 4：休息应当服务于重新进入，而不只是暂停

产品含义：

- RestModal 不只是倒计时休息，而是要求用户在休息前写好下一步，避免休息结束后重新寻找方向。
- 休息倒计时结束前不能继续，是为了让“中断 - 恢复”成为真实结构，而不是一个可以立刻跳过的提示。
- 休息长度不必追求医学精确，但应跟任务时长和用户状态有关系。

文献依据：

- Albulescu 等人的 micro-breaks 系统综述和元分析支持短休息对提升精力、降低疲劳有总体帮助，绩效收益则依赖任务类型和休息方式。见 Patricia Albulescu et al., 2022, "'Give me a break!' A systematic review and meta-analysis on the efficacy of micro-breaks for increasing well-being and performance", *PLOS ONE*, 17(8), e0272460. https://doi.org/10.1371/journal.pone.0272460
- Ariga 和 Lleras 的研究也支持“短暂退出任务目标再重新激活”能帮助长时间专注任务维持表现。https://doi.org/10.1016/j.cognition.2010.12.007

#### 原则 5：睡眠、光照和执行功能会形成行为回路

产品含义：

- 产品不能假设用户每天都有稳定意志力，因此需要最低摩擦入口、显式下一步、可恢复流程。
- 如果后续增加“晨间启动”或“夜间收尾”功能，应该尊重昼夜节律和睡眠卫生，而不是鼓励夜间强刺激。
- 设置里的提醒声、亮色主题、透明浮窗等设计要避免把晚上工作变成更强刺激。

文献依据：

- 美国内科医师学会建议慢性失眠成人优先接受 CBT-I，并指出其中包含刺激控制、睡眠限制等行为干预。见 ACP, 2016, "ACP recommends cognitive behavioral therapy as initial treatment for chronic insomnia". https://www.acponline.org/acp-newsroom/acp-recommends-cognitive-behavioral-therapy-as-initial-treatment-for-chronic-insomnia
- Brown 等人的专家共识建议白天提高眼部 melanopic EDI，睡前 3 小时尽量降低，睡眠环境尽可能暗。见 Timothy M. Brown et al., 2022, "Recommendations for daytime, evening, and nighttime indoor light exposure to best support physiology, sleep, and wakefulness in healthy adults", *PLOS Biology*, 20(3), e3001571. https://doi.org/10.1371/journal.pbio.3001571
- Phillips 等人的研究显示，人类晚间光反应存在高敏感性和巨大个体差异，典型室内照度也可能影响褪黑素抑制。见 Andrew J. K. Phillips et al., 2019, "High sensitivity and interindividual variability in the response of the human circadian system to evening light", *PNAS*, 116(24), 12019-12024. https://doi.org/10.1073/pnas.1901824116
- Khalsa 等人的人体光照相位反应曲线研究支持光照对昼夜节律相位的影响取决于时间点。见 Sat Bir S. Khalsa et al., 2003, "A phase response curve to single bright light pulses in human subjects", *The Journal of Physiology*, 549(3), 945-952. https://doi.org/10.1113/jphysiol.2003.040477

#### 原则 6：光照相关设计要区分“提醒/觉醒”和“节律治疗”

产品含义：

- Cutmind可以提醒用户晨间光照、夜间少光，但不应把自己设计成光照疗法工具。
- 如果未来加入光照 SOP、lux 记录或晨间启动模块，要明确：手机 lux app 只能做相对比较，不应当作为精密剂量计。
- 文案中要避免把“几十 lux 可能抑制褪黑素”误写成“几十 lux 必然移动生物钟”。褪黑素抑制、主观清醒和节律相位移动是相关但不同的指标。

文献依据：

- Brown 等人的共识文献使用 melanopic EDI 来描述更贴近非视觉光反应的剂量，并给出日间、晚间和睡眠环境建议。https://doi.org/10.1371/journal.pbio.3001571
- Phillips 等人的晚间光剂量反应研究支持“个体差异很大”的限定。https://doi.org/10.1073/pnas.1901824116

## 3. 当前功能需求

### 3.1 Calendar 主窗口

主窗口默认是日历。它承担总览、创建任务、打开任务详情、导出日志和接收托盘动作的职责。

必须支持：

- 默认显示当前月份。
- 支持切换月视图和周视图。
- 支持回到今天。
- 月视图中按任务开始日期显示任务块。
- 月视图中双击日期或右键日期可以创建任务。
- 周视图中按开始时间和持续时长显示任务块。
- 周视图中任务块可拖动到新的日期/时间。
- 周视图中任务块顶部/底部可拖动调整开始或结束时间。
- 右键任务可打开详情、打开 TaskBox、删除任务。
- 点击任务打开详情弹窗。
- 日历主题跟随设置切换。
- 日历窗口运行时定时同步每日 Markdown 日志。

当前设计注意点：

- 任务归属日期来自 `getTaskStart(task)`，优先使用 `startTime`、`focusRecords`，再回退到 `createdAt`。
- 周视图渲染的是任务整体时间跨度，不逐条渲染每段专注记录。
- 任务重叠时用 lane 布局压缩到同一日列中。

### 3.2 TaskBox 执行窗口

TaskBox 是Cutmind最核心的执行界面。它不是普通编辑框，而是“正在处理的任务单元”。

必须支持：

- 独立浮动窗口。
- 默认置顶，可切换置顶状态。
- 透明/玻璃感背景，背景色和透明度可调。
- 标题编辑。
- Markdown 正文编辑与预览，点击正文进入编辑。
- 标题和正文可分别设置字体、字号、颜色。
- 标签编辑。
- 计时时长预设：20、30、45、60、90 分钟。
- 自定义计时时长。
- 开始、暂停。
- 重置按钮可通过右键菜单显示或隐藏。
- 关闭窗口前刷新未落盘的保存。
- 窗口标题跟随任务标题变化。

计时规则：

- 开始计时时，写入或延续当前任务的 `focusRecords`。
- 暂停计时时，关闭当前专注记录。
- 计时归零时，任务进入 `isPlanningNextTask`，不进入完成态。
- 归零时触发声音循环和系统通知。

任务完成规则：

- 只有选择“结束任务”才标记 `isCompleted = true`。
- 完成时写入 `completedAt`，停止计时和休息流程，并关闭当前 TaskBox。
- 继续当前任务、改标题继续、进入休息、暂停计时、关闭窗口都不等于完成。

### 3.3 RestModal 下一步和休息闸门

RestModal 管理“专注结束后到重新开始前”的全部决策。

必须支持：

- 计时结束后显示四选一分流。
- 继续当前任务时保留任务 ID 和标题。
- 改标题继续时保留任务 ID，但更新标题。
- 开全新任务时创建新任务，打开新 TaskBox，并关闭当前窗口。
- 结束任务时标记完成并关闭当前窗口。
- 除“结束任务”外，进入休息前必须填写下一步正文。
- 继续当前任务或改标题继续时，下一步正文追加到现有正文末尾。
- 休息时间不能低于按任务时长计算出的最低值。
- 休息倒计时结束前不能继续。
- 休息结束后触发声音循环和系统通知。

最短休息规则：

- 少于 20 分钟：最短 0 分钟。
- 20 到 49 分钟：最短 5 分钟。
- 50 分钟及以上：最短 10 分钟。

### 3.4 IdeaBox 想法窗口

IdeaBox 是低摩擦捕获层。它应该像便签一样轻，但能把内容转入任务流。

必须支持：

- 独立浮动窗口。
- 默认置顶，可切换置顶状态。
- 透明/玻璃感背景，背景色和透明度可调。
- 标题显示和双击编辑。
- 富文本正文编辑。
- 选区工具栏：字号、字体、文字颜色、加粗、斜体。
- 从选中文字创建任务。
- 没有选中文字时，也可从当前想法创建任务。
- 隐藏当前想法窗口但保留数据。
- 删除当前想法。
- 显示所有想法、隐藏所有想法。
- 在标题右键菜单中列出所有未删除想法并切换显示状态。
- 关闭/隐藏时保存窗口位置和大小。

当前实现上，IdeaBox 对启动稳定性很敏感。代码中明确避免在模块顶层导入 `useTaskStore`、`uuid`、WebviewWindow 等依赖，而是在回调中动态导入，防止便签窗口黑屏。

### 3.5 Settings 设置窗口

Settings 是工作区级设置，不是某个任务的属性页。

当前必须支持：

- 界面语言：中文、英文。
- 默认专注时长。
- 默认休息时长。
- 提醒声音静音。
- 提醒重复间隔。
- 提醒音量。
- 提醒音色：soft、bright、chime。
- 默认透明度。
- 日历主题：暖日、暗夜、莫兰迪、敦煌、大地。
- 每周起始日：周一或周日。
- 每日日志文件夹选择和清空。
- 全部任务导出格式：JSONL、JSON、Markdown。
- 全部任务导出。
- 快捷键编辑、校验、应用、恢复默认。
- 浏览器调试环境下提示桌面专属能力不可用。

注意：

- `AppSettings` 中存在 `windowCloseBehavior` 字段和相关底层逻辑，但当前 SettingsPanel 没有展示对应设置行，主组件也没有明显接入该 hook。后续需要决定是恢复这个能力，还是从产品面移除。

### 3.6 系统托盘和快捷键

桌面端通过 Tauri 托盘和全局快捷键提供快速入口。

托盘必须支持：

- 打开/隐藏日历。
- 新建任务盒子。
- 新建想法盒子。
- 显示所有想法盒子。
- 隐藏所有想法盒子。
- 按标题列出已有想法。
- 打开首选项。
- 退出应用。
- 托盘文案随语言切换。

默认快捷键：

- 新建任务：`Ctrl+Shift+T`
- 新建想法：`Ctrl+Shift+I`
- 打开日历：`Ctrl+Alt+C`

快捷键规则：

- 组合键必须非空。
- 每个组合键至少包含一个修饰键。
- 三个快捷键不能重复。
- 一些 WebView/系统常见拦截组合会被前端阻止录入。
- 更新快捷键失败时后端回滚到上一组快捷键。

## 4. 数据模型

### 4.1 Task

任务是当前产品最重要的实体。字段可以按职责分为几组。

内容字段：

- `id`
- `title`
- `body`
- `tags`

视觉字段：

- `color`
- `opacity`
- `isPinned`
- `showResetButton`
- `titleFontSize`
- `titleFontFamily`
- `titleFontColor`
- `bodyFontSize`
- `bodyFontFamily`
- `bodyFontColor`
- `fontColor`
- `windowState`

计时和生命周期字段：

- `timerMinutes`
- `elapsedSeconds`
- `isRunning`
- `isCompleted`
- `isPlanningNextTask`
- `isResting`
- `restSeconds`
- `nextTaskDraft`
- `nextStepMode`
- `focusRecords`
- `startTime`
- `endTime`
- `createdAt`
- `completedAt`

设计语义：

- `focusRecords` 记录真实专注区间。
- `startTime` 和 `endTime` 仍保留，用于兼容和日历展示。
- `getTaskStart` 和 `getTaskEnd` 会从多种字段推导任务整体时间。
- `isCompleted` 只代表任务整体完成。

### 4.2 IdeaBox

想法实体是轻量捕获对象。

字段：

- `id`
- `title`
- `body`
- `color`
- `opacity`
- `fontSize`
- `fontFamily`
- `fontColor`
- `isVisible`
- `isPinned`
- `createdAt`
- `windowState`

设计语义：

- `isVisible` 是托盘和窗口管理状态，不是删除状态。
- `windowState` 用于下一次打开时恢复位置和尺寸。
- 标题和可见性变化会立即持久化并同步托盘菜单。

### 4.3 AppSettings

设置实体负责工作区级偏好。

字段：

- `language`
- `defaultTimerMinutes`
- `defaultRestMinutes`
- `alertMuted`
- `alertRepeatSeconds`
- `alertVolume`
- `alertTone`
- `defaultColor`
- `defaultOpacity`
- `lastIdeaStyle`
- `lastTaskStyle`
- `calendarStartDay`
- `calendarTheme`
- `exportFormat`
- `dailyJournalFolder`
- `windowCloseBehavior`
- `shortcuts`

设计语义：

- `lastIdeaStyle` 和 `lastTaskStyle` 让新窗口沿用最近风格，降低重复设置成本。
- `dailyJournalFolder` 与 `exportFormat` 分离，因为每日 Markdown 日志和全部任务导出是两个功能。
- 设置文件加载时会做合并、迁移和合法化，保证旧数据不崩。

## 5. 关键用户流程

### 5.1 从空白开始一天

1. 用户打开应用。
2. 默认进入 Calendar。
3. 用户可以通过托盘或快捷键新建 TaskBox 或 IdeaBox。
4. 当前要做的事进入 TaskBox，不确定的内容进入 IdeaBox。

### 5.2 从想法到任务

1. 用户在 IdeaBox 里记录想法。
2. 用户选中一段文字。
3. 右键或工具栏点击创建任务。
4. 应用创建 Task，标题来自选区或想法标题。
5. 打开新的 TaskBox。

### 5.3 专注到下一步

1. 用户在 TaskBox 设置时长。
2. 点击开始。
3. 任务写入专注开始记录。
4. 用户暂停时关闭当前专注记录。
5. 用户完成一段专注后进入四选一分流。
6. 用户填写下一步并休息。
7. 休息结束后继续原任务、改标题继续、打开新任务，或显式结束任务。

### 5.4 日历安排和回看

1. 用户在月视图查看某天有哪些任务。
2. 用户在周视图按时间线查看任务块。
3. 用户拖动任务块调整开始时间。
4. 用户拖动任务块边缘调整时长。
5. 用户点击任务打开详情。
6. 用户在详情里修改笔记、标签、颜色和时长。

### 5.5 每日日志

1. 用户在 Settings 设置 Markdown 文件夹。
2. Calendar 运行时会根据当前任务数据同步每日文件。
3. 用户也可以在 Calendar 顶部打开日志面板，选择日期并手动导出。
4. 输出文件名为 `YYYY-MM-DD.md`。
5. 当前实现允许空日期导出空文件，用来验证路径和写入链路。
6. 每个任务在日志中以 H1 标题开头，正文中的 Markdown 标题会自动降一级，避免破坏日志结构。

### 5.6 全部任务导出

1. 用户在 Settings 选择导出格式。
2. 点击导出全部任务。
3. 系统弹出保存文件对话框。
4. 写入 JSONL、JSON 或 Markdown。
5. 成功或失败通过设置页状态和全局反馈提示展示。

## 6. 架构说明

### 6.1 前端结构

前端是 React 19 + TypeScript + Zustand + Vite。

核心模式：

- 单入口：`src/main.tsx` 渲染 `App`。
- URL 路由：`useWindowView()` 读取 `view` 和 `id`。
- 按视图渲染：TaskBox、IdeaBox、Calendar、SettingsPanel。
- 状态层：任务、想法、设置、反馈分别用 Zustand store。

### 6.2 桌面端结构

桌面端是 Tauri 2。

主要职责：

- 创建和管理多窗口。
- 托盘菜单。
- 全局快捷键。
- 单实例行为。
- JSON 文件读写。
- 每日 Markdown 文件写入。
- 字体列表和字体数据加载。
- 通知插件、文件系统插件、对话框插件。

应用在所有窗口关闭后不会退出进程，因为托盘需要继续工作。

### 6.3 Runtime Boundary

项目已经把 Tauri 能力隔离进 `src/platform/runtime/`。

设计要求：

- React 组件不直接依赖 Tauri 原生 API。
- 组件通过 `RuntimeBridge` 调用窗口、文件、对话框、后端命令、事件监听。
- 浏览器调试环境下返回明确的不可用结果，而不是卡住或黑屏。
- Tauri API 采用动态导入，避免模块求值阶段触发运行时错误。
- 每个能力调用会写入 runtime monitor，便于追踪慢调用和失败。

### 6.4 持久化和同步

后端 JSON 文件：

- `tasks.json`
- `ideas.json`
- `settings.json`

写入机制：

- `taskStore` 和 `ideaStore` 对普通编辑做 300ms debounce。
- 删除、创建、托盘敏感字段会立即保存。
- Rust 写 JSON 时先写临时文件，再 rename，减少半写入风险。
- JSON 读失败时返回默认值；解析失败时备份为 `.json.bak`。

多窗口同步：

- 后端保存后广播 `store-updated`。
- 前端 App 监听该事件并 reload 对应 store。
- `markLocalStoreWrite` 和 `shouldIgnoreStoreEcho` 用于避免本窗口保存后又马上处理自己的广播。
- 历史报告显示这里曾出现过广播风暴，因此后续改动要格外小心。

## 7. 体验原则

### 7.1 小窗口优先

TaskBox 和 IdeaBox 要保持轻、快、可漂浮。它们不是完整页面，也不应该堆太多解释性文字。

### 7.2 不打断用户，但给明确反馈

关键动作需要有成功/失败提示：

- 打开 TaskBox。
- 打开 IdeaBox。
- 显示/隐藏想法。
- 选择日志文件夹。
- 导出日志。
- 导出全部任务。
- 打开设置。

反馈应说明动作结果和目标对象，不只说“成功”。

### 7.3 允许未完成和半结构化

产品不强迫用户把所有东西整理成标准项目。IdeaBox 可以只是想法；TaskBox 可以暂停；任务可以多次继续；只有显式结束才算完成。

### 7.4 桌面能力要有浏览器降级

浏览器调试页面可以查看内容，但选择文件夹、写文件、窗口置顶、创建桌面窗口等能力必须提示需要桌面运行时。

## 8. 已知边界和风险

### 8.1 多窗口同步风险

任务、想法、设置都会被多个窗口读写。任何改动 `store-updated`、保存 debounce、reload 逻辑的代码，都可能引入重复写盘、反馈环或性能问题。

开发要求：

- 修改保存/同步逻辑前先看 GitNexus 影响分析。
- 优先跑相关 store、App 监听、runtime bridge 测试。
- 手动验证至少两个窗口同时打开时的行为。

### 8.2 设置项与 UI 不完全一致

`windowCloseBehavior` 仍在类型和底层逻辑中，但 SettingsPanel 当前没有展示。后续需要一次产品决策：

- 恢复设置入口并在窗口组件中接入。
- 或删除这个字段和相关死代码，降低维护成本。

### 8.3 日志导出行为与早期计划不完全一致

早期计划提到空日期不创建文件；当前代码和文案倾向于允许空文件导出，以检查路径和写入链路。后续不要只看旧计划，要以当前代码和产品文案为准。

### 8.4 IdeaBox 启动链路敏感

IdeaBox 明确避免顶层导入某些依赖。后续在 IdeaBox 增功能时，优先保持动态导入策略，避免重新引入黑屏问题。

### 8.5 本地优先，没有账号和云同步

当前产品是本地桌面应用。没有账号系统、云同步、多人协作、远端数据库。开发上不要默认引入服务端概念。

## 9. 后续开发建议

优先级较高：

- 明确并处理 `windowCloseBehavior` 的产品归属。
- 为 TaskBox/IdeaBox 的窗口位置持久化补齐一致性，Task 当前类型有 `windowState`，但主要使用默认开窗位置。
- 梳理每日自动同步和手动导出的空文件策略，保证文案、测试和实现一致。
- 给“删除任务/删除想法”增加更明确的确认或撤销策略。
- 为托盘直接显示/隐藏想法窗口的 Rust 路径和前端路径保持一致性测试。

中期可考虑：

- 任务详情中编辑开始/结束时间的显式控件。
- 每日日志预览。
- Focus history 可视化。
- IdeaBox 到 TaskBox 的正文继承策略，让选区成为标题还是正文可选。
- 更清晰的完成任务入口，不只出现在计时结束后的分流中。

不建议优先做：

- 复杂项目/看板系统。
- 云账号体系。
- 多人协作。
- 过重的任务层级和依赖关系。

这些方向会偏离当前“轻量执行工作台”的核心。

## 10. 开发准则

修改代码前：

- 先看 GitNexus 当前分析和相关符号影响。
- 多窗口、事件、IPC、存储、快捷键、托盘相关改动必须扩大影响范围检查。

修改代码时：

- 保持 Tauri 能力在 runtime bridge 后面。
- 保持 TaskBox 和 IdeaBox 的低摩擦体验。
- 不把计时结束等同于任务完成。
- 不把 IdeaBox 强制结构化成任务。
- 不让浏览器调试页面因为缺 Tauri 能力而卡死。

验证建议：

- 前端：`npm run build`
- 单测：`npm run test` 或目标 Vitest 文件
- Rust：`cargo check --manifest-path src-tauri/Cargo.toml`
- 桌面 smoke test：打开日历、创建任务、创建想法、计时结束分流、导出日志、托盘菜单、快捷键。
