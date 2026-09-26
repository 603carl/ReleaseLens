# ReleaseLens Hackathon Slide Deck

**Seven slides.** Use this file as the source for `04_release_lens_hackathon.pptx`. Replace each clearly marked capture instruction with a genuine screenshot before submitting. Do not represent placeholders as product evidence.

## Slide 1 — ReleaseLens

**Evidence-backed release verification**<br>
IBM Bob 2.0 Hackathon · September 2026

Visual: title over an authentic ReleaseLens screenshot or a clean crop of the actual product. Add the public repository URL in the footer.

Speaker note: “ReleaseLens turns a software change into a structured, evidence-backed verification workflow.”

## Slide 2 — The verification work is fragmented

**Change → investigate → find affected areas → choose checks → run them → triage → document evidence**

Key message: developers assemble the release picture from Git, source, tests, terminal output, and notes.

Visual: show the seven manual steps as a clear sequence. Do not imply measured time loss; no baseline has been recorded.

Speaker note: “The problem is not a lack of another summary. It is the effort of assembling and preserving the evidence behind a release decision.”

## Slide 3 — One traceable workflow

**Change → Impact → Verification → Checks → Findings → Evidence → Dossier**

Visual: seven connected stages, with a small evidence/source marker under each stage.

Speaker note: “ReleaseLens organizes these activities and retains the path from a finding back to its source.”

## Slide 4 — Inspect the actual change

**[INSERT AUTHENTIC SCREENSHOT: Change page with the demo release candidate and changed pricing file]**

Callouts: selected release candidate · changed file · inspectable Git diff.

Speaker note: “This is the controlled discount-pricing change in our synthetic TypeScript order-management repository.”

## Slide 5 — Impact and verification

**[INSERT AUTHENTIC SCREENSHOT: Impact page]**<br>
**[INSERT AUTHENTIC SCREENSHOT: Verification plan or completed checks]**

Callouts: deterministic evidence · explicit uncertainty · allowlisted commands.

Speaker note: “The prototype distinguishes what it can support from what remains unknown, then runs only configured commands.”

## Slide 6 — Failure, evidence, dossier

**[INSERT AUTHENTIC SCREENSHOT: failed contract test and linked finding]**<br>
**[INSERT AUTHENTIC SCREENSHOT: generated dossier]**

Caption: “The demo contract expects 10% off 100 to equal 90; the intentionally defective calculation fails that expectation.”

Speaker note: “The result is evidence for an engineer to assess, not an automatic declaration that the release is safe.”

## Slide 7 — Built with Bob; honest prototype limits

**[INSERT AUTHENTIC BOB TASK-SESSION SUMMARY SCREENSHOTS AND TASK IDS]**

Verified facts to show: public repository at https://github.com/603carl/ReleaseLens; local-first repository access; controlled synthetic demo. No measured impact result is available yet.

Speaker note: “IBM Bob’s contribution is documented with the actual task-session summaries shown here. ReleaseLens is a prototype; repository analysis runs locally beside the repository.”

## Asset requirements before submission

- Replace every `INSERT AUTHENTIC SCREENSHOT` instruction with a genuine capture.
- Replace the Bob evidence instruction only with authentic Bob task-session summary screenshots.
- If a measured-impact slide is required, collect the same-task manual and ReleaseLens timings first; do not invent values.
- Check text legibility at presentation size and confirm screenshots contain no personal, client, or confidential data.