# 工具安装示例

同一套工作规则可以被多个工具共享；每个工具只生成适合自己的入口。用户看到的阶段名称保持一致，旧调用 ID 继续兼容。

## Codex

```bash
agent-workflow-init --target . --tools codex --yes
```

生成文件：

- `AGENTS.md`
- `.agents/skills/agent-workflow/SKILL.md`
- `.agents/skills/{skill_slug}/SKILL.md`
- `.agents/skills/{skill_slug}/agents/openai.yaml`
- `workflow/`

Codex 的项目级入口是根 `AGENTS.md` 和 `.agents/skills/`。日常使用可以直接用自然语言描述任务。想指定阶段时，Codex Desktop 可输入 `/01`，再从 Skills 分组选择“讨论需求”；CLI/IDE 使用 `/skills` 或 `$workflow-01-requirement-discussion`。这是 Skill 选择，不是 Claude 式可直接提交的字面 `/01-需求讨论` 命令。全部阶段 Skill 的 `allow_implicit_invocation` 为 `false`。

例如，`/new-feature`、`/定义完成`、`/交付至完成` 和 `/workflow-status` 的用户显示名称分别是“开始一个改动”“确认完成标准”“完成这次改动”和“查看进度”。内部 ID 与 Skill slug 不变。

项目级 `.codex/prompts/` 不会被当前 Codex 加载，1.0.0 不再生成该目录。升级 0.1.0 工作区时使用 `--upgrade --force`；初始化器只删除内容精确匹配旧模板的 prompts，保留用户自定义或已编辑文件。先加 `--dry-run` 可只查看迁移计划。

## Claude Code

```bash
agent-workflow-init --target . --tools claude --yes
```

生成文件：

- `AGENTS.md`
- `CLAUDE.md`
- `.claude/commands/`
- `workflow/`

## Cursor

```bash
agent-workflow-init --target . --tools cursor --yes
```

生成文件：

- `AGENTS.md`
- `.cursor/rules/agent-workflow-core.mdc`
- `.cursor/commands/`
- `workflow/`

## GitHub Copilot

```bash
agent-workflow-init --target . --tools copilot --yes
```

生成文件：

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `workflow/`

## CodeBuddy

```bash
agent-workflow-init --target . --tools codebuddy --yes
```

生成文件：

- `AGENTS.md`
- `.codebuddy/instructions.md`
- `workflow/`

## Kiro

```bash
agent-workflow-init --target . --tools kiro --yes
```

生成文件：

- `AGENTS.md`
- `.kiro/instructions.md`
- `workflow/`

## Trae

```bash
agent-workflow-init --target . --tools trae --yes
```

或使用别名：

```bash
agent-workflow-init --target . --tools trea --yes
```

生成文件：

- `AGENTS.md`
- `.trae/instructions.md`
- `workflow/`

## 多工具安装

```bash
agent-workflow-init --target . --tools codex,claude,cursor,copilot,codebuddy,kiro,trae --yes
```

不要期待每个工具提供完全相同的运行体验。基础规则相同，具体交互取决于当前工具的能力。
