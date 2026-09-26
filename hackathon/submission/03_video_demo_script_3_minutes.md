# ReleaseLens Video Demonstration Script

**Target duration:** 2:55 (175 seconds)<br>
**Live product operation:** 0:35-2:25 (110 seconds)<br>
**Recording rule:** Record the actual app and actual outputs. Do not add mock logs, screenshots, or measurements.

| Time | Screen action | Narration |
|---|---|---|
| 0:00-0:20 | Open on the ReleaseLens Overview page. | “Before a change ships, developers need to understand what changed, what it may affect, which checks to run, and what evidence supports the result. Those details are often scattered across Git, tests, terminals, and notes.” |
| 0:20-0:35 | Show the workflow navigation. | “ReleaseLens brings those steps into one evidence-backed workflow. It supports engineering judgment; it does not make the release decision.” |
| 0:35-0:55 | Click **Load Demo** and show the loaded repository and release candidate. | “I’m loading the controlled order-management demo. It is synthetic, and its Git history is prepared for a reproducible release-candidate comparison.” |
| 0:55-1:15 | Open **Change** and inspect the changed file and actual diff. | “The release candidate changes the pricing logic. We can inspect the changed file and the underlying diff rather than relying on a summary alone.” |
| 1:15-1:35 | Open **Impact** and point out evidence and any unknowns. | “ReleaseLens maps potential impact using repository evidence. Where the evidence does not establish a relationship, the system should keep it uncertain instead of inventing one.” |
| 1:35-1:55 | Open **Verification**, inspect the plan, then click **Run Verification**. | “The plan lists configured checks. I’m running them against the demo repository. The command runner uses an explicit allowlist.” |
| 1:55-2:10 | Show the actual completed checks and failed contract test. | “The contract test fails: a 10 percent discount on 100 is expected to produce 90. The implementation instead applies the percentage incorrectly.” |
| 2:10-2:25 | Open **Findings**, inspect evidence, then open **Dossier**. | “The failure and its captured output remain available in the finding and dossier. The dossier records what was checked and what remains unresolved; it does not label the release safe.” |
| 2:25-2:45 | Show a genuine Bob task-session summary screenshot, with task title visible. | “IBM Bob 2.0 supported **[name only the verified contribution shown in this real session]**. The repository will include the corresponding task-session evidence.” |
| 2:45-2:55 | Return to ReleaseLens title or dossier. | “ReleaseLens makes release-verification evidence easier to assemble, inspect, and communicate.” |

## Capture checklist

- Keep the complete recording at or below 180 seconds.
- Ensure the app is visibly operating from 0:35 through 2:25, at least 110 seconds.
- Use the locally running app and the actual demo scenario; confirm the failing contract test occurs during recording.
- Use an authentic Bob task-session screenshot. Remove the Bob segment if no verifiable screenshot is available; do not substitute a mock.
- Do not state time saved, error reduction, or other impact numbers without a measured comparison.
- Export as MP4 and verify the final duration and audio before submission.