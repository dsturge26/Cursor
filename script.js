const form = document.querySelector("#diagnostic-form");
const results = document.querySelector("#results");

const rangeInputs = [
  "sponsor-strength",
  "enablement-maturity",
  "sdlc-integration",
  "change-readiness",
  "measurement-discipline",
];

const teamProfiles = {
  small: { label: "1 to 50 developers", complexity: 0 },
  mid: { label: "51 to 250 developers", complexity: 4 },
  large: { label: "251 to 1,000 developers", complexity: 7 },
  enterprise: { label: "1,000+ developers", complexity: 10 },
};

const rolloutProfiles = {
  exploration: { label: "Exploration", requiredFoundation: 2.1 },
  pilot: { label: "Pilot", requiredFoundation: 2.7 },
  expansion: { label: "Expansion", requiredFoundation: 3.5 },
  scale: { label: "Enterprise scale", requiredFoundation: 4.2 },
};

const blockerProfiles = {
  security: {
    label: "security",
    relatedScore: "sdlcIntegration",
    risk: "Security review, policy clarity, and SDLC controls may slow trusted adoption.",
    mitigation:
      "Create a joint security and engineering review path with clear usage policies, approved workflows, and an exception process.",
  },
  adoption: {
    label: "adoption",
    relatedScore: "changeReadiness",
    risk: "Usage may look active while durable behavior change remains shallow.",
    mitigation:
      "Anchor adoption to real developer journeys, manager reinforcement, champion feedback, and recurring account health reviews.",
  },
  workflow: {
    label: "workflow fit",
    relatedScore: "sdlcIntegration",
    risk: "The tool may sit outside daily development flow instead of improving how teams plan, code, review, and learn.",
    mitigation:
      "Map priority workflows with developers and field teams, then standardize the patterns that reduce friction in existing SDLC steps.",
  },
  executive: {
    label: "executive alignment",
    relatedScore: "sponsorStrength",
    risk: "The rollout may lack a crisp business narrative, decision cadence, or path through organizational resistance.",
    mitigation:
      "Align an executive sponsor on outcomes, governance, decision rights, and the story leaders will use to explain the rollout.",
  },
  measurement: {
    label: "measurement",
    relatedScore: "measurementDiscipline",
    risk: "Teams may struggle to prove value or know which signals should drive expansion decisions.",
    mitigation:
      "Define leading and lagging indicators before expansion, including activation, retained usage, workflow adoption, and business outcomes.",
  },
  enablement: {
    label: "enablement",
    relatedScore: "enablementMaturity",
    risk: "Developers may receive access without enough practical guidance to build trust and repeatable habits.",
    mitigation:
      "Launch role-based enablement with office hours, champions, practical workflow examples, and manager-ready rollout materials.",
  },
};

function ratingToScore(value, weight) {
  return ((Number(value) - 1) / 4) * weight;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getFormData() {
  const data = new FormData(form);

  return {
    teamSize: data.get("teamSize"),
    aiMaturity: Number(data.get("aiMaturity")),
    rolloutStage: data.get("rolloutStage"),
    topBlocker: data.get("topBlocker"),
    sponsorStrength: Number(data.get("sponsorStrength")),
    enablementMaturity: Number(data.get("enablementMaturity")),
    sdlcIntegration: Number(data.get("sdlcIntegration")),
    changeReadiness: Number(data.get("changeReadiness")),
    measurementDiscipline: Number(data.get("measurementDiscipline")),
  };
}

function calculateScore(state) {
  const foundationAverage =
    (state.aiMaturity +
      state.sponsorStrength +
      state.enablementMaturity +
      state.sdlcIntegration +
      state.changeReadiness +
      state.measurementDiscipline) /
    6;

  const stageProfile = rolloutProfiles[state.rolloutStage];
  const stageFit = clamp(foundationAverage / stageProfile.requiredFoundation, 0, 1);
  const blockerProfile = blockerProfiles[state.topBlocker];
  const blockerControl = state[blockerProfile.relatedScore] / 5;
  const teamPenalty = teamProfiles[state.teamSize].complexity * (1 - foundationAverage / 5);

  const weightedScore =
    ratingToScore(state.aiMaturity, 14) +
    ratingToScore(state.sponsorStrength, 14) +
    ratingToScore(state.enablementMaturity, 14) +
    ratingToScore(state.sdlcIntegration, 14) +
    ratingToScore(state.changeReadiness, 12) +
    ratingToScore(state.measurementDiscipline, 14) +
    stageFit * 10 +
    blockerControl * 8;

  return Math.round(clamp(weightedScore - teamPenalty, 0, 100));
}

function getMaturityLevel(score) {
  if (score >= 90) return "Operationalized AI Transformation";
  if (score >= 75) return "Enterprise Scaling Ready";
  if (score >= 60) return "Expansion Ready";
  if (score >= 40) return "Pilot Ready";
  return "Foundational Readiness";
}

function getRolloutMotion(score, state) {
  if (score < 40) return "Readiness reset before broad access";
  if (score < 60) return "Structured pilot with explicit sponsor and measurement cadence";
  if (score < 75) return "Targeted expansion through lighthouse teams and workflow playbooks";
  if (score < 90) return "Enterprise scale with governance, enablement, and account health reviews";

  if (state.rolloutStage === "scale") {
    return "Optimization program tied to business outcomes and product feedback loops";
  }

  return "Accelerated expansion with executive narrative and field-to-product learning loops";
}

function rankRisks(state) {
  const risks = [
    {
      score: 6 - state.sponsorStrength,
      key: "executive",
      text: "Executive alignment risk: sponsorship, decision rights, or the business narrative may not be strong enough for expansion.",
    },
    {
      score: 6 - Math.min(state.enablementMaturity, state.changeReadiness),
      key: "adoption",
      text: "Adoption quality risk: teams may receive access without the reinforcement needed to build durable habits.",
    },
    {
      score: 6 - state.sdlcIntegration,
      key: "workflow",
      text: "Workflow fit risk: AI usage may remain separate from planning, code review, testing, documentation, and release practices.",
    },
    {
      score: 6 - state.sdlcIntegration,
      key: "security",
      text: "Security and governance risk: policy clarity, approved usage patterns, or review paths may not be ready for trusted expansion.",
    },
    {
      score: 6 - state.measurementDiscipline,
      key: "measurement",
      text: "Measurement risk: usage data may not connect cleanly to engineering health, customer value, or expansion readiness.",
    },
    {
      score: 6 - state.enablementMaturity,
      key: "enablement",
      text: "Enablement risk: developers, managers, and champions may lack practical examples for high-trust usage.",
    },
    {
      score:
        teamProfiles[state.teamSize].complexity / 2 +
        (["expansion", "scale"].includes(state.rolloutStage) ? 1.2 : 0) -
        state.aiMaturity / 2,
      key: "scale",
      text: "Scale complexity risk: rollout scope may outpace governance, support capacity, or cross-functional operating rhythm.",
    },
  ];

  risks.forEach((risk) => {
    if (risk.key === state.topBlocker) {
      risk.score += 2;
    }
  });

  return risks.sort((a, b) => b.score - a.score).slice(0, 3);
}

function getMitigations(state, risks) {
  const mitigationMap = {
    executive:
      "Run an executive alignment session that defines target outcomes, decision cadence, success criteria, and the expansion narrative.",
    adoption:
      "Create an adoption quality dashboard that separates access, active usage, retained usage, and workflow-level behavior change.",
    workflow:
      "Select two or three high-value developer workflows, document current friction, and build enablement around the improved path.",
    security:
      "Translate security requirements into approved usage patterns, policy guidance, escalation paths, and SDLC checkpoints.",
    measurement:
      "Agree on leading indicators, business outcome hypotheses, and review dates before moving from pilot to expansion.",
    enablement:
      "Stand up champions, office hours, manager talk tracks, and practical examples for coding, testing, review, and documentation.",
    scale:
      "Sequence expansion by team readiness, not just license availability, and create a field-feedback loop for emerging blockers.",
  };

  const selected = risks.map((risk) => mitigationMap[risk.key]);
  selected.unshift(blockerProfiles[state.topBlocker].mitigation);

  return [...new Set(selected)].slice(0, 4);
}

function getMetrics(state) {
  const metrics = [
    "Activation and retained usage by team, role, and workflow.",
    "Developer sentiment, trust signals, and qualitative feedback from champions.",
    "Workflow indicators such as code review support, test creation, documentation, onboarding, and code comprehension.",
    "Security, policy, and governance issues opened, resolved, or escalated.",
    "Executive-facing account health summary that connects technical adoption to business outcomes.",
  ];

  if (state.measurementDiscipline <= 2) {
    metrics.unshift("Baseline current-state metrics before expansion so value conversations are not anecdotal.");
  }

  return metrics.slice(0, 5);
}

function getEnablementPlan(state) {
  const plan = [
    "Start with developer-first enablement grounded in daily workflows rather than abstract AI education.",
    "Build a champion network across pilot teams and give managers a lightweight reinforcement cadence.",
    "Create practical playbooks for planning, code understanding, implementation, testing, review, and documentation.",
    "Capture field and user feedback weekly so product, engineering, and customer-facing teams learn from the rollout.",
  ];

  if (state.enablementMaturity <= 2) {
    plan.unshift("Begin with live workshops and office hours before asking teams to self-serve.");
  }

  if (state.sdlcIntegration <= 2) {
    plan.push("Pair enablement with SDLC guardrails so recommended usage is clear inside existing engineering practices.");
  }

  return plan.slice(0, 5);
}

function getExecutiveNarrative(score, state) {
  const maturity = getMaturityLevel(score).toLowerCase();
  const stage = rolloutProfiles[state.rolloutStage].label.toLowerCase();
  const blocker = blockerProfiles[state.topBlocker].label;

  return `This ${stage} rollout is at ${score}/100 readiness, which places it in ${maturity}. The priority is not broader tool access by itself. The priority is to improve adoption quality by resolving the ${blocker} constraint, proving trusted workflows with developers, and connecting usage patterns to business outcomes leaders can act on. I would manage this as a cross-functional deployment motion across customer leadership, Sales, Field Engineering, Product, Engineering, and enablement partners, with a clear feedback loop from users to the field and from the field to product strategy.`;
}

function getExpansionOpportunities(state) {
  const opportunities = [
    "Expand from lighthouse teams only after workflow usage and developer trust are visible, not just after access is provisioned.",
    "Prioritize use cases with clear SDLC fit: code comprehension, test generation, migration support, documentation, and onboarding.",
    "Use account health reviews to identify teams that need enablement, governance support, or executive air cover.",
    "Turn recurring field questions into product feedback themes and customer-facing enablement assets.",
  ];

  if (state.topBlocker === "security") {
    opportunities.push("Convert security alignment into a scale asset by documenting approved patterns and review paths.");
  }

  if (state.rolloutStage === "scale") {
    opportunities.push("Create a formal optimization cadence for business outcomes, usage quality, and expansion sequencing.");
  }

  return opportunities.slice(0, 5);
}

function getTimelinePlan(state) {
  const blocker = blockerProfiles[state.topBlocker].label;

  return [
    {
      label: "30 days",
      text: `Align the sponsor narrative, baseline readiness, clarify ${blocker} ownership, select priority workflows, and identify pilot champions.`,
    },
    {
      label: "60 days",
      text: "Run structured enablement, review adoption quality weekly, capture developer feedback, and remove friction in policy, workflow, or measurement.",
    },
    {
      label: "90 days",
      text: "Make the expansion decision, publish the operating playbook, brief executives on outcomes, and route field learnings to Product and Engineering.",
    },
  ];
}

function renderList(elementId, items) {
  const element = document.querySelector(`#${elementId}`);
  element.innerHTML = "";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.text || item;
    element.append(li);
  });
}

function renderTimeline(items) {
  const timeline = document.querySelector("#timeline-plan");
  timeline.innerHTML = "";

  items.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = "timeline-item";

    const heading = document.createElement("strong");
    heading.textContent = item.label;

    const text = document.createElement("p");
    text.textContent = item.text;

    wrapper.append(heading, text);
    timeline.append(wrapper);
  });
}

function setBarValue(elementId, rating) {
  const element = document.querySelector(`#${elementId}`);
  element.style.width = `${clamp((rating / 5) * 100, 0, 100)}%`;
}

function updateRangeValues() {
  rangeInputs.forEach((id) => {
    const input = document.querySelector(`#${id}`);
    const value = document.querySelector(`#${id}-value`);
    value.textContent = input.value;
  });
}

function renderResults(state) {
  const score = calculateScore(state);
  const risks = rankRisks(state);

  document.querySelector("#score-value").textContent = score;
  document.querySelector("#maturity-level").textContent = getMaturityLevel(score);
  document.querySelector("#rollout-motion").textContent = getRolloutMotion(score, state);
  document.querySelector("#result-team-size").textContent = teamProfiles[state.teamSize].label;
  document.querySelector("#result-rollout-stage").textContent = rolloutProfiles[state.rolloutStage].label;
  document.querySelector("#result-blocker").textContent = blockerProfiles[state.topBlocker].label;

  setBarValue("bar-ai", state.aiMaturity);
  setBarValue("bar-sponsor", state.sponsorStrength);
  setBarValue("bar-enablement", state.enablementMaturity);
  setBarValue("bar-sdlc", state.sdlcIntegration);
  setBarValue("bar-measurement", state.measurementDiscipline);

  renderList("risk-list", risks);
  renderList("mitigation-list", getMitigations(state, risks));
  renderList("metrics-list", getMetrics(state));
  renderList("enablement-list", getEnablementPlan(state));
  renderList("expansion-list", getExpansionOpportunities(state));
  renderTimeline(getTimelinePlan(state));

  document.querySelector("#executive-narrative").textContent = getExecutiveNarrative(score, state);

  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

rangeInputs.forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", updateRangeValues);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderResults(getFormData());
});

form.addEventListener("reset", () => {
  window.setTimeout(() => {
    updateRangeValues();
    results.hidden = true;
  }, 0);
});

updateRangeValues();
