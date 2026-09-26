# ReleaseLens — IBM Bob 2.0 Hackathon Master Documentation



---

# 00_MASTER_PROJECT_BRIEF.md

# ReleaseLens — IBM Bob 2.0 Hackathon Master Project Brief

## 1. Project identity

**Working name:** ReleaseLens  
**One-line description:** A developer workflow workbench that turns a code change into an evidence-backed release verification process.

**Hackathon theme:** Build with purpose using IBM Bob 2.0.

## 2. The problem

Software changes are often reviewed as isolated diffs. Before release, developers may need to manually determine:

- which modules and tests are affected;
- which interfaces or contracts may have changed;
- what verification should be performed;
- which failures are caused by the change versus pre-existing conditions;
- whether the change has adequate test coverage;
- what evidence supports a release decision.

The prototype addresses the workflow cost, fragmentation and rework in that process.

## 3. The proposed solution

ReleaseLens takes a repository and a proposed change/release candidate and produces a structured verification workflow:

1. Discover repository structure.
2. Inspect the change set.
3. Map changed files to affected modules.
4. Identify affected tests and missing verification areas.
5. Build a verification plan.
6. Execute deterministic checks and tests.
7. Triage failures against the changed areas.
8. Record findings and evidence.
9. Produce a release-verification dossier.

The prototype is deliberately evidence-first. It must never claim that a release is safe merely because a check passed.

## 4. Why this fits the hackathon

The hackathon asks for a working prototype that improves a specific developer workflow and demonstrates reduced time, manual effort, errors or rework. IBM Bob IDE must be a core component of the solution.

ReleaseLens is a concrete workflow rather than a generic chatbot. IBM Bob will be used throughout development for repository understanding, planning, implementation, parallel investigation, debugging, testing and documentation.

IBM's current documentation confirms that Bob provides Plan, Agent and Ask modes, persistent project context through `AGENTS.md`, subagents, file/command tools and custom modes. These capabilities should be used deliberately in the build rather than mentioned only in the final submission.

## 5. Target users

Primary:
- software developers;
- technical leads;
- release engineers.

Secondary:
- engineering managers who need auditable release evidence.

## 6. MVP boundary

The MVP will support a local/sample Git repository and one release candidate at a time.

### Required
- repository discovery;
- change-set analysis;
- impact mapping;
- verification plan;
- automated checks;
- test execution;
- failure classification;
- evidence capture;
- release dossier;
- polished web UI;
- reproducible demo repository.

### Explicitly out of scope
- production CI/CD integrations;
- GitHub/GitLab authentication;
- real enterprise deployment;
- autonomous production releases;
- arbitrary cloud infrastructure;
- claims of production-grade security;
- runtime dependence on a proprietary AI model.

## 7. Core product principle

**ReleaseLens does not replace engineering judgment. It makes the engineering evidence easier to assemble and inspect.**

## 8. Demo story

We will use a controlled sample repository containing a realistic change with known defects and incomplete verification.

The demo should show:

Change → Impact analysis → Verification plan → Checks/tests → Failure triage → Evidence → Release dossier.

## 9. Success measures

We will measure the same task manually and with ReleaseLens on the controlled demo scenario.

Metrics:
- elapsed time;
- number of manual steps;
- number of verification artefacts produced;
- number of relevant affected areas identified;
- number of failures correctly surfaced;
- time to produce the final dossier.

No metric may be presented as a benchmark unless actually measured.

## 10. Definition of success

A judge should be able to understand within the first minute:

1. what engineering workflow is painful;
2. what ReleaseLens changes;
3. where IBM Bob was used;
4. what tangible output the workflow produces.

Within the remaining demonstration, the product must visibly execute the workflow on a real/sample repository.



---

# 01_PRD.md

# ReleaseLens Product Requirements Document

## 1. Product objective

Build a working prototype that compresses the manual workflow required to verify a software change before release.

## 2. User story

As a developer preparing a release, I want to submit a change/repository and receive an evidence-backed verification dossier so that I can quickly understand impact, run relevant checks, inspect failures and communicate what was actually verified.

## 3. Functional requirements

### FR-01 Repository intake
The system shall load a controlled local/sample repository.

Acceptance:
- repository is detected;
- branch/commit metadata is shown;
- project type is detected;
- repository structure can be inspected.

### FR-02 Change analysis
The system shall identify changed files for the selected release candidate.

Acceptance:
- changed files are listed;
- additions/deletions/modifications are distinguished;
- the change summary is reproducible.

### FR-03 Impact mapping
The system shall map changed files to affected modules, routes, services, tests or configuration areas where the prototype can determine them deterministically.

Acceptance:
- each impact item links back to evidence;
- unknown relationships are explicitly marked unknown;
- the UI does not invent dependencies.

### FR-04 Verification planning
The system shall generate a structured verification plan from the detected change.

The plan must include:
- target;
- reason;
- check/test;
- expected evidence;
- status.

### FR-05 Check execution
The system shall execute configured deterministic checks and tests.

Examples:
- lint;
- type check;
- unit tests;
- integration tests;
- custom repository checks.

### FR-06 Failure triage
The system shall group and display failures and associate them with affected areas where evidence permits.

The system must distinguish:
- confirmed failure;
- suspected relationship;
- unknown cause.

### FR-07 Evidence
Each finding shall retain:
- source command/check;
- timestamp;
- status;
- relevant file/path;
- captured output excerpt;
- relationship to the change where known.

### FR-08 Release dossier
The system shall generate a human-readable release verification dossier containing:
- change summary;
- affected areas;
- verification plan;
- executed checks;
- failures;
- unresolved items;
- evidence;
- final verification status.

The system shall not automatically declare a release safe.

### FR-09 Demo reset
The system shall support resetting the controlled demo scenario so the same demonstration can be repeated.

## 4. Non-functional requirements

### NFR-01 Reproducibility
A fresh checkout must be able to run the demonstration using documented commands.

### NFR-02 Transparency
Every important conclusion must be traceable to a check or repository artefact.

### NFR-03 Local-first prototype
No personal or confidential data is required.

### NFR-04 Accessibility
Use semantic HTML, keyboard-accessible controls, visible focus states and sufficient text contrast.

### NFR-05 Performance
The demo workflow should produce a visible result within a practical hackathon demonstration window.

### NFR-06 Failure tolerance
A failed check must not crash the entire application.

## 5. Product language

Use:
- "verified";
- "detected";
- "evidence";
- "affected area";
- "unresolved";
- "not verified".

Avoid:
- "guaranteed safe";
- "zero risk";
- "fully autonomous";
- unsupported claims of accuracy.



---

# 02_PRODUCT_REQUIREMENTS.md

# ReleaseLens Detailed Product Requirements

## A. Core workflow

1. Select repository.
2. Select release candidate.
3. Inspect change.
4. Analyse impact.
5. Review verification plan.
6. Run verification.
7. Inspect findings.
8. Generate dossier.

## B. Status model

Use these statuses consistently:

- `PENDING`
- `RUNNING`
- `PASSED`
- `FAILED`
- `BLOCKED`
- `UNKNOWN`
- `NOT_VERIFIED`

Do not use "safe" as a technical status.

## C. Finding model

Every finding contains:

```text
id
title
severity
status
category
summary
evidence[]
affectedAreas[]
sourceCheck
createdAt
```

Severity:
- `INFO`
- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

Severity must be based on explicit deterministic rules in the prototype, not invented by the interface.

## D. Verification check model

```text
id
name
command
scope
expectedOutcome
status
startedAt
completedAt
exitCode
stdout
stderr
evidenceRefs[]
```

## E. Impact item model

```text
id
path
type
reason
confidence
evidenceRefs[]
```

Confidence values:
- `CONFIRMED`
- `SUPPORTED`
- `UNKNOWN`

The prototype must never silently convert UNKNOWN to CONFIRMED.

## F. Dossier sections

1. Executive verification summary
2. Release candidate
3. Change inventory
4. Impact map
5. Verification plan
6. Checks executed
7. Findings
8. Unresolved items
9. Evidence index
10. Reproduction commands
11. Engineering sign-off placeholder

## G. Empty/error states

Every major screen must handle:
- no repository;
- no changes;
- checks not run;
- check failure;
- missing evidence;
- incomplete analysis.

## H. Auditability

Every automated conclusion must expose the underlying source where practical.

Example:

`HIGH — API contract test failed`

Evidence:
`tests/contracts/orders.test.ts`
`npm test -- orders`
`exit code 1`

The UI should make it possible to move from finding → evidence → source.



---

# 03_SYSTEM_ARCHITECTURE.md

# ReleaseLens System Architecture

## 1. Architecture goal

Build a small, maintainable local application that demonstrates a complete developer workflow without introducing unnecessary infrastructure.

## 2. Proposed stack

Use:
- TypeScript
- Node.js
- React
- Vite
- Express or equivalent lightweight local API
- Git CLI
- Vitest/Jest or the repository's native test runner
- SQLite or JSON-backed local persistence for the prototype
- Markdown generation for the dossier

The implementation team may adjust the stack if Bob's repository inspection identifies a materially better fit. Any change must be documented before implementation.

## 3. Logical components

```text
┌───────────────────────────────────────────────┐
│                 ReleaseLens UI                │
│ Overview | Change | Impact | Verify | Dossier│
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│              Application API                  │
│ Repository | Analysis | Checks | Findings     │
└───────┬───────────────┬───────────────┬───────┘
        │               │               │
        ▼               ▼               ▼
   Git adapter     Analysis engine   Check runner
        │               │               │
        └───────────────┼───────────────┘
                        ▼
                Evidence store
                        │
                        ▼
                 Dossier generator
```

## 4. Repository adapter

Responsibilities:
- inspect Git status/diff;
- read repository metadata;
- list files;
- provide bounded file content to analysis modules.

Never execute arbitrary commands supplied directly by an end user without validation.

## 5. Analysis engine

Deterministic prototype analysis:
- changed-file classification;
- path-based module mapping;
- import/dependency inspection where practical;
- test-file matching;
- configuration impact detection.

## 6. Check runner

Only allow commands from a configured allowlist.

Example:

```text
npm test
npm run lint
npm run typecheck
npm run build
```

The demo repository should expose safe, deterministic commands.

## 7. Evidence store

Store:
- command;
- exit code;
- stdout/stderr;
- timestamp;
- affected check;
- source references.

## 8. Dossier generator

Generate Markdown first. Optionally render to HTML/PDF after the core workflow is stable.

## 9. Security boundary

This is a local hackathon prototype.

Never execute arbitrary repository scripts based solely on UI text. Use explicit configured commands.

Never include personal information in demo data.

## 10. Architecture principle

Prefer deterministic engineering evidence over opaque "AI says this is risky" behaviour.



---

# 04_DOMAIN_AND_DATA_MODEL.md

# ReleaseLens Domain and Data Model

## 1. Entities

### Repository
```text
id
name
path
branch
commit
detectedStack
createdAt
```

### ReleaseCandidate
```text
id
repositoryId
baseRef
targetRef
label
createdAt
```

### Change
```text
id
releaseCandidateId
path
changeType
linesAdded
linesRemoved
```

### ImpactItem
```text
id
changeId
path
type
reason
confidence
```

### VerificationPlan
```text
id
releaseCandidateId
createdAt
items[]
```

### VerificationItem
```text
id
planId
name
reason
command
expectedOutcome
status
```

### CheckRun
```text
id
verificationItemId
status
exitCode
stdout
stderr
startedAt
completedAt
```

### Finding
```text
id
releaseCandidateId
category
severity
status
title
summary
sourceCheckId
```

### Evidence
```text
id
findingId
type
source
excerpt
createdAt
```

### Dossier
```text
id
releaseCandidateId
generatedAt
markdownPath
```

## 2. Data rules

- Demo data must be synthetic.
- No personal information.
- No client data.
- No confidential company information.
- Do not scrape social media.
- Do not fabricate evidence.
- Every finding must have a source or explicitly state that it is an inference/unknown.

## 3. Persistence

For MVP, prefer SQLite or a clearly structured local JSON store.

The application must be able to reset demo state.



---

# 05_UX_UI_SPECIFICATION.md

# ReleaseLens UX/UI Specification

## 1. Visual direction

The interface should look like professional engineering software, not a generic AI dashboard.

Avoid:
- neon gradients;
- glowing AI imagery;
- robot graphics;
- excessive glassmorphism;
- decorative AI motifs;
- meaningless animated metrics.

Prioritize:
- dense but readable information;
- strong hierarchy;
- clear evidence;
- restrained colour;
- excellent typography;
- deliberate spacing;
- fast navigation.

## 2. Primary navigation

- Overview
- Change
- Impact
- Verification
- Findings
- Dossier

## 3. Overview screen

Show:
- repository;
- release candidate;
- current status;
- changed files count;
- impacted areas count;
- checks passed/failed;
- unresolved findings;
- "Generate dossier" action.

## 4. Change screen

Show:
- commit/base/target;
- changed files;
- additions/deletions;
- file classification;
- drill-down into diff.

## 5. Impact screen

Show an evidence-linked list/table:

| Area | Type | Reason | Confidence |
|---|---|---|---|

Provide source references.

## 6. Verification screen

Show a workflow timeline:

```text
Plan
  ↓
Checks
  ↓
Tests
  ↓
Triage
  ↓
Evidence
  ↓
Dossier
```

Each step has status and expandable evidence.

## 7. Findings screen

Prioritize actionable findings.

Each finding shows:
- severity;
- status;
- title;
- concise explanation;
- evidence;
- affected area;
- reproduction command.

## 8. Dossier screen

Display the generated release-verification report with:
- clear document hierarchy;
- print/export action;
- evidence references.

## 9. Interaction rules

- Destructive actions require confirmation.
- Long operations show progress.
- Failed operations provide actionable errors.
- Never hide uncertainty.
- Keyboard navigation must work.



---

# 06_ENGINEERING_WORKFLOW.md

# ReleaseLens Engineering Workflow

## 1. Workflow definition

ReleaseLens is built around this repeatable workflow:

```text
INTAKE
  ↓
REPOSITORY DISCOVERY
  ↓
CHANGE INVENTORY
  ↓
IMPACT ANALYSIS
  ↓
VERIFICATION PLAN
  ↓
CHECK EXECUTION
  ↓
FAILURE TRIAGE
  ↓
EVIDENCE ASSEMBLY
  ↓
RELEASE DOSSIER
```

## 2. Manual baseline

Before demonstrating ReleaseLens, perform the workflow manually on the controlled sample repository.

Record:
- start time;
- end time;
- manual steps;
- checks performed;
- findings;
- artefacts created.

Do not exaggerate the baseline.

## 3. ReleaseLens run

Repeat the same scenario with the application.

Record:
- start time;
- end time;
- automated steps;
- checks;
- findings;
- generated artefacts.

## 4. Comparison

Calculate:

```text
Time saved = manual elapsed time - ReleaseLens elapsed time

Reduction (%) =
((manual elapsed time - ReleaseLens elapsed time)
 / manual elapsed time) × 100
```

Only report results from the controlled test.

## 5. Evidence principle

The application should answer:

"What happened?"

"What was checked?"

"What failed?"

"What remains unknown?"

"What evidence supports this?"

It should not answer:

"Is this release definitely safe?"



---

# 07_IBM_BOB_BUILD_PLAYBOOK.md

# IBM Bob 2.0 Build Playbook

## Purpose

This document is the operational playbook for using IBM Bob 2.0 to build ReleaseLens.

IBM's current documentation identifies:
- Plan mode for planning/design;
- Agent mode for implementation;
- Ask mode for explanation/analysis;
- `AGENTS.md` for persistent project context;
- subagents for focused isolated work;
- file and command tools;
- custom modes;
- parallel tool execution.

Use these capabilities deliberately.

## Phase 0 — Initialize project context

Open the repository in IBM Bob IDE.

Use:

```text
/init
```

Review the generated `AGENTS.md` and `.bob` mode rules.

Do not begin major implementation until the project context is correct.

## Phase 1 — Architecture planning

Use Plan mode.

Prompt:

```text
Read the project documentation in /docs and the repository structure.

Do not implement code.

Create a detailed implementation plan for ReleaseLens based strictly on:
- 00_MASTER_PROJECT_BRIEF.md
- 01_PRD.md
- 02_PRODUCT_REQUIREMENTS.md
- 03_SYSTEM_ARCHITECTURE.md
- 04_DOMAIN_AND_DATA_MODEL.md
- 05_UX_UI_SPECIFICATION.md
- 06_ENGINEERING_WORKFLOW.md

Identify ambiguities and contradictions before proposing implementation.

Save the plan as docs/BOB_IMPLEMENTATION_PLAN.md.
```

Review the result manually.

## Phase 2 — Repository foundation

Use Agent mode.

Prompt:

```text
Implement the approved architecture foundation.

First inspect the existing repository.
Do not replace working project files unnecessarily.

Create the application structure, configuration, local persistence layer,
domain types, API boundaries, UI shell, test setup, and safe command-runner
boundary described in the approved plan.

Do not implement speculative features.
Run the available tests and build after the foundation is created.
```

## Phase 3 — Parallel exploration

Use Agent mode with subagents where appropriate.

Possible focused tasks:

### Explorer A
Inspect the repository adapter design and propose deterministic Git/change analysis.

### Explorer B
Inspect the verification/check-runner design and identify safety boundaries.

### Explorer C
Inspect the UX requirements and review the current implementation for missing states.

### Explorer D
Inspect the data model and identify inconsistencies.

Each task must return concrete findings and file-level recommendations.

Do not spawn subagents for trivial reads.

## Phase 4 — Implement core workflow

Build in this order:

1. repository intake;
2. change inventory;
3. impact analysis;
4. verification planning;
5. check runner;
6. evidence store;
7. findings;
8. dossier generation;
9. UI integration.

After each major stage:
- run tests;
- run build;
- inspect failures;
- fix root causes;
- commit a coherent change.

## Phase 5 — Bob actor/critic pattern

For high-risk implementation areas, use an actor/critic workflow.

Actor:
- implements the feature.

Critic:
- independently inspects the implementation;
- checks requirements;
- checks security boundaries;
- checks tests;
- reports defects.

Then ask the main Agent to reconcile findings.

Do not blindly accept the critic.

## Phase 6 — Verification

Ask Bob to:

```text
Run the full test suite, type check, lint and production build.

For every failure:
1. identify the root cause;
2. show the evidence;
3. propose the smallest maintainable fix;
4. implement it only after confirming the diagnosis;
5. rerun the relevant checks.

Do not suppress failing tests or weaken assertions merely to make the build pass.
```

## Phase 7 — Demo hardening

Create one deterministic demo repository/scenario.

Bob should:
- verify the scenario resets cleanly;
- verify all commands work;
- verify the UI produces the expected evidence;
- verify the dossier is reproducible.

## Phase 8 — Documentation

Use Bob to inspect the final repository and update:
- README;
- architecture documentation;
- setup instructions;
- demo instructions;
- test instructions;
- limitations.

Never allow Bob to invent benchmark numbers or unsupported product claims.

## Prompt discipline

Good prompt:
- states objective;
- references exact files;
- defines constraints;
- asks for evidence;
- defines completion criteria.

Bad prompt:
- "Make the app better."
- "Fix everything."
- "Make it production ready."

## Bobcoin discipline

Prioritize Bob for:
- architecture;
- cross-file implementation;
- difficult debugging;
- test generation;
- code review;
- repository analysis;
- documentation consistency.

Do simple mechanical edits manually when faster and safer.



---

# 08_AGENTS_MD_SEED.md

# ReleaseLens AGENTS.md Seed

## Project

ReleaseLens is a local developer workflow workbench for evidence-backed release verification.

## Primary objective

Improve the workflow of analysing and verifying software changes before release.

## Non-negotiable principles

1. Evidence over assertion.
2. Deterministic checks over invented conclusions.
3. Preserve uncertainty.
4. Never fabricate repository relationships.
5. Never claim a release is safe solely because automated checks passed.
6. Do not remove or weaken tests simply to obtain a green build.
7. Keep the application maintainable and easy to demonstrate.
8. Avoid unnecessary infrastructure.
9. Keep demo data synthetic and free of personal information.
10. Follow the documented architecture unless an explicit change is approved.

## Architecture

- React/Vite UI
- lightweight local API
- Git/repository adapter
- deterministic analysis engine
- safe check runner
- evidence store
- dossier generator

## Coding conventions

- TypeScript strictness where practical.
- Small modules.
- Explicit types for domain objects.
- Validate external input.
- Handle command failures.
- Never swallow errors silently.
- Tests accompany important logic.

## UI conventions

- professional engineering tool;
- no AI-themed decorative visuals;
- accessible controls;
- explicit status;
- clear evidence links;
- responsive layout.

## Testing

Before declaring work complete:
- unit tests;
- integration tests for core workflow;
- type check;
- lint;
- production build;
- demo scenario.

## Bob workflow

Use Plan mode before substantial new architecture.
Use Agent mode for implementation.
Use Ask mode for repository explanation.
Use subagents only for focused, self-contained investigations.

## Source of truth

The `/docs` directory contains the product and engineering requirements.
When requirements conflict, stop and report the conflict instead of guessing.



---

# 09_IMPLEMENTATION_PLAN.md

# ReleaseLens 48-Hour Implementation Plan

## Stage 1 — Foundation

Deliver:
- project scaffold;
- Bob initialization;
- domain types;
- local persistence;
- UI shell;
- API shell;
- test infrastructure.

Exit criteria:
- app runs;
- build passes;
- tests run.

## Stage 2 — Repository intelligence

Deliver:
- repository intake;
- Git metadata;
- changed-file inventory;
- diff display.

Exit criteria:
- controlled repository loads;
- change set is reproducible.

## Stage 3 — Impact analysis

Deliver:
- file classification;
- module mapping;
- test mapping;
- evidence references.

Exit criteria:
- known demo relationships are detected;
- unknown relationships remain unknown.

## Stage 4 — Verification

Deliver:
- verification plan;
- safe command allowlist;
- check execution;
- captured output.

Exit criteria:
- pass and failure scenarios both work.

## Stage 5 — Findings and dossier

Deliver:
- findings model;
- evidence links;
- Markdown dossier;
- dossier UI.

Exit criteria:
- every demo finding traces to evidence.

## Stage 6 — UX polish

Deliver:
- visual hierarchy;
- empty states;
- errors;
- loading;
- responsive behaviour;
- accessibility fixes.

## Stage 7 — Demo repository

Create a controlled sample project with:
- one meaningful feature change;
- at least one intentional test failure;
- at least one missing verification relationship;
- enough structure to demonstrate impact analysis.

The defect must be reproducible and documented.

## Stage 8 — Validation

Run:
- clean install;
- tests;
- lint;
- type check;
- build;
- demo reset;
- complete demo run.

## Stage 9 — Submission assets

Prepare:
- public repository;
- Bob evidence;
- cover image;
- slides;
- 3-minute video;
- problem/solution statement;
- Bob usage statement.



---

# 10_TEST_STRATEGY.md

# ReleaseLens Test Strategy

## 1. Testing layers

### Unit
Test:
- change classification;
- path mapping;
- status transitions;
- severity rules;
- dossier rendering;
- command validation.

### Integration
Test:
- repository intake → change inventory;
- change inventory → impact analysis;
- verification plan → check runner;
- check results → findings;
- findings → dossier.

### End-to-end
Run the complete controlled demo scenario.

## 2. Negative testing

Verify:
- nonexistent repository;
- invalid command;
- command timeout;
- malformed Git state;
- empty change set;
- failed test;
- missing evidence;
- interrupted run.

## 3. Safety tests

The command runner must reject commands outside the configured allowlist.

Never interpolate untrusted strings directly into a shell command.

## 4. Acceptance test

Given the controlled sample repository:

1. load repository;
2. select release candidate;
3. detect changed files;
4. identify affected area;
5. generate verification plan;
6. run checks;
7. surface intentional failure;
8. attach evidence;
9. generate dossier.

All nine steps must be demonstrable.

## 5. Regression rule

No feature is complete if it breaks the full test/build pipeline.



---

# 11_DEMO_SCENARIO.md

# ReleaseLens Demo Scenario

## Goal

Demonstrate a realistic developer workflow in under three minutes.

## Sample project

Create a small TypeScript service representing an order-management API.

Suggested structure:

```text
demo-repository/
├── src/
│   ├── orders/
│   ├── payments/
│   └── shared/
├── tests/
│   ├── orders/
│   └── contracts/
├── package.json
└── README.md
```

## Scenario

A release candidate modifies order/payment behaviour.

The controlled change should contain:
- a legitimate feature change;
- an affected module;
- a contract expectation;
- an intentionally failing verification test;
- a verification gap that ReleaseLens can surface.

Do not make the scenario artificially trivial.

## Demonstration sequence

### 0:00–0:20
Show the repository and explain:

"Before release, the developer needs to understand what this change affects, what must be tested, and what actually passed."

### 0:20–0:40
Open ReleaseLens and load the candidate.

### 0:40–1:10
Show:
- change inventory;
- impact map;
- generated verification plan.

### 1:10–1:50
Run verification.

Show real:
- checks;
- test execution;
- failure.

### 1:50–2:20
Open finding.

Show:
- failure;
- affected area;
- command;
- evidence;
- unresolved status.

### 2:20–2:45
Generate dossier.

Show the report.

### 2:45–3:00
Show measured comparison and state:

"ReleaseLens does not replace engineering judgment. It makes the verification evidence faster to assemble and easier to inspect."

## Demo rule

Every screen shown must be functional. No fake counters, fake logs or fake success states.



---

# 12_BOB_EVIDENCE_PLAN.md

# IBM Bob Evidence Plan

## Purpose

The hackathon requires Bob IDE task-session summary screenshots as evidence of Bob usage. This document defines how we preserve evidence.

## Evidence categories

### E01 — Project initialization
Capture:
- Bob IDE project context;
- `/init`;
- resulting `AGENTS.md`.

### E02 — Architecture planning
Capture:
- Plan mode;
- planning task;
- saved implementation plan.

### E03 — Repository analysis
Capture meaningful repository investigation.

### E04 — Core implementation
Capture Bob implementing a substantial workflow component.

### E05 — Parallel/subagent work
Capture at least one legitimate focused investigation using subagents where appropriate.

### E06 — Testing/debugging
Capture Bob diagnosing a real failing test/build.

### E07 — Review
Capture Bob reviewing implementation against requirements.

### E08 — Documentation
Capture final repository/documentation update.

## Evidence discipline

Do not create fake screenshots.

Do not manufacture Bob conversations after the fact.

Screenshots must correspond to real work performed in the hackathon.

## Repository evidence structure

```text
hackathon/
└── bob-evidence/
    ├── E01-project-init/
    ├── E02-planning/
    ├── E03-analysis/
    ├── E04-implementation/
    ├── E05-subagents/
    ├── E06-debugging/
    ├── E07-review/
    └── E08-documentation/
```

## Evidence index

Maintain:

| ID | Task | Bob mode | Outcome | Screenshot |
|---|---|---|---|---|

Update the index after each major Bob session.

## Important

The hackathon guide requires participants to upload relevant Bob IDE task session summary screenshots to the repository. Follow the official submission instructions exactly when uploading them.



---

# 13_HACKATHON_SUBMISSION_PLAN.md

# Hackathon Submission Plan

## Required submission fields

Prepare:

1. Project title
2. Short description
3. Long description / Problem & Solution Statement
4. IBM Bob Usage Statement
5. Technology/category tags
6. Public code repository
7. IBM Bob task-session summary screenshots
8. Demo application platform
9. Application URL
10. Cover image
11. Video demonstration
12. Slide presentation

## Problem & Solution Statement

Maximum 500 words.

Must answer:
- What developer workflow is problematic?
- Why does it consume time/effort or create errors/rework?
- What does ReleaseLens change?
- How does the prototype work?
- What evidence demonstrates the improvement?

## IBM Bob Usage Statement

Maximum 500 words.

Must answer:
- how Bob was used;
- which Bob modes were used;
- where Bob contributed substantial engineering work;
- how subagents/parallel work were used where appropriate;
- how Bob influenced implementation/testing/documentation;
- where the evidence exists in the repository.

Never claim Bob performed work it did not perform.

## Video

Maximum 3 minutes.

At least 90 seconds must show the solution operating.

Recommended:
- problem: 20–30 sec;
- product explanation: 15–20 sec;
- live workflow: 90–120 sec;
- measured result: 15–20 sec.

## Slides

Suggested 7 slides:

1. Title
2. Developer problem
3. Workflow before
4. ReleaseLens solution
5. IBM Bob contribution
6. Live result / evidence
7. Impact + repository/demo

## Submission integrity

Do not:
- invent metrics;
- fabricate customer adoption;
- claim production readiness;
- hide known limitations;
- fabricate Bob usage.



---

# 14_DEFINITION_OF_DONE.md

# ReleaseLens Definition of Done

The project is not finished until all applicable items are true.

## Product

- [ ] Repository loads.
- [ ] Release candidate loads.
- [ ] Changed files are detected.
- [ ] Impact analysis works.
- [ ] Verification plan is visible.
- [ ] Checks execute.
- [ ] Failures are surfaced.
- [ ] Evidence is retained.
- [ ] Findings are traceable.
- [ ] Dossier is generated.
- [ ] Demo reset works.

## Engineering

- [ ] Tests pass.
- [ ] Type check passes.
- [ ] Lint passes or documented exceptions exist.
- [ ] Production build passes.
- [ ] No known critical runtime error remains.
- [ ] No arbitrary command execution path exists in the demo.
- [ ] Error handling is implemented.

## UX

- [ ] Loading states.
- [ ] Empty states.
- [ ] Error states.
- [ ] Keyboard navigation.
- [ ] Visible focus.
- [ ] Responsive layout.
- [ ] Clear status language.
- [ ] No fake metrics.

## Evidence

- [ ] Bob project initialization evidence.
- [ ] Planning evidence.
- [ ] Implementation evidence.
- [ ] Subagent/parallel evidence where actually used.
- [ ] Debugging evidence.
- [ ] Review evidence.
- [ ] Evidence index complete.
- [ ] Bob task-session summaries preserved.

## Demo

- [ ] Clean checkout works.
- [ ] Demo repository is included/documented.
- [ ] Demo can be reset.
- [ ] End-to-end scenario works.
- [ ] 90+ seconds of actual product operation can be shown.
- [ ] Measured baseline exists.
- [ ] No unsupported claims.

## Submission

- [ ] Public repository.
- [ ] Project description.
- [ ] Problem & Solution Statement <=500 words.
- [ ] Bob Usage Statement <=500 words.
- [ ] Cover image.
- [ ] Video <=3 minutes.
- [ ] Slides.
- [ ] Application URL/platform information.

