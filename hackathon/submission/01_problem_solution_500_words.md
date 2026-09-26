# Problem & Solution Statement

**Submission status:** Draft; no measured time comparison is claimed.

**Project title:** ReleaseLens

**Short description:** ReleaseLens turns a software change into an evidence-backed release verification workflow.

**Problem & Solution Statement**

Before releasing a software change, developers must work out what changed, what may be affected, which checks to run, what failed, and what evidence supports their conclusions. That information is spread across Git history, source files, tests, command output, and notes. The resulting manual investigation can be fragmented and difficult to reproduce or communicate.

ReleaseLens organizes this work in one local-first workflow. A developer selects a Git repository and release candidate. The system inventories changed files, applies deterministic rules to map potential impacts, creates a verification plan, runs configured checks, records findings and command evidence, and generates a Markdown release-verification dossier. When the available evidence cannot establish a relationship, ReleaseLens is designed to retain that uncertainty instead of presenting an unsupported conclusion.

The controlled demo is a synthetic TypeScript order-management repository. Its release candidate changes discount calculation, and a contract test expects a 10% discount on 100 to produce 90. The intentionally defective calculation makes that test fail, giving the demonstration a reproducible change and verification result. The check runner accepts only configured commands.

ReleaseLens is a prototype and does not decide whether a release is safe. Repository analysis requires the API to run on the same machine as the repository; a hosted Vercel instance cannot read folders on a developer's computer. We have not completed a timed manual-versus-ReleaseLens comparison, so this statement makes no quantified efficiency claim.