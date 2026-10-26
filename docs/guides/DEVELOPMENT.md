# 脑闸（Cutmind）开发与维护说明

当前维护基线为脑闸（Cutmind）1.1.0 完整功能版。仓库名为 Cutmind，内部包名
`cutbrain` 和应用 ID `com.cutbrain.app` 保留。维护时应以实际功能和代码为准，
不能因为分支名称含有 debug 就将其视为废弃实现。

## 功能基准

规整和重建后应继续具备以下能力：

- 中文／英文切换，设置按常规、专注与提醒、快捷键、数据与导出、关于分组，小窗口可以滚动。
- 默认透明度，以及日历的暖日、暗夜、莫兰迪、敦煌、大地五套主题。
- 专注与休息时间，提醒静音、音量、重复间隔和提示音。
- 自定义快捷键、应用与重置，任务／想法盒子的关闭行为。
- 任务和想法的文字、颜色、系统字体选择、窗口状态与置顶。
- 日记目录选择与清除、自动同步，以及按日或全部任务导出。
- 原创大脑与绿色闸杆图标、托盘菜单和托盘语言切换。

对应实现主要位于 `src/components/Settings/`、`src/lib/i18n.ts`、
`src/lib/calendarThemes.ts`、`src/lib/dailyJournalSync.ts`、`src/hooks/useSystemFonts.ts`
及 Rust 的命令、托盘和快捷键模块。测试提供自动检查，不能替代桌面上的实际使用确认。

## 环境与重建

本轮 Windows 验证使用 Node.js 24.19.0、npm 11.17.0、Rust 1.98.0、MSVC
工具链和 WebView2。桌面开发需要满足 [Tauri Windows 前置要求](https://v2.tauri.app/start/prerequisites/#windows)。
其他平台尚未在本轮验证。

```sh
npm ci
npm test
npm run build
npm run tauri -- dev
```

`npm run dev` 可供浏览器界面预览；浏览器模式会提示桌面功能限制。真实的原生目录选择、
文件写入、通知和全局快捷键应使用 Tauri 桌面程序验证。

```sh
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo check --manifest-path src-tauri/Cargo.toml --locked
npm run tauri -- build --debug --no-bundle --ci
```

最后一条命令生成原生调试程序，不制作安装器。正式安装器构建为 `npm run tauri build`；
旧 `release/` 目录中的安装器是历史产物，不等于当前源码的构建结果。
当前原生调试路径会为部分想法窗口使用 `localhost:1420`；本地迭代使用
`npm run tauri -- dev`，或为调试程序同时运行 `npm run dev`。需要独立于开发服务器
运行的原生程序时，使用 `npm run tauri -- build --no-bundle --ci` 生成非调试构建。

## 数据与字体

用户数据由 Tauri 的 `app_data_dir()` 按 `com.cutbrain.app` 解析，保存在源码和构建输出之外。
重建时保留现有数据位置，不卸载、清空或重新填充数据。
便笺 `windowState.x/y` 使用物理屏幕坐标；当前宽高保存逻辑内容区大小，并附加
`sizeUnit: 'logical'`。未标记的旧宽高在恢复窗口时按显示器缩放转换，正常关闭后保存为新格式，
不批量重建存储。不要用 `outerSize()` 恢复内容区大小，Windows 隐形边框会造成逐次增大。
Windows 的 MSIX 进程可能虚拟化 AppData 写入；若以后从桌面端、CLI 或维护工具共享数据，
必须核对实际物理落点，不能只比较逻辑路径。

任务与想法盒子的字体选择使用 `list_system_fonts` / `font-kit` 和系统字体，相关 Hook 保留。
仓库本地五款阿里巴巴普惠体文件为独立可选素材；程序不加载或打包它们。
详见 [字体说明](../../fonts/README.md)。

## 本地资料与源码分发

项目规则属于维护资料；图谱索引、依赖缓存、日志、`.codex-runtime/` 及旧治理运行数据
属于本地状态，不是应用重建所需内容。保留已有数据，不按目录名清空。

公开源码保留项目自己的 `AGENTS.md`；本机安装的 GitNexus 及其生成的 `.claude/`、
`CLAUDE.md` 工具资料不随本次源码分发，按其自身条款使用。

公开源码副本采用当前已核对的文件清单，不包含 `.git`、真实运行数据、个人原始对话、
旧安装器、历史调试资料或字体二进制。本地旧历史和这些原件继续保留。

现有构建对若干“同时被静态和动态导入”的模块有分包提示；当前代码仍按完整版本的加载方式运行。
本轮没有借规整重写界面加载架构。
