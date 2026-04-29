export const companionClientScript = () => `
const state = { capsules: [], latest: undefined };

const byId = (id) => document.getElementById(id);

const requestJson = async (url, options) => {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
};

const textNode = (value) => document.createTextNode(value);

const emptyNode = (value) => {
  const node = document.createElement("div");

  node.className = "empty";
  node.textContent = value;

  return node;
};

const repoLine = (label, value) => {
  const row = document.createElement("div");
  const name = document.createElement("span");

  name.className = "muted";
  name.textContent = label + ": ";
  row.append(name, textNode(value));

  return row;
};

const tag = (value) => {
  const node = document.createElement("span");

  node.className = "tag";
  node.textContent = value;

  return node;
};

const renderRepo = (status) => {
  const root = byId("repo");
  const title = document.createElement("strong");
  const tags = document.createElement("div");

  title.textContent = status.repoRoot;
  tags.className = "tags";
  tags.append(
    tag(status.branch),
    tag(status.changedFiles.length + " changed"),
    tag(status.latestSession ? status.latestSession.agent : "no session"),
  );
  root.replaceChildren(
    title,
    tags,
    repoLine("recent commits", String(status.recentCommits.length)),
  );
};

const capsuleButton = (capsule, index) => {
  const button = document.createElement("button");
  const title = document.createElement("strong");
  const detail = document.createElement("span");

  button.className = "capsule";
  button.dataset.index = String(index);
  title.textContent = capsule.sourceAgent + " / " + capsule.branch;
  detail.textContent = capsule.createdAt + " / " + capsule.goal;
  button.append(title, detail);

  return button;
};

const renderCapsules = (capsules) => {
  state.capsules = capsules;
  byId("capsules").replaceChildren(
    ...(capsules.length ? capsules.map(capsuleButton) : [emptyNode("No capsules yet")]),
  );
};

const chevronSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

const makeToggleButton = () => {
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "icon-toggle";
  toggle.dataset.toggle = "expand";
  toggle.setAttribute("aria-label", "Expand");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = chevronSvg;
  return toggle;
};

const listPanel = (title, values, empty) => {
  const panel = document.createElement("section");
  const heading = document.createElement("h3");
  const list = document.createElement("div");
  const toggle = makeToggleButton();

  panel.className = "task-panel";
  heading.textContent = title;
  list.className = "mini-list";
  list.replaceChildren(
    ...(values && values.length
      ? values.map((value) => {
          const item = document.createElement("div");

          item.textContent = value;
          return item;
        })
      : [emptyNode(empty)]),
  );
  panel.append(heading, toggle, list);

  return panel;
};

const measurePanels = (root) => {
  root.querySelectorAll(".task-panel").forEach((panel) => {
    panel.classList.remove("is-fits");
    const list = panel.querySelector(".mini-list");
    if (!list) return;
    if (list.scrollHeight <= 168) {
      panel.classList.add("is-fits");
    }
  });
};

const measureMemoryRows = (root) => {
  root.querySelectorAll(".memory-row").forEach((row) => {
    row.classList.remove("is-fits");
    if (row.scrollHeight <= 110) {
      row.classList.add("is-fits");
    }
  });
};

const renderTaskState = (latest) => {
  const taskState = latest?.taskState;
  const root = byId("taskState");

  root.replaceChildren(
    listPanel("Current task", taskState ? [taskState.currentTask] : [], "No current task"),
    listPanel("Next actions", taskState?.nextActions, "No next actions"),
    listPanel("Verification", taskState?.verification, "No verification yet"),
    listPanel("Open questions", taskState?.openQuestions, "No open questions"),
    listPanel("Risks", taskState?.risks, "No risks recorded"),
  );

  requestAnimationFrame(() => measurePanels(root));
};

const renderMemory = (memory) => {
  const rows = memory.map((record) => {
    const row = document.createElement("div");
    const kind = document.createElement("strong");
    const content = document.createElement("span");
    const toggle = makeToggleButton();

    row.className = "memory-row";
    row.dataset.kind = record.kind || "note";
    kind.textContent = record.kind;
    content.textContent = record.content;
    row.append(kind, toggle, content);

    return row;
  });

  const root = byId("memory");
  root.replaceChildren(...(rows.length ? rows : [emptyNode("No project memory")]));
  requestAnimationFrame(() => measureMemoryRows(root));
};

const renderReads = (reads) => {
  const rows = reads.map((read) => {
    const row = document.createElement("div");

    row.className = "read-row";
    row.textContent = read.consumerAgent + " read " + read.source + " at " + read.readAt;

    return row;
  });

  byId("reads").replaceChildren(...(rows.length ? rows : [emptyNode("No reads recorded")]));
};

const renderLatest = (latest) => {
  state.latest = latest;
  byId("summary").textContent = latest ? latest.summary : "No capsule yet. Create one or launch an agent.";
  byId("capsuleText").textContent = latest?.rendered ?? "";
  renderTaskState(latest);
};

const render = (data) => {
  renderRepo(data.status);
  renderLatest(data.latest);
  renderCapsules(data.capsules);
  renderMemory(data.memory);
  renderReads(data.reads);
};

const refresh = async () => render(await requestJson("/api/state"));

const postAction = (url, value) =>
  requestJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });

document.addEventListener("click", async (event) => {
  const target = event.target instanceof HTMLElement ? event.target : undefined;
  if (!target) return;

  const toggleButton = target.closest("[data-toggle='expand']");
  if (toggleButton) {
    event.preventDefault();
    const container = toggleButton.closest(".task-panel, .memory-row");
    if (container) {
      const isMemory = container.classList.contains("memory-row");
      const inner = container.querySelector(isMemory ? "span" : ".mini-list");
      const buffer = isMemory ? 36 : 64;
      const expanded = container.classList.toggle("is-expanded");
      if (expanded && inner) {
        container.style.maxHeight = inner.scrollHeight + buffer + "px";
      } else {
        container.style.maxHeight = "";
      }
      toggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");
      toggleButton.setAttribute("aria-label", expanded ? "Collapse" : "Expand");
    }
    return;
  }

  const launch = target.dataset.launch;
  const capsuleIndex = target.closest(".capsule")?.dataset.index;

  if (launch) {
    await postAction("/api/launch", {
      agent: launch,
      goal: byId("goal").value,
    });
    await refresh();
  }

  if (capsuleIndex !== undefined) {
    const capsule = state.capsules[Number(capsuleIndex)];

    byId("summary").textContent = capsule.summary;
    byId("capsuleText").textContent = capsule.rendered;
    renderTaskState(capsule);
  }
});

byId("handoff").addEventListener("click", async () => {
  await postAction("/api/handoff", {
    agent: byId("sourceAgent").value,
    goal: byId("goal").value,
    verbosity: byId("verbosity").value,
  });
  await refresh();
});

byId("saveMemory").addEventListener("click", async () => {
  await postAction("/api/memory", {
    kind: byId("memoryKind").value,
    content: byId("memoryContent").value,
  });
  byId("memoryContent").value = "";
  await refresh();
});

refresh().catch((error) => {
  byId("repo").textContent = error.message;
});
`;
