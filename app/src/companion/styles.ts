export const companionStyles = () => `
:root {
  color-scheme: dark;
  --paper: #f4efe2;
  --ink: #11100d;
  --soot: #050505;
  --panel: rgba(10, 10, 9, 0.72);
  --panel-strong: rgba(18, 17, 14, 0.86);
  --line: rgba(244, 239, 226, 0.17);
  --line-strong: rgba(244, 239, 226, 0.34);
  --wash: rgba(244, 239, 226, 0.07);
  --accent: #d7c8a9;
  --accent-strong: #efe0bd;
  --muted: rgba(244, 239, 226, 0.62);
  --shadow: rgba(0, 0, 0, 0.42);
}

* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  overflow: hidden;
}

body {
  margin: 0;
  min-height: 100%;
  background:
    radial-gradient(circle at 76% 26%, rgba(215, 200, 169, 0.09), transparent 24rem),
    linear-gradient(115deg, #050505 0%, #10100e 48%, #050505 100%),
    #050505;
  color: var(--paper);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

main {
  display: grid;
  grid-template-columns: minmax(230px, 320px) minmax(0, 1fr) minmax(300px, 360px);
  height: 100vh;
  overflow: hidden;
}

main > aside,
main > section {
  background: var(--panel);
  border-right: 1px solid var(--line);
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.32);
  height: 100vh;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 22px;
  scrollbar-color: rgba(215, 200, 169, 0.34) transparent;
  scrollbar-width: thin;
}

main > aside::-webkit-scrollbar,
main > section::-webkit-scrollbar,
.capsule-text::-webkit-scrollbar {
  width: 10px;
}

main > aside::-webkit-scrollbar-thumb,
main > section::-webkit-scrollbar-thumb,
.capsule-text::-webkit-scrollbar-thumb {
  background: rgba(215, 200, 169, 0.28);
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: content-box;
}

main > aside::-webkit-scrollbar-track,
main > section::-webkit-scrollbar-track,
.capsule-text::-webkit-scrollbar-track {
  background: transparent;
}

.brand {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 30px;
  font-weight: 500;
  letter-spacing: 0;
}

h2 {
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  margin: 24px 0 10px;
  text-transform: uppercase;
}

.repo {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
  margin-top: 18px;
  overflow-wrap: anywhere;
}

.repo strong {
  color: var(--paper);
  display: block;
  margin-bottom: 8px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0;
}

.tag {
  background: rgba(215, 200, 169, 0.08);
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--accent);
  font-size: 11px;
  padding: 3px 8px;
}

.capsule-list {
  display: grid;
  gap: 8px;
}

.capsule {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(244, 239, 226, 0.1), rgba(244, 239, 226, 0.045));
  color: var(--paper);
  cursor: pointer;
  padding: 10px;
  box-shadow: 0 10px 22px var(--shadow);
  text-align: left;
  width: 100%;
}

.capsule:hover,
button:hover {
  border-color: var(--line-strong);
}

.capsule strong {
  display: block;
  font-size: 12px;
  margin-bottom: 6px;
}

.capsule span,
.muted {
  color: var(--muted);
  font-size: 11px;
}

.work {
  background:
    linear-gradient(180deg, rgba(12, 12, 10, 0.82), rgba(6, 6, 5, 0.7)),
    rgba(0, 0, 0, 0.58);
  min-width: 0;
  padding: 24px 28px;
  position: relative;
  isolation: isolate;
}

.work::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.7)),
    url("/assets/ink-dashboard-bg.png") center / cover no-repeat;
  opacity: 0.24;
  pointer-events: none;
  z-index: 0;
}

.work > * {
  position: relative;
  z-index: 1;
}

.task-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 22px;
}

.task-panel {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(244, 239, 226, 0.08), rgba(244, 239, 226, 0.035));
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.26);
  min-height: 92px;
  padding: 12px;
}

.task-panel:first-child {
  grid-column: 1 / -1;
}

.task-panel h3 {
  color: var(--accent);
  font-size: 11px;
  margin-bottom: 9px;
  text-transform: uppercase;
}

.mini-list {
  color: var(--paper);
  display: grid;
  font-size: 12px;
  gap: 7px;
  line-height: 1.45;
}

.empty {
  color: var(--muted);
  font-size: 12px;
}

.capsule-text {
  border-top: 1px solid var(--line);
  color: #f0eadb;
  font-size: 13px;
  line-height: 1.55;
  margin-top: 22px;
  max-height: 70vh;
  overflow: auto;
  padding-top: 22px;
  white-space: pre-wrap;
}

.controls {
  background:
    linear-gradient(180deg, rgba(14, 13, 11, 0.88), rgba(6, 6, 5, 0.76)),
    rgba(0, 0, 0, 0.68);
  border-right: 0;
}

button,
input,
select,
textarea {
  background: rgba(244, 239, 226, 0.08);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--paper);
  font: inherit;
}

button {
  cursor: pointer;
  min-height: 38px;
  padding: 9px 11px;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

button:hover {
  background: rgba(244, 239, 226, 0.12);
  transform: translateY(-1px);
}

input,
select,
textarea {
  padding: 9px 10px;
  width: 100%;
}

select:focus,
textarea:focus,
button:focus-visible {
  border-color: var(--accent);
  outline: 2px solid rgba(215, 200, 169, 0.18);
  outline-offset: 2px;
}

textarea {
  min-height: 94px;
  resize: vertical;
}

.stack {
  display: grid;
  gap: 10px;
}

.memory-form {
  margin-top: 10px;
}

.memory-list,
.read-list {
  display: grid;
  gap: 8px;
}

.memory-row,
.read-row {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(244, 239, 226, 0.08), rgba(244, 239, 226, 0.035));
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
  padding: 10px;
}

.memory-row strong {
  color: var(--accent);
  display: block;
  font-size: 11px;
  margin-bottom: 5px;
  text-transform: uppercase;
}

.agents {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.primary {
  background: var(--accent-strong);
  color: var(--ink);
  font-weight: 700;
}

@media (max-width: 980px) {
  body {
    overflow: auto;
  }

  main {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }

  .task-grid {
    grid-template-columns: 1fr;
  }

  main > aside,
  main > section {
    border-right: 0;
    border-bottom: 1px solid var(--line);
    height: auto;
    max-height: none;
    overflow: visible;
  }
}
`;
