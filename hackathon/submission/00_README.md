# ReleaseLens Submission Pack

This folder contains separate drafts and assets for the IBM Bob 2.0 Hackathon submission.

| File | Purpose | Status |
|---|---|---|
| `01_problem_solution_500_words.md` | Problem & Solution submission field | Draft; measured impact is explicitly not claimed |
| `02_bob_usage_500_words.md` | IBM Bob Usage submission field | Draft; replace bracketed prompts with verified session details |
| `03_video_demo_script_3_minutes.md` | Timed narration and live-demo actions | Script draft; record an actual MP4 |
| `04_slide_deck_outline.md` | Editable slide content and capture instructions | Source outline |
| `04_release_lens_hackathon.pptx` | Seven-slide PowerPoint with speaker notes | Generated; contains clearly marked screenshot placeholders |
| `05_submission_checklist.md` | Required uploads and outstanding checks | Current readiness status |
| `06_cover_image.svg` | Original 1920×1080 vector cover artwork | Generated; export to an accepted raster format if the portal requires it |

Generate the PowerPoint after editing its source script with:

```bash
node scripts/generate-hackathon-deck.mjs
```

Do not upload the Bob statement or deck as final until their evidence placeholders have been replaced and verified. The Bob session screenshots, cover image, and recorded video must be genuine assets supplied by the team.