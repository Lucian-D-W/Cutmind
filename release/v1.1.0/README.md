# 脑闸（Cutmind）1.1.0 安装材料

2026-10-27 使用当前工作区源码构建，产品名称为 Cutmind，应用标识仍为 `com.cutbrain.app`。包含 2026-10-26 的窗口尺寸与排版修复。

项目中文名已确认为 **脑闸**，英文名为 **Cutmind**；本目录现有安装包的文件名、Windows 登记名与开始菜单入口仍为 Cutmind。

| 文件 | 用途与实际状态 |
| --- | --- |
| `Cutmind_1.1.0_x64-setup.exe` | Windows x64 的 NSIS 安装器；已在 Windows 11 x64 完成实际安装、启动和原生交互录制 |
| `Cutmind_1.1.0_x64_en-US.msi` | Windows x64 的 MSI 安装器；已生成，未另行安装验证 |
| `notices/` | 安装器携带的项目许可、署名和依赖许可材料副本 |
| `bundle-notices.json` | 将上述通知放入安装目录 `licenses/` 的打包配置 |

当前安装版位于 `%LOCALAPPDATA%\Cutmind`，开始菜单入口为 Cutmind。日常使用不需要开发工具；缺少 WebView2 时，NSIS 安装器按 Tauri 的 `downloadBootstrapper` 方式下载微软运行组件。此次机器已具备 WebView2，未在缺少该组件的机器上重复安装。

安装后以实际程序进入日历、打开任务、从便笺选文创建任务，并完成计时、下一步规划与休息操作。安装与启动时保留了既有任务和便笺数据。

## 构建

先运行 `npm run tauri -- build --ci` 构建，再运行以下命令，将许可材料一并放入安装器：

```powershell
npm run tauri -- bundle --ci --config release/v1.1.0/bundle-notices.json
```

依赖许可材料根据 Windows Rust 解析图和 JavaScript 运行依赖树整理，共记录 320 个包，包括一部分构建时依赖。若上游归档没有独立许可文件，保留其作者、许可元数据和原始源码说明，并附标准许可文本作为参照；这份清单不代表完整权属审计。

## 文件校验值

SHA-256：

```text
37C7050EE5035A5ABCCC3015374091F2FBA573C4DB820138D72429532479BDE9  Cutmind_1.1.0_x64-setup.exe
4A246B1A6E7037C51620C41EB60DDD21A63897F019034DED1C2546D241576216  Cutmind_1.1.0_x64_en-US.msi
```

本版本已[正式发布至 GitHub Release](https://github.com/Lucian-D-W/Cutmind/releases/tag/v1.1.0)，提供 [EXE](https://github.com/Lucian-D-W/Cutmind/releases/download/v1.1.0/Cutmind_1.1.0_x64-setup.exe) 和 [MSI](https://github.com/Lucian-D-W/Cutmind/releases/download/v1.1.0/Cutmind_1.1.0_x64_en-US.msi)。上述 SHA-256 与 GitHub 附件摘要一致。
