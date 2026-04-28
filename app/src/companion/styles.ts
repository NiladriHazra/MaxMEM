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
  grid-template-columns: minmax(220px, 320px) minmax(0, 1fr) 300px;
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

  aside,
  section {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
}
`;
