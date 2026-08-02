// Why this file exists: all pdf-lib layout lives here, isolated from
// the controller. The controller decides WHO gets a certificate; this
// decides what one looks like. Coordinates are fiddly and get nudged
// often — keeping them in one LAYOUT block means tuning never touches
// request handling.
//
// The source artwork (assets/certificate-template.jpg) is a Rotaract
// "Certificate of MEMBERSHIP". We issue PARTICIPATION certificates, so
// three lines of pre-printed membership wording are painted over and
// replaced — not merely have their blanks filled. Sending a volunteer a
// certificate reading "Certificate of Membership" / "is a member in
// good standing with" would be wrong on its face.
//
// Depends on: pdf-lib, assets/certificate-template.jpg (optional)
// Depended on by: controllers/certificateController.js
const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

// Resolved from __dirname, not process.cwd(): the server is started
// both from backend/ and from the repo root, and a relative path would
// break in one of them.
const TEMPLATE_PATH = path.join(__dirname, "..", "assets", "certificate-template.jpg");

// Template is 458x354 (aspect 1.2938). US Letter landscape is 792x612
// (aspect 1.2941) — near-identical, so the image maps edge to edge with
// no cropping or letterboxing.
const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;

// Converting a measurement taken off the source image:
//   pdfX = imgX * 1.7293
//   pdfY = (354 - imgY) * 1.7293
// pdf-lib's origin is BOTTOM-left, the image's is top-left — that flip
// is the usual source of confusion when nudging these numbers.
const IMG_TO_PDF = PAGE_WIDTH / 458;

// The paint-over colour. The template interior is a very pale cream with
// a faint horizontal linen texture, so a solid fill is never a perfect
// match. Tuned to disappear at viewing scale; adjust here if the patches
// read as visible rectangles.
const COVER = rgb(0.976, 0.973, 0.965);
const INK = rgb(0.13, 0.12, 0.11);
const MUTED_INK = rgb(0.35, 0.33, 0.31);
const MAROON = rgb(0.545, 0.098, 0.208); // #8B2635, the app's primary
const GOLD = rgb(0.776, 0.631, 0.357); // #C6A15B

// ---------------------------------------------------------------------
// LAYOUT — every tunable number lives here. Nudge these, not the code.
//
// `cover` is [x, y, width, height] with y from the BOTTOM of the page.
// ---------------------------------------------------------------------
const LAYOUT = {
  // Title. Rect is taller than a naive read of the artwork suggests:
  // the ascenders of "Certificate of Membership" reach ~y=564, so a
  // rect topping out at 545 would leave the caps peeking above the
  // patch. The bottom edge still clears the decorative divider (~y=465).
  title: {
    cover: [200, 488, 515, 84],
    centerX: 462,
    baselineY: 512,
    size: 26,
  },

  // Replaces "Is a member in good standing with".
  //
  // Centred, not left-aligned: the wording being painted over is centred,
  // and both cover rects are themselves centred on x=462
  // (317 + 290/2, and 233 + 458/2), so 462 is the design's centre line.
  line1: {
    cover: [317, 325, 290, 37],
    centerX: 462,
    baselineY: 336,
    size: 11,
    maxWidth: 280,
  },

  // Replaces "and is thus accorded the fellowship and privileges of such
  // membership". Our replacement is much shorter than the sentence it
  // covers, so left-aligning it would sit visibly off-axis.
  line2: {
    cover: [233, 209, 458, 30],
    centerX: 462,
    baselineY: 222,
    size: 10,
    maxWidth: 450,
  },

  // Genuine blanks in the artwork — ruled lines meant to be written on,
  // so no cover needed.
  volunteerName: { at: [260, 388], size: 14, maxWidth: 300 },

  // Sits in the blank after the pre-printed "The Rotaract Club of".
  // Narrow slot; long org names shrink rather than overflow the rule.
  orgName: { at: [590, 294], size: 12, maxWidth: 120 },

  // "Dated this ____ day of ____"
  dateDay: { at: [277, 165], size: 11 },
  dateMonthYear: { at: [429, 165], size: 11 },

  // No slot exists on the artwork — this goes in the plain margin below
  // the frame.
  certificateCode: { centerX: 396, baselineY: 24, size: 8 },
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(day) {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

// Month names come from a fixed array rather than toLocaleString: the
// server's locale shouldn't decide what a certificate says.
function splitIssuedAt(issuedAt) {
  const date = issuedAt ? new Date(issuedAt) : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return {
    day: ordinal(safe.getDate()),
    monthYear: `${MONTHS[safe.getMonth()]}, ${safe.getFullYear()}`,
  };
}

// "4.00" -> "4", "4.50" -> "4.5". DECIMAL(6,2) always returns two
// places; "contributed 4.00 hours" reads like a bug.
function formatHours(hours) {
  const n = Number(hours);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

// Shrink until it fits. Truncating someone's name or their club's name
// would be worse than slightly smaller type.
function fitSize(font, text, preferredSize, maxWidth, minSize = 6) {
  let size = preferredSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return size;
}

function drawCentered(page, text, { font, size, centerX, baselineY, color }) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - width / 2, y: baselineY, size, font, color });
}

// The artwork pre-prints "The Rotaract Club of" immediately before the
// org blank. Most orgs here are named "Rotaract Club of X", which would
// render "The Rotaract Club of Rotaract Club of X". Dropping a leading
// "[The ]Rotaract Club of " makes it read correctly and leaves any other
// org name untouched.
function orgNameForBlank(orgName) {
  if (!orgName) return "";
  return orgName.replace(/^\s*(the\s+)?rotaract\s+club\s+of\s+/i, "").trim() || orgName;
}

// Template bytes read once and reused — a 20KB file that never changes
// at runtime. `false` means "checked, and it isn't there".
let templateBytes;
function loadTemplate() {
  if (templateBytes === undefined) {
    try {
      templateBytes = fs.readFileSync(TEMPLATE_PATH);
    } catch {
      templateBytes = false;
    }
  }
  return templateBytes;
}

// Drawn only when assets/certificate-template.jpg is absent, so the
// feature still works end to end without it — the endpoints, the
// download and the data are all exercised, just on plain stationery.
// Drop the artwork in and it's used automatically, no code change.
function drawFallbackStationery(page) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(0.984, 0.976, 0.965) });
  page.drawRectangle({
    x: 24, y: 24, width: PAGE_WIDTH - 48, height: PAGE_HEIGHT - 48,
    borderColor: MAROON, borderWidth: 6, color: undefined,
  });
  page.drawRectangle({
    x: 38, y: 38, width: PAGE_WIDTH - 76, height: PAGE_HEIGHT - 76,
    borderColor: GOLD, borderWidth: 1.5, color: undefined,
  });
}

// Only meaningful on the fallback: the real artwork already prints these
// captions, so drawing them again would double them up.
function drawFallbackCaptions(page, font) {
  drawCentered(page, "May it be known that", {
    font, size: 11, centerX: 462, baselineY: 420, color: MUTED_INK,
  });
  drawCentered(page, "The Rotaract Club of", {
    font, size: 12, centerX: 462, baselineY: 294, color: MUTED_INK,
  });
  page.drawText("Dated this", { x: 190, y: 165, size: 11, font, color: MUTED_INK });
  page.drawText("day of", { x: 355, y: 165, size: 11, font, color: MUTED_INK });
  // Rules under the two write-on blanks.
  for (const [x, w] of [[190, 380], [560, 150]]) {
    page.drawRectangle({ x, y: 382, width: w, height: 0.6, color: rgb(0.7, 0.68, 0.65) });
  }
}

/**
 * Renders one certificate. Nothing is written to disk — the caller
 * streams the returned Buffer straight to the client, so a certificate
 * always reflects current data rather than a file frozen at issue time.
 *
 * @param {object} data
 * @param {string} data.volunteerName
 * @param {string} data.orgName
 * @param {string} data.eventTitle
 * @param {Date|string} data.issuedAt
 * @param {number|string} data.hoursCredited
 * @param {string} data.certificateCode
 * @param {boolean} [data.debug] outlines the cover rects and marks every
 *        baseline, for measuring coordinates against the artwork.
 * @returns {Promise<Buffer>}
 */
async function renderCertificatePdf({
  volunteerName,
  orgName,
  eventTitle,
  issuedAt,
  hoursCredited,
  certificateCode,
  debug = false,
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const serif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const mono = await pdfDoc.embedFont(StandardFonts.Courier);

  const template = loadTemplate();
  const hasTemplate = template !== false;

  if (hasTemplate) {
    const background = await pdfDoc.embedJpg(template);
    page.drawImage(background, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });
  } else {
    drawFallbackStationery(page);
    drawFallbackCaptions(page, serifItalic);
  }

  // Painting over pre-printed wording is only needed when that wording
  // is actually there.
  const cover = (rect) => {
    if (!hasTemplate && !debug) return;
    const [x, y, width, height] = rect;
    page.drawRectangle({
      x, y, width, height,
      color: debug ? rgb(1, 0.85, 0.85) : COVER,
      ...(debug ? { borderColor: rgb(0.9, 0.1, 0.1), borderWidth: 0.75 } : {}),
    });
  };

  const mark = (x, y) => {
    if (!debug) return;
    page.drawRectangle({ x, y, width: 26, height: 0.6, color: rgb(0.1, 0.3, 0.9) });
  };

  // "Certificate of Membership" -> "Certificate of Participation"
  cover(LAYOUT.title.cover);
  drawCentered(page, "Certificate of Participation", {
    font: serifBold,
    size: LAYOUT.title.size,
    centerX: LAYOUT.title.centerX,
    baselineY: LAYOUT.title.baselineY,
    color: INK,
  });
  mark(LAYOUT.title.centerX - 13, LAYOUT.title.baselineY);

  // "Is a member in good standing with" -> participation wording.
  cover(LAYOUT.line1.cover);
  {
    const text = `has volunteered at ${eventTitle} with`;
    const size = fitSize(serifItalic, text, LAYOUT.line1.size, LAYOUT.line1.maxWidth);
    drawCentered(page, text, {
      font: serifItalic, size,
      centerX: LAYOUT.line1.centerX, baselineY: LAYOUT.line1.baselineY, color: INK,
    });
    mark(LAYOUT.line1.centerX - 13, LAYOUT.line1.baselineY);
  }

  // "and is thus accorded the fellowship..." -> hours contributed.
  cover(LAYOUT.line2.cover);
  {
    const text = `and has contributed ${formatHours(hoursCredited)} hours of dedicated service`;
    const size = fitSize(serifItalic, text, LAYOUT.line2.size, LAYOUT.line2.maxWidth);
    drawCentered(page, text, {
      font: serifItalic, size,
      centerX: LAYOUT.line2.centerX, baselineY: LAYOUT.line2.baselineY, color: INK,
    });
    mark(LAYOUT.line2.centerX - 13, LAYOUT.line2.baselineY);
  }

  // Volunteer name, on the first ruled blank.
  {
    const text = volunteerName ?? "";
    const size = fitSize(serif, text, LAYOUT.volunteerName.size, LAYOUT.volunteerName.maxWidth);
    const [x, y] = LAYOUT.volunteerName.at;
    page.drawText(text, { x, y, size, font: serif, color: INK });
    mark(x, y);
  }

  // Org name, in the blank after the pre-printed "The Rotaract Club of".
  {
    const text = orgNameForBlank(orgName);
    const size = fitSize(serif, text, LAYOUT.orgName.size, LAYOUT.orgName.maxWidth);
    const [x, y] = LAYOUT.orgName.at;
    page.drawText(text, { x, y, size, font: serif, color: INK });
    mark(x, y);
  }

  // "Dated this ___ day of ___"
  {
    const { day, monthYear } = splitIssuedAt(issuedAt);
    page.drawText(day, {
      x: LAYOUT.dateDay.at[0], y: LAYOUT.dateDay.at[1],
      size: LAYOUT.dateDay.size, font: serif, color: INK,
    });
    mark(...LAYOUT.dateDay.at);

    page.drawText(monthYear, {
      x: LAYOUT.dateMonthYear.at[0], y: LAYOUT.dateMonthYear.at[1],
      size: LAYOUT.dateMonthYear.size, font: serif, color: INK,
    });
    mark(...LAYOUT.dateMonthYear.at);
  }

  // Verification code, in the plain margin below the frame.
  drawCentered(page, `Certificate ID: ${certificateCode}`, {
    font: mono,
    size: LAYOUT.certificateCode.size,
    centerX: LAYOUT.certificateCode.centerX,
    baselineY: LAYOUT.certificateCode.baselineY,
    color: MUTED_INK,
  });

  return Buffer.from(await pdfDoc.save());
}

// Exported so the controller / a health check can tell whether the
// artwork is in place without duplicating the path.
function hasTemplate() {
  return loadTemplate() !== false;
}

module.exports = { renderCertificatePdf, hasTemplate, LAYOUT, IMG_TO_PDF, TEMPLATE_PATH };
