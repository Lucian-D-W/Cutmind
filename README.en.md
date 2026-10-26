<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="104" height="104" alt="Cutmind's brain-and-gate icon">
</p>

<h1 align="center">Cutmind · 脑闸</h1>

<p align="center"><a href="README.md">简体中文</a> · <strong>English</strong></p>

<p align="center"><strong>Desktop task notes and a focus timer. Write down your next step before taking a break.</strong></p>

<p align="center">
  <a href="#features">Features & Demos</a> ·
  <a href="#start">Download & Usage</a> ·
  <a href="#why">Motivation & Related Research</a> ·
  <a href="#credits">Acknowledgments & License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows_x64-0078D4?style=flat-square" alt="Windows x64">
  <img src="https://img.shields.io/badge/version-1.1.0-608b83?style=flat-square" alt="Version 1.1.0">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0--only-88769b?style=flat-square" alt="GPL-3.0-only"></a>
</p>

---

I often sit at my computer for hours. Even when it is clearly time for a break, I keep thinking: one more edit, one more source to look up. Before I notice, another half hour has gone by. Sometimes I finally step away, but I am still thinking about the work I left unfinished. When I come back, I have to spend time remembering what I was about to do.

So I made Cutmind, called 「脑闸」 in Chinese, to put a small gate between work and rest.

At the end of each work timer, if I want to continue, Cutmind asks me to write down the next thing I will do when I return—for example, “Add the example from the second article to the opening”—and then take a break. The task and its notes stay in a floating desktop window. Other ideas that come up can go straight into a sticky note.

I want to be able to step away from my computer with less on my mind, spend less of my break thinking about work, and pick up where I left off when I return.

<a id="features"></a>

## ✨ Features & Demos

### Idea Box

When an idea comes to mind, put it in the Idea Box without having to schedule it right away. It is an independent desktop sticky note: you can change its color and position, or hide it temporarily while keeping its contents.

![Changing the Idea Box background color and typing an idea](docs/assets/demos/创建想法盒子.gif)

### Turn an idea into a task

When you are ready to work on something, select the relevant text in the note, right-click, and choose “Selected text → Create task.” The selected text becomes the task title, and a separate task window opens. The original note stays there for any other ideas you want to add.

### Desktop tasks and timing

Turn “write the proposal” into something you can do in this session, such as “list three questions to answer.” Choose a duration and click “Start.” The title, notes, and countdown share one independent floating window. You can keep it on top and pause the timer whenever needed. Record your progress directly in the task note.

![Entering a task title, setting a focus duration, and starting the timer](docs/assets/demos/创建执行任务.gif)

### Enforced breaks

A timer reaching zero does not necessarily mean the work is finished. You can continue the same task, continue with a new title, open a new task, or explicitly finish the current one. To continue or switch tasks, first write down your next step and confirm how long you will rest.

After the break, click “Continue current task.” What you wrote is appended to the task notes, and a new work timer starts. Only choosing “Finish this task” marks the task as complete. During the break, the continue button stays disabled: a focus session under 20 minutes requires at least a 1-minute break; 20 minutes or more requires at least 5 minutes; 50 minutes or more requires at least 10 minutes.

![Choosing to continue, writing the next step and break duration, and entering a break countdown that cannot be skipped immediately](docs/assets/demos/强制休息.gif)

### Review your day in the calendar

At the end of the day, find that day's tasks in the month view. Open them to review the notes and each focus session, see what you worked on, and remember where you stopped. Switch to the week view to see tasks arranged by time. When you want to continue, you can edit the details or reopen the floating task window.

![Opening task details from the calendar and changing the task color while the floating task window shows a break countdown](docs/assets/demos/日历同步记录.gif)

To take your records into your own note-taking tools, export them as Markdown, JSON, or JSONL. If you set a daily journal folder, task changes are automatically synced to Markdown files organized by day. Tasks, ideas, and settings are stored on your computer.

<a id="start"></a>

## 🚀 Download & Usage

For **Windows x64**, version **1.1.0**.

1. **Install and open.** Download [Cutmind_1.1.0_x64-setup.exe](https://github.com/Lucian-D-W/Cutmind/releases/download/v1.1.0/Cutmind_1.1.0_x64-setup.exe), run the installer, and open Cutmind (脑闸) from the Start menu. Everyday use does not require Node.js, Rust, or other development tools.
2. **Capture an idea first.** Press the default shortcut `Ctrl+Shift+I` to open the Idea Box and write down what comes to mind.
3. **Turn the idea into a task.** Select the text you want to work on, right-click, and choose “Selected text → Create task” to open its task window.
4. **Start a work session.** Add what you intend to do in this session to the desktop task window, choose a duration, and click “Start.”
5. **Take a break when the timer ends.** To keep working, write down your next step and confirm the break duration. Wait until the break ends, then click the continue button to start working again. If you are done, choose “Finish this task.”
6. **Review in the calendar.** Press `Ctrl+Alt+C` to open the calendar and review task notes and focus sessions. Reminders, appearance, shortcuts, and the journal folder can be adjusted through “Preferences” in the system tray.

For the development environment, build commands, and data directory details, see the [development and maintenance guide](docs/guides/DEVELOPMENT.md).

<a id="why"></a>

## 💡 Motivation & Related Research

While designing Cutmind, I kept coming back to two questions: why does work stay on my mind after I have stopped? And how can I make it clear, before I leave, what I will do when I come back?

The following three studies gave me some ideas.

**References**

**1. Why is it so hard to do my work? The challenge of attention residue when switching between work tasks**\
Sophie Leroy, 2009, *Organizational Behavior and Human Decision Processes*, 109(2), 168–181. [Journal abstract](https://www.sciencedirect.com/science/article/pii/S0749597809000399).

This study discusses “attention residue”: when people switch from one task to another, their attention may remain on the previous, unfinished task and affect their performance on the next one.

It made me wonder whether continuing to think about work during a break might also be related to this difficulty in shifting attention.

**2. Tasks Interrupted: How Anticipating Time Pressure on Resumption of an Interrupted Task Causes Attention Residue and Low Performance on Interrupting Tasks and How a “Ready-to-Resume” Plan Mitigates the Effects**\
Sophie Leroy and Theresa M. Glomb, 2018, *Organization Science*, 29(3), 380–397. [Journal abstract](https://doi.org/10.1287/orsc.2017.1184) · [University research summary](https://www.washington.edu/news/2018/01/16/task-interrupted-a-plan-for-returning-helps-you-move-on/).

The research found that when people worry they will not have enough time to resume their work after an interruption, their attention is more likely to stay with the unfinished task. Taking a little time before switching to plan how to continue on returning can reduce this effect.

That inspired one of Cutmind's core features: **before leaving your computer, leave your future self one specific instruction.**

**3. Implementation intentions and effective goal pursuit**\
Peter M. Gollwitzer and Veronika Brandstätter, 1997, *Journal of Personality and Social Psychology*, 73(1), 186–199. [Full paper](https://sparq.stanford.edu/sites/g/files/sbiybj19021/files/media/file/gollwitzer_brandstatter_1997_-_implementation_intentions_effective_goal_pursuit.pdf).

This study explores “implementation intentions”: deciding in advance what action to take in a particular situation. Simply deciding “I will keep writing the report today” is different from planning “When I return from my break, I will first add an example to the report's second section.” The research found that connecting a specific situation with an action can help people act on their goals.

It made me pay more attention to that short next-step plan in Cutmind: writing down a clear action makes it easier for me to get started again than leaving myself only “keep working.”

**Design References & Application**

These three studies made me think more carefully about the few minutes at the end of a work session.

So I gave Cutmind a rule: if I want to continue after a session ends, I first write down the next step and then take a break. When the break is over, that sentence is still on my desktop, ready to help me pick up the work again.

I also built breaks into continuous work so I cannot immediately start another session as soon as the last one ends. That is a design choice based on my own habits.

I hope Cutmind can help me do two ordinary things: actually rest when it is time for a break, and know where to start when I come back to work.

<a id="credits"></a>

## 🙏 Acknowledgments & License

Thanks to [Tauri](https://tauri.app/), [React](https://react.dev/), [Zustand](https://github.com/pmndrs/zustand), [Floating UI](https://floating-ui.com/), [date-fns](https://date-fns.org/), and [DOMPurify](https://github.com/cure53/DOMPurify) for the foundations behind the desktop windows, interface, state management, and content processing. See the [third-party notices](THIRD_PARTY_NOTICES.md) for licenses and attribution.

Copyright (C) 2026 **Lucian W. (lucian-d-w)**. Original project code, documentation, and the brain-and-gate icon are licensed under **[GPL-3.0-only](LICENSE)**; see [NOTICE](NOTICE) for its scope. Third-party components retain their own licenses.
