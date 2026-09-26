import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pptxgen from 'pptxgenjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'hackathon', 'submission', '04_release_lens_hackathon.pptx');
const pptx = new pptxgen();

pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'ReleaseLens';
pptx.subject = 'IBM Bob 2.0 Hackathon submission deck';
pptx.title = 'ReleaseLens: Evidence-backed release verification';
pptx.company = 'ReleaseLens';
pptx.lang = 'en-US';
pptx.theme = {
  headFontFace: 'Aptos Display',
  bodyFontFace: 'Aptos',
  lang: 'en-US',
};
pptx.defineSlideMaster({
  title: 'BASE',
  background: { color: '0B0F14' },
  objects: [
    { rect: { x: 0.55, y: 0.42, w: 0.08, h: 0.34, fill: { color: 'F97316' }, line: { color: 'F97316' } } },
    { text: { text: 'RELEASELENS  /  IBM BOB HACKATHON', options: { x: 0.76, y: 0.42, w: 4.5, h: 0.28, color: 'AAB4C0', fontFace: 'Aptos', fontSize: 9, bold: true, charSpacing: 0.6, margin: 0 } } },
    { line: { x: 0.55, y: 7.04, w: 12.23, h: 0, line: { color: '29313A', width: 0.7 } } },
    { text: { text: 'LOCAL-FIRST PROTOTYPE  ·  EVIDENCE OVER ASSERTION', options: { x: 0.58, y: 7.12, w: 7.5, h: 0.18, color: '718091', fontFace: 'Aptos', fontSize: 8, margin: 0 } } },
  ],
  slideNumber: { x: 12.38, y: 7.1, color: 'AAB4C0', fontFace: 'Aptos', fontSize: 9 },
});

const C = {
  bg: '0B0F14',
  panel: '141B23',
  panel2: '10161D',
  border: '303A45',
  text: 'F2F5F7',
  muted: 'AAB4C0',
  dim: '718091',
  orange: 'F97316',
  yellow: 'FACC15',
  red: 'F87171',
  green: '4ADE80',
  cyan: '67D4E8',
};

function title(slide, eyebrow, heading, subheading = '') {
  slide.addText(eyebrow.toUpperCase(), {
    x: 0.62, y: 1.02, w: 11.8, h: 0.26, fontFace: 'Aptos', fontSize: 10,
    bold: true, color: C.orange, charSpacing: 1.2, margin: 0,
  });
  slide.addText(heading, {
    x: 0.62, y: 1.38, w: 12, h: 0.66, fontFace: 'Aptos Display',
    fontSize: 29, bold: true, color: C.text, margin: 0, breakLine: false,
  });
  if (subheading) {
    slide.addText(subheading, {
      x: 0.64, y: 2.12, w: 11.9, h: 0.45, fontFace: 'Aptos',
      fontSize: 13, color: C.muted, margin: 0, breakLine: false,
    });
  }
}

function card(slide, x, y, w, h, heading, body, accent = C.orange) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: C.panel }, line: { color: C.border, width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 0.055, h, fill: { color: accent }, line: { color: accent },
  });
  slide.addText(heading, {
    x: x + 0.22, y: y + 0.18, w: w - 0.42, h: 0.36,
    fontFace: 'Aptos Display', fontSize: 15, bold: true, color: C.text, margin: 0,
  });
  slide.addText(body, {
    x: x + 0.22, y: y + 0.63, w: w - 0.42, h: h - 0.78,
    fontFace: 'Aptos', fontSize: 11.5, color: C.muted, margin: 0,
    breakLine: false, valign: 'top',
  });
}

function capturePlaceholder(slide, x, y, w, h, label) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.05,
    fill: { color: C.panel2, transparency: 3 },
    line: { color: C.orange, width: 1.2, dash: 'dash' },
  });
  slide.addText('AUTHENTIC CAPTURE REQUIRED', {
    x: x + 0.2, y: y + h / 2 - 0.2, w: w - 0.4, h: 0.25,
    fontFace: 'Aptos', fontSize: 10, bold: true, color: C.orange,
    align: 'center', margin: 0, charSpacing: 0.7,
  });
  slide.addText(label, {
    x: x + 0.22, y: y + h / 2 + 0.12, w: w - 0.44, h: 0.45,
    fontFace: 'Aptos', fontSize: 11, color: C.muted,
    align: 'center', valign: 'mid', margin: 0,
  });
}

function step(slide, x, y, w, h, number, label, accent) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.05,
    fill: { color: C.panel }, line: { color: C.border, width: 0.8 },
  });
  slide.addText(number, {
    x: x + 0.12, y: y + 0.12, w: 0.35, h: 0.25,
    fontFace: 'Aptos', fontSize: 9, bold: true, color: accent, margin: 0,
  });
  slide.addText(label, {
    x: x + 0.12, y: y + 0.46, w: w - 0.24, h: h - 0.55,
    fontFace: 'Aptos Display', fontSize: 12, bold: true,
    color: C.text, margin: 0, valign: 'mid',
  });
}

const slide1 = pptx.addSlide('BASE');
slide1.addShape(pptx.ShapeType.rect, {
  x: 0.62, y: 1.45, w: 0.1, h: 2.1, fill: { color: C.orange }, line: { color: C.orange },
});
slide1.addText('ReleaseLens', {
  x: 0.98, y: 1.5, w: 8.5, h: 0.82, fontFace: 'Aptos Display',
  fontSize: 44, bold: true, color: C.text, margin: 0,
});
slide1.addText('Evidence-backed release verification', {
  x: 1.02, y: 2.52, w: 8.4, h: 0.45, fontFace: 'Aptos',
  fontSize: 22, color: C.muted, margin: 0,
});
slide1.addText('IBM Bob 2.0 Hackathon  ·  September 2026', {
  x: 1.04, y: 3.18, w: 7.9, h: 0.34, fontFace: 'Aptos',
  fontSize: 13, color: C.orange, bold: true, margin: 0,
});
slide1.addText('A local-first workflow for inspecting change, verification, and evidence.', {
  x: 1.04, y: 4.05, w: 7.8, h: 0.68, fontFace: 'Aptos',
  fontSize: 16, color: C.text, margin: 0, breakLine: false,
});
capturePlaceholder(slide1, 9.3, 1.48, 3.15, 3.35, 'Replace with an authentic ReleaseLens Overview screenshot.');
slide1.addText('github.com/603carl/ReleaseLens', {
  x: 1.04, y: 5.68, w: 6.4, h: 0.28, fontFace: 'Aptos',
  fontSize: 12, color: C.cyan, margin: 0,
});
slide1.addNotes('ReleaseLens turns a software change into a structured, evidence-backed verification workflow.');

const slide2 = pptx.addSlide('BASE');
title(slide2, 'The problem', 'Release verification is fragmented', 'Developers assemble the release picture from separate tools and artifacts.');
const manualSteps = [
  ['01', 'Change', C.orange], ['02', 'Investigate', C.yellow], ['03', 'Find impact', C.cyan],
  ['04', 'Choose checks', C.orange], ['05', 'Run tests', C.yellow], ['06', 'Triage', C.cyan], ['07', 'Record proof', C.orange],
];
manualSteps.forEach(([num, label, color], index) => {
  const x = 0.62 + index * 1.79;
  step(slide2, x, 3.06, 1.52, 1.23, num, label, color);
  if (index < manualSteps.length - 1) {
    slide2.addText('→', { x: x + 1.54, y: 3.48, w: 0.24, h: 0.26, fontSize: 15, color: C.dim, align: 'center', margin: 0 });
  }
});
card(slide2, 0.62, 4.85, 12.08, 1.05, 'The gap', 'Change context, verification results, and supporting evidence can be difficult to assemble and communicate consistently.', C.yellow);
slide2.addNotes('Describe the workflow problem without quoting an unmeasured time or error rate.');

const slide3 = pptx.addSlide('BASE');
title(slide3, 'The solution', 'One traceable verification workflow', 'Each stage keeps its result connected to repository or check evidence.');
const flow = [
  ['01', 'Change', C.orange], ['02', 'Impact', C.yellow], ['03', 'Verification', C.cyan], ['04', 'Checks', C.orange],
  ['05', 'Findings', C.yellow], ['06', 'Evidence', C.cyan], ['07', 'Dossier', C.orange],
];
flow.forEach(([num, label, color], index) => {
  const x = 0.62 + index * 1.79;
  step(slide3, x, 3.0, 1.52, 1.12, num, label, color);
  if (index < flow.length - 1) {
    slide3.addText('→', { x: x + 1.54, y: 3.4, w: 0.24, h: 0.26, fontSize: 15, color: C.dim, align: 'center', margin: 0 });
  }
});
slide3.addText('UNKNOWN stays UNKNOWN. The system does not invent a relationship to fill a gap.', {
  x: 1.1, y: 5.0, w: 11.1, h: 0.56, fontFace: 'Aptos Display',
  fontSize: 19, bold: true, color: C.text, align: 'center', margin: 0,
});
slide3.addNotes('Explain the flow and emphasize that unknown relationships remain explicitly uncertain.');

const slide4 = pptx.addSlide('BASE');
title(slide4, 'Change intelligence', 'Inspect the actual release candidate', 'Controlled TypeScript order-management demo; synthetic project data.');
capturePlaceholder(slide4, 0.64, 2.72, 8.15, 3.6, 'Capture the Change page with the selected candidate and actual pricing diff.');
card(slide4, 9.1, 2.84, 3.55, 1.0, 'Release candidate', 'Discount-pricing change', C.orange);
card(slide4, 9.1, 4.08, 3.55, 1.0, 'Inspect', 'Changed file and Git diff', C.yellow);
card(slide4, 9.1, 5.32, 3.55, 1.0, 'Source', 'Repository evidence', C.cyan);
slide4.addNotes('Show the real diff in the local ReleaseLens app.');

const slide5 = pptx.addSlide('BASE');
title(slide5, 'Impact and verification', 'Evidence before assertion', 'Deterministic rules propose what to inspect; configured checks provide results.');
capturePlaceholder(slide5, 0.64, 2.73, 5.85, 3.55, 'Capture the real Impact page and visible confidence states.');
capturePlaceholder(slide5, 6.84, 2.73, 5.85, 3.55, 'Capture the real Verification plan or running checks.');
slide5.addText('Allowlisted commands  ·  explicit uncertainty  ·  inspectable results', {
  x: 0.9, y: 6.42, w: 11.5, h: 0.27, fontFace: 'Aptos',
  fontSize: 12, color: C.orange, bold: true, align: 'center', margin: 0,
});
slide5.addNotes('Only call checks real if they were run live in the recorded demonstration.');

const slide6 = pptx.addSlide('BASE');
title(slide6, 'Failure to dossier', 'A failed check becomes inspectable evidence', 'The demo contract expects 10% off 100 to equal 90.');
capturePlaceholder(slide6, 0.64, 2.75, 5.75, 2.35, 'Capture the actual failed contract test and linked finding.');
capturePlaceholder(slide6, 6.67, 2.75, 6.02, 2.35, 'Capture the generated dossier with its evidence index.');
card(slide6, 0.64, 5.35, 12.05, 0.92, 'Decision boundary', 'The dossier records what was checked and what remains unresolved; it does not declare the release safe.', C.red);
slide6.addNotes('Show the real intentional contract failure and its evidence. No mock logs or invented severity.');

const slide7 = pptx.addSlide('BASE');
title(slide7, 'Engineering and limits', 'Built with Bob; honest about scope', 'Add genuine Bob task-session summaries before submitting.');
capturePlaceholder(slide7, 0.65, 2.72, 7.1, 2.85, 'Insert authentic Bob session summary screenshots and task IDs.');
card(slide7, 8.05, 2.72, 4.62, 1.06, 'Local-first', 'Repository analysis runs where the repository is accessible.', C.orange);
card(slide7, 8.05, 4.02, 4.62, 1.06, 'Prototype', 'No production-readiness claim or automated release decision.', C.yellow);
card(slide7, 8.05, 5.32, 4.62, 1.06, 'Impact', 'No manual-versus-tool measurement is claimed yet.', C.cyan);
slide7.addNotes('Replace the Bob evidence placeholder with genuine session summaries. State actual modes/tasks only.');

await pptx.writeFile({ fileName: output });
console.log(`Wrote ${output}`);