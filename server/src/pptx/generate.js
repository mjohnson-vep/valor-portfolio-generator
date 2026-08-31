const PptxGenJS = require('pptxgenjs');
const JSZip = require('jszip');
const { embedFonts } = require('./fonts');
const { addVMarkToSlide } = require('./vmark');

const SW = 13.333;
const SH = 7.5;
const BLUE = '0042E9';
const BLUE_DARK = '104999';
const WHITE = 'FFFFFF';
const GREY_LIGHT = 'E8E8E8';
const GREY_TEXT = '4A4A4A';
const MARGIN = 0.35;
const HEADER_H = 0.82;
const FOOTER_Y = SH - 0.38;
const COLS = 4;
const CARD_GAP = 0.13;
const CARD_W = (SW - 2 * MARGIN - (COLS - 1) * CARD_GAP) / COLS;
const CARD_H = 1.18;
const GRID_TOP = MARGIN + HEADER_H + 0.18;
const GRID_BOTTOM = FOOTER_Y - 0.12;
const USABLE_H = GRID_BOTTOM - GRID_TOP;
const MAX_ROWS = Math.floor((USABLE_H + CARD_GAP) / (CARD_H + CARD_GAP));
const CARDS_PER = COLS * MAX_ROWS;

const cX = (col) => MARGIN + col * (CARD_W + CARD_GAP);
const cY = (row) => GRID_TOP + row * (CARD_H + CARD_GAP);

function addHeader(slide, label, page, total) {
  slide.addShape('rect', { x: 0, y: 0, w: SW, h: HEADER_H, fill: { color: BLUE }, line: { color: BLUE } });
  slide.addText(label, { x: 0.32, y: 0, w: SW - 3.5, h: HEADER_H, fontSize: 16, bold: true, color: WHITE, fontFace: 'Europa', valign: 'middle', margin: 0, charSpacing: 1 });
  if (total > 1) {
    slide.addText(`${page} / ${total}`, { x: SW - 2.2, y: 0, w: 2.0, h: HEADER_H, fontSize: 11, color: 'A8C4FF', fontFace: 'Europa', align: 'right', valign: 'middle', margin: 0 });
  }
}

function addFooter(slide, pageNum) {
  slide.addShape('line', { x: MARGIN, y: FOOTER_Y - 0.03, w: SW - 2 * MARGIN, h: 0, line: { color: GREY_LIGHT, width: 0.75 } });
  slide.addText(
    [
      { text: 'VALOR', options: { bold: true, color: BLUE } },
      { text: ' EQUITY PARTNERS', options: { bold: false, color: BLUE_DARK } },
    ],
    { x: MARGIN, y: FOOTER_Y + 0.06, w: 4, h: 0.22, fontSize: 9, fontFace: 'Europa', valign: 'middle', margin: 0, charSpacing: 1.5 }
  );
  if (pageNum) {
    slide.addText(String(pageNum), { x: SW - 0.6, y: FOOTER_Y + 0.04, w: 0.4, h: 0.28, fontSize: 9, color: BLUE_DARK, fontFace: 'Europa', align: 'right', valign: 'middle', margin: 0 });
  }
}

function addCard(slide, company, col, row) {
  const x = cX(col);
  const y = cY(row);
  slide.addShape('rect', { x, y, w: CARD_W, h: CARD_H, fill: { color: WHITE }, line: { color: GREY_LIGHT, width: 0.75 } });
  slide.addShape('rect', { x, y, w: CARD_W, h: 0.055, fill: { color: BLUE }, line: { color: BLUE } });
  slide.addText(company.name || '', { x: x + 0.1, y: y + 0.07, w: CARD_W - 0.2, h: 0.3, fontSize: 12, bold: true, color: BLUE_DARK, fontFace: 'Europa', valign: 'top', margin: 0 });
  const urlHref = (company.url || '').match(/^https?:\/\//) ? company.url || '' : 'https://' + (company.url || '');
  slide.addText(company.url || '', { x: x + 0.1, y: y + 0.37, w: CARD_W - 0.2, h: 0.17, fontSize: 10, color: BLUE, fontFace: 'Europa', italic: true, valign: 'top', margin: 0, hyperlink: { url: urlHref } });
  slide.addShape('line', { x: x + 0.1, y: y + 0.55, w: CARD_W - 0.2, h: 0, line: { color: GREY_LIGHT, width: 0.5 } });
  slide.addText(company.desc || '', { x: x + 0.1, y: y + 0.59, w: CARD_W - 0.2, h: CARD_H - 0.69, fontSize: 10, color: GREY_TEXT, fontFace: 'Europa', valign: 'top', margin: 0, wrap: true });
}

// A company only makes it into the deck once it has a name, is checked "included",
// and has a description — the same gate v1 enforced via its needsDesc flag, just
// computed live here so it also applies to companies added after the rebuild.
function isDeckEligible(company) {
  return Boolean(company.name && company.name.trim()) && company.included !== false && Boolean(company.desc && company.desc.trim());
}

async function buildPptx(sections, deckSettings) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 13.333" x 7.5"

  const title = deckSettings.title || 'Portfolio Overview';
  const now = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const defaultDate = `${months[now.getMonth()]} ${now.getFullYear()}`;
  const date = deckSettings.date || defaultDate;
  const footer = deckSettings.footer || 'Confidential. Not For Further Distribution.';

  // ── TITLE SLIDE ──
  const titleSlide = pres.addSlide();
  titleSlide.background = { color: BLUE };
  titleSlide.addText(title, { x: 0.6, y: 2.1, w: 6, h: 0.85, fontSize: 32, bold: true, color: WHITE, fontFace: 'Europa', charSpacing: 3 });
  titleSlide.addText(date, { x: 0.6, y: 3.05, w: 5, h: 0.45, fontSize: 16, color: WHITE, fontFace: 'Europa' });
  titleSlide.addText(
    [
      { text: 'VALOR', options: { bold: true, color: WHITE } },
      { text: ' EQUITY PARTNERS', options: { bold: false, color: 'C0D4FF' } },
    ],
    { x: 0.6, y: SH - 0.75, w: 5, h: 0.28, fontSize: 12, fontFace: 'Europa', charSpacing: 1.5 }
  );
  titleSlide.addText(footer, { x: 0.6, y: SH - 0.48, w: 7, h: 0.28, fontSize: 8.5, color: 'C0D4FF', fontFace: 'Europa' });

  // ── SECTION SLIDES ──
  let pageNum = 1;
  for (const section of sections) {
    const companies = section.companies.filter(isDeckEligible);
    if (companies.length === 0) continue;
    const totalPages = Math.ceil(companies.length / CARDS_PER);

    for (let p = 0; p < totalPages; p++) {
      const slide = pres.addSlide();
      slide.background = { color: WHITE };
      addHeader(slide, section.pptLabel, p + 1, totalPages);
      addFooter(slide, pageNum++);
      companies.slice(p * CARDS_PER, (p + 1) * CARDS_PER).forEach((co, idx) => {
        addCard(slide, co, idx % COLS, Math.floor(idx / COLS));
      });
    }
  }

  const nodeBuffer = await pres.write({ outputType: 'nodebuffer' });
  const zip = await JSZip.loadAsync(nodeBuffer);

  await embedFonts(zip);
  // Title slide is always slide1.xml since it's the first slide added.
  await addVMarkToSlide(zip, 'ppt/slides/slide1.xml', {
    slideWidthIn: SW,
    slideHeightIn: SH,
    heightIn: 6.5,
    color: WHITE,
    shapeId: 900,
  });

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { buildPptx, CARDS_PER };
