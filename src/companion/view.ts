import { companionClientScript } from "./client";
import { companionStyles } from "./styles";

export const companionHtml = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MaxMEM Companion</title>
    <style>
      ${companionStyles()}
    </style>
  </head>
  <body>
    <main>
      <aside>
        <div class="brand">
          <h1>MaxMEM</h1>
          <span class="muted">companion</span>
        </div>
        <div id="repo" class="repo">Loading repository state...</div>
        <h2>Recent Capsules</h2>
        <div id="capsules" class="capsule-list"></div>
      </aside>
      <section class="work">
        <h2>Latest Handoff</h2>
        <div id="summary" class="repo"></div>
        <pre id="capsuleText" class="capsule-text"></pre>
      </section>
      <aside class="controls">
        <h2>Create Handoff</h2>
        <div class="stack">
          <select id="sourceAgent">
            <option value="codex">Codex</option>
            <option value="claude">Claude Code</option>
            <option value="opencode">OpenCode</option>
          </select>
          <select id="verbosity">
            <option value="compact">compact</option>
            <option value="standard">standard</option>
            <option value="full">full</option>
          </select>
          <textarea id="goal" placeholder="Goal for the next agent"></textarea>
          <button class="primary" id="handoff">Create handoff</button>
        </div>
        <h2>Launch Agent</h2>
        <div class="agents">
          <button data-launch="codex">Launch Codex</button>
          <button data-launch="claude">Launch Claude Code</button>
          <button data-launch="opencode">Launch OpenCode</button>
        </div>
      </aside>
    </main>
    <script>
      ${companionClientScript()}
    </script>
  </body>
</html>`;
