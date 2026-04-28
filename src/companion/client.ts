export const companionClientScript = () => `
const state = { capsules: [] };

const byId = (id) => document.getElementById(id);

const requestJson = async (url, options) => {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
};

const textNode = (value) => document.createTextNode(value);

const repoLine = (label, value) => {
  const row = document.createElement("div");
  const name = document.createElement("span");

  name.className = "muted";
  name.textContent = label + ": ";
  row.append(name, textNode(value));

  return row;
};

const renderRepo = (status) => {
  const root = byId("repo");
  const title = document.createElement("strong");

  title.textContent = status.repoRoot;
  root.replaceChildren(
    title,
    repoLine("branch", status.branch),
    repoLine("changed files", String(status.changedFiles.length)),
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
  byId("capsules").replaceChildren(...capsules.map(capsuleButton));
};

const renderLatest = (latest) => {
  byId("summary").textContent = latest ? latest.summary : "No capsule yet. Create one or launch an agent.";
  byId("capsuleText").textContent = latest?.rendered ?? "";
};

const render = (data) => {
  renderRepo(data.status);
  renderLatest(data.latest);
  renderCapsules(data.capsules);
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
  const launch = target?.dataset.launch;
  const capsuleIndex = target?.closest(".capsule")?.dataset.index;

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

refresh().catch((error) => {
  byId("repo").textContent = error.message;
});
`;
