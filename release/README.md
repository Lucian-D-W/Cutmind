# Release Artifacts

Release binaries are grouped by semantic version to avoid mixing installers from different builds.

## Layout

- `vX.Y.Z/` - One folder per released version.
- `Cutmind_X.Y.Z_x64-setup.exe` - Current Windows x64 EXE installer naming.
- `Cutmind_X.Y.Z_x64_en-US.msi` - Current Windows x64 MSI installer naming.
- `脑闸_X.Y.Z_x64-setup.exe` - Retained historical installer naming.
- Version-folder `README.md` - Build, verification and publication status; a locally prepared installer is not automatically a published Release.

## Rules

- Do not place installer binaries directly under `release/`.
- Keep historical installers unless the user explicitly asks to remove or archive them.
- If a release is replaced, add a note here or in the relevant release folder instead of silently overwriting history.
- Non-release build experiments should stay outside `release/` or inside ignored local scratch space.

Current prepared installers and accompanying license resources are described in [v1.1.0](v1.1.0/README.md). The original installer with the old name remains alongside them as history.
