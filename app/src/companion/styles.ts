export const companionStyles = () => `
:root {
  color-scheme: dark;
  --paper: #f1eee6;
  --ink: #141414;
  --soot: #050505;
  --line: rgba(241, 238, 230, 0.18);
  --wash: rgba(241, 238, 230, 0.08);
  --accent: #d8d0bd;
  --muted: rgba(241, 238, 230, 0.62);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at 78% 18%, rgba(241, 238, 230, 0.1), transparent 26rem),
    linear-gradient(115deg, #050505 0%, #111 48%, #070707 100%);
  color: var(--paper);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

main {
  display: grid;
  grid-template-columns: minmax(230px, 320px) minmax(0, 1fr) minmax(300px, 360px);
  min-height: 100vh;
}

aside,
section {
  border-right: 1px solid var(--line);
  padding: 22px;
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
  background: var(--wash);
  color: var(--paper);
  cursor: pointer;
  padding: 10px;
  text-align: left;
  width: 100%;
}

.capsule:hover,
button:hover {
  border-color: rgba(241, 238, 230, 0.44);
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
  min-width: 0;
  padding: 24px 28px;
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
  background: rgba(241, 238, 230, 0.05);
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
  color: #eee8db;
  font-size: 13px;
  line-height: 1.55;
  margin-top: 22px;
  overflow: auto;
  padding-top: 22px;
  white-space: pre-wrap;
}

.controls {
  border-right: 0;
}

button,
input,
select,
textarea {
  background: rgba(241, 238, 230, 0.08);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--paper);
  font: inherit;
}

button {
  cursor: pointer;
  min-height: 38px;
  padding: 9px 11px;
}

input,
select,
textarea {
  padding: 9px 10px;
  width: 100%;
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
  background: rgba(241, 238, 230, 0.05);
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
  background: var(--paper);
  color: var(--ink);
}

@media (max-width: 980px) {
  main {
    grid-template-columns: 1fr;
  }

  .task-grid {
    grid-template-columns: 1fr;
  }

  aside,
  section {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
}
`;
