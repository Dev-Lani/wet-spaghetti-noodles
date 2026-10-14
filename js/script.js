// ------------------------------------------------------------
// Tool data. Each tool is [name, description, badge].
//   badge "PDF → DOCX" renders as a from/to format badge.
//   badge "LOCK" (no arrow) renders as a plain label.
// To link a tool later, use the object form:
//   { name: "Merge PDF", desc: "...", badge: "PDF", url: "merge-pdf.html" }
// layout: "cards" (medium grid), "tiles" (roomy), "rows" (dense two-column list)
// ------------------------------------------------------------
const CATEGORIES = [
  {
    id: "from-pdf",
    title: "Convert from PDF",
    short: "From PDF",
    layout: "cards",
    tools: [
      ["PDF to Word", "Rebuild a PDF as an editable DOCX file.", "PDF → DOCX"],
      ["PDF to PowerPoint", "Turn PDF pages into editable PPTX slides.", "PDF → PPTX"],
      ["PDF to Excel", "Move tables from a PDF into an XLSX sheet.", "PDF → XLSX"],
      ["PDF to JPG", "Save each PDF page as a JPG image.", "PDF → JPG"],
      ["PDF to PNG", "Save each PDF page as a lossless PNG.", "PDF → PNG"],
      ["PDF to TIFF", "Save each PDF page as a TIFF image.", "PDF → TIFF"],
      ["PDF to BMP", "Save each PDF page as a BMP bitmap.", "PDF → BMP"],
      ["PDF to WebP", "Save each PDF page as a WebP image.", "PDF → WEBP"],
      ["PDF to SVG", "Convert each PDF page to a vector SVG.", "PDF → SVG"],
      ["PDF to TXT", "Dump the text of a PDF into a .txt file.", "PDF → TXT"],
      ["PDF to HTML", "Convert a PDF into an HTML page.", "PDF → HTML"],
      ["PDF to Markdown", "Convert PDF text and headings to Markdown.", "PDF → MD"],
      ["PDF to CSV", "Export PDF tables as CSV rows.", "PDF → CSV"],
      ["PDF to ePub", "Turn a PDF into an ePub for e-readers.", "PDF → EPUB"]
    ]
  },
  {
    id: "to-pdf",
    title: "Convert to PDF",
    short: "To PDF",
    layout: "cards",
    tools: [
      ["Word to PDF", "Convert DOC or DOCX to PDF, layout kept.", "DOCX → PDF"],
      ["PowerPoint to PDF", "Export PPT or PPTX slides as a PDF.", "PPTX → PDF"],
      ["Excel to PDF", "Print an XLS or XLSX sheet to PDF.", "XLSX → PDF"],
      ["JPG to PDF", "Put one or more JPGs into a PDF.", "JPG → PDF"],
      ["PNG to PDF", "Put one or more PNGs into a PDF.", "PNG → PDF"],
      ["Merge images to PDF", "Combine mixed images into one PDF, in your order.", "IMGS → PDF"],
      ["HTML to PDF", "Render an HTML file or URL as a PDF.", "HTML → PDF"],
      ["TXT to PDF", "Turn a plain text file into a PDF.", "TXT → PDF"],
      ["CSV to PDF", "Lay out CSV data as a PDF table.", "CSV → PDF"],
      ["Markdown to PDF", "Render Markdown as a formatted PDF.", "MD → PDF"],
      ["ePub to PDF", "Convert an ePub book to PDF.", "EPUB → PDF"],
      ["RTF / ODT to PDF", "Convert RTF or ODT documents to PDF.", "RTF → PDF"],
      ["Scan to PDF", "Photograph paper pages and save them as a PDF.", "SCAN → PDF"]
    ]
  },
  {
    id: "pdf-security",
    title: "PDF Security & Metadata",
    short: "PDF Security",
    layout: "tiles",
    tools: [
      ["Protect PDF", "Lock a PDF with a password.", "PDF · LOCK"],
      ["Unlock PDF", "Strip password protection from a PDF.", "PDF · UNLOCK"],
      ["Redact PDF", "Permanently remove selected text and images.", "PDF · REDACT"],
      ["Edit metadata", "Change a PDF's title, author, subject and keywords.", "PDF · META"],
      ["Remove metadata", "Clear author, creator and dates from a PDF.", "PDF · STRIP"]
    ]
  },
  {
    id: "pdf-extract",
    title: "PDF Extract",
    short: "PDF Extract",
    layout: "tiles",
    tools: [
      ["Extract text", "Copy all text out of a PDF.", "PDF · TEXT"],
      ["Extract images", "Save every embedded image from a PDF.", "PDF · IMAGES"],
      ["Extract tables", "Detect tables and export them as data.", "PDF · TABLES"],
      ["Attach / extract files", "Embed files inside a PDF or pull them out.", "PDF · FILES"]
    ]
  },
  {
    id: "documents",
    title: "Document & Data Converters",
    short: "Documents & Data",
    layout: "rows",
    tools: [
      ["Markdown to Word", "Convert Markdown to a DOCX file.", "MD → DOCX"],
      ["Word to Markdown", "Convert DOCX to Markdown.", "DOCX → MD"],
      ["Markdown to HTML", "Render Markdown as HTML markup.", "MD → HTML"],
      ["HTML to Markdown", "Convert HTML markup to Markdown.", "HTML → MD"],
      ["HTML to Word", "Convert an HTML page to DOCX.", "HTML → DOCX"],
      ["Word to HTML", "Convert DOCX to clean HTML.", "DOCX → HTML"],
      ["Word to TXT", "Strip a Word file down to plain text.", "DOCX → TXT"],
      ["Word to ePub", "Convert DOCX to an ePub book.", "DOCX → EPUB"],
      ["DOC to DOCX", "Convert old .doc files to .docx.", "DOC → DOCX"],
      ["XLS to XLSX", "Convert old .xls files to .xlsx.", "XLS → XLSX"],
      ["PPT to PPTX", "Convert old .ppt files to .pptx.", "PPT → PPTX"],
      ["RTF to DOCX", "Convert Rich Text files to DOCX.", "RTF → DOCX"],
      ["CSV to Excel", "Open CSV data as an XLSX sheet.", "CSV → XLSX"],
      ["Excel to CSV", "Export a sheet as CSV.", "XLSX → CSV"],
      ["Excel to HTML", "Export a sheet as an HTML table.", "XLSX → HTML"],
      ["Excel to JSON", "Turn sheet rows into JSON objects.", "XLSX → JSON"],
      ["JSON to Excel", "Flatten JSON into an XLSX sheet.", "JSON → XLSX"],
      ["JSON to CSV", "Flatten JSON into CSV rows.", "JSON → CSV"],
      ["CSV to JSON", "Turn CSV rows into JSON objects.", "CSV → JSON"],
      ["JSON to XML", "Convert JSON to XML.", "JSON → XML"],
      ["XML to JSON", "Convert XML to JSON.", "XML → JSON"],
      ["JSON to YAML", "Convert JSON to YAML.", "JSON → YAML"],
      ["YAML to JSON", "Convert YAML to JSON.", "YAML → JSON"],
      ["CSV to TSV", "Swap commas for tabs.", "CSV → TSV"],
      ["TSV to CSV", "Swap tabs for commas.", "TSV → CSV"],
      ["Merge Excel / CSV files", "Stack several sheets or CSVs into one file.", "MERGE"]
    ]
  },
  {
    id: "images",
    title: "Image Tools",
    short: "Images",
    layout: "cards",
    tools: [
      ["PNG to JPG", "Convert PNG to JPG for smaller files.", "PNG → JPG"],
      ["JPG to PNG", "Convert JPG to PNG.", "JPG → PNG"],
      ["WebP to JPG", "Convert WebP to JPG.", "WEBP → JPG"],
      ["HEIC to JPG", "Convert iPhone HEIC photos to JPG.", "HEIC → JPG"],
      ["SVG to PNG", "Rasterize an SVG at the size you set.", "SVG → PNG"],
      ["Convert to WebP", "Re-encode images as WebP.", "IMG → WEBP"],
      ["Convert to AVIF", "Re-encode images as AVIF.", "IMG → AVIF"],
      ["Image to ICO", "Make a multi-size favicon from an image.", "IMG → ICO"],
      ["Image to Base64", "Encode an image as a data URI.", "IMG → B64"],
      ["Compress image", "Shrink JPG, PNG or WebP file size.", "COMPRESS"],
      ["Resize image", "Set new dimensions by pixels or percent.", "RESIZE"],
      ["Crop image", "Cut an image down to a selected area.", "CROP"],
      ["Rotate / flip image", "Rotate in 90° steps or mirror an image.", "ROTATE"],
      ["Upscale image", "Enlarge an image 2x or 4x.", "UPSCALE"],
      ["Remove background", "Cut out the subject, keep the background transparent.", "BG REMOVE"],
      ["Add watermark", "Overlay text or a logo on an image.", "WATERMARK"],
      ["Blur / pixelate", "Hide faces or text inside a selected area.", "BLUR"],
      ["Remove EXIF data", "Delete GPS and camera data from photos.", "EXIF"],
      ["Image to text (OCR)", "Read text out of a screenshot or photo.", "IMG → TEXT"],
      ["Color picker", "Click a pixel, get its HEX and RGB values.", "PICKER"],
      ["Photo collage maker", "Arrange photos in a grid layout.", "COLLAGE"],
      ["GIF maker", "Turn a set of images into an animated GIF.", "IMGS → GIF"],
      ["GIF to MP4", "Convert a GIF to an MP4 video.", "GIF → MP4"]
    ]
  },
  {
    id: "developer",
    title: "Developer Tools",
    short: "Developer",
    layout: "rows",
    tools: [
      ["Base64 encode/decode", "Convert text to Base64 and back.", "BASE64"],
      ["URL encode/decode", "Percent-encode or decode a URL or query.", "%URL"],
      ["JSON formatter", "Validate, indent or minify JSON.", "{ } JSON"],
      ["JWT decoder", "Read a JWT's header and payload.", "JWT"],
      ["UUID generator", "Generate v4 UUIDs, one or many.", "UUID"],
      ["Hash generator", "Compute MD5, SHA-1 or SHA-256 of text.", "HASH"],
      ["Password generator", "Random passwords by length and character set.", "PASSWORD"],
      ["Regex tester", "Test a regex against text with live matches.", "REGEX"],
      ["Diff checker", "Compare two texts line by line.", "DIFF"],
      ["Minify JS/CSS/HTML", "Strip whitespace and comments from code.", "MINIFY"],
      ["Code beautifier", "Re-indent minified or messy code.", "BEAUTIFY"],
      ["Unix timestamp converter", "Convert epoch time to a date and back.", "EPOCH"],
      ["Cron expression helper", "Explain a cron string in plain words.", "CRON"],
      ["Color converter", "Convert between HEX, RGB and HSL.", "HEX/RGB/HSL"],
      ["CSS gradient generator", "Build a gradient and copy the CSS.", "GRADIENT"],
      ["Markdown previewer", "Type Markdown, see the rendered result.", "MD LIVE"],
      ["Lorem ipsum generator", "Generate placeholder paragraphs or words.", "LOREM"],
      ["QR code generator", "Make a QR code from text or a URL.", "TEXT → QR"],
      ["QR code scanner", "Decode a QR code from an image or camera.", "QR → TEXT"],
      ["Barcode generator", "Make Code 128, EAN and similar barcodes.", "BARCODE"]
    ]
  },
  {
    id: "file-utilities",
    title: "File Utilities",
    short: "File Utilities",
    layout: "tiles",
    tools: [
      ["ZIP files", "Pack files and folders into a .zip.", "FILES → ZIP"],
      ["Unzip files", "Extract the contents of a .zip.", "ZIP → FILES"],
      ["Batch rename files", "Rename many files with a pattern.", "RENAME"],
      ["File hash checker", "Compare a file's checksum to the one you expect.", "CHECKSUM"],
      ["File size converter", "Convert between KB, MB and GB.", "KB / MB / GB"],
      ["Duplicate file finder", "Find files with identical content.", "DUPES"]
    ]
  }
];

// Picked by hand. Names must match a tool name above.
const POPULAR = ["PDF to Word", "Word to PDF", "Compress image", "JSON formatter"];

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
const toolsEl = document.getElementById("tools");
const categoriesEl = document.getElementById("categories");
const popularEl = document.getElementById("popular");
const pillsEl = document.getElementById("pills");
const navEl = document.getElementById("mainNav");
const searchEl = document.getElementById("searchInput");
const noResultsEl = document.getElementById("noResults");

const state = { category: "all", query: "" };

function normalize(tool) {
  if (Array.isArray(tool)) {
    return { name: tool[0], desc: tool[1], badge: tool[2] || "", url: null };
  }
  return { name: tool.name, desc: tool.desc || "", badge: tool.badge || "", url: tool.url || null };
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function highlight(text, query) {
  const safe = esc(text);
  if (!query) return safe;
  const q = esc(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp("(" + q + ")", "ig"), "<mark>$1</mark>");
}

function badgeHtml(badge) {
  if (!badge) return "";
  if (badge.includes("→")) {
    const [from, to] = badge.split("→").map((s) => s.trim());
    return `<span class="badge" aria-hidden="true"><span class="b-from">${esc(from)}</span><span class="b-arrow">→</span><span class="b-to">${esc(to)}</span></span>`;
  }
  return `<span class="badge" aria-hidden="true"><span class="b-label">${esc(badge)}</span></span>`;
}

function cardHtml(t, q, extraClass) {
  const pending = t.url ? "" : ' data-pending="true"';
  return `
    <a class="tool-card${extraClass ? " " + extraClass : ""}" href="${t.url ? esc(t.url) : "#"}"${pending}>
      ${badgeHtml(t.badge)}
      <h3>${highlight(t.name, q)}</h3>
      <p>${highlight(t.desc, q)}</p>
    </a>`;
}

function renderPopular(q) {
  if (state.category !== "all" || q) {
    popularEl.innerHTML = "";
    return;
  }
  const all = CATEGORIES.flatMap((c) => c.tools.map(normalize));
  const items = POPULAR.map((name) => all.find((t) => t.name === name)).filter(Boolean);
  popularEl.innerHTML = `
    <section class="section" id="popular-tools">
      <div class="section-head">
        <span class="section-index">00</span>
        <h2>Popular tools</h2>
        <span class="section-count">${items.length}</span>
      </div>
      <div class="popular-grid">${items.map((t) => cardHtml(t, "", "is-popular")).join("")}</div>
    </section>`;
}

function render() {
  const q = state.query.trim().toLowerCase();
  let html = "";
  let shown = 0;

  CATEGORIES.forEach((cat, index) => {
    if (state.category !== "all" && state.category !== cat.id) return;

    const matches = cat.tools.map(normalize).filter((t) => {
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q) ||
        t.badge.toLowerCase().includes(q) ||
        cat.title.toLowerCase().includes(q)
      );
    });
    if (!matches.length) return;
    shown += matches.length;

    html += `
      <section class="section" id="${cat.id}">
        <div class="section-head">
          <span class="section-index">${String(index + 1).padStart(2, "0")}</span>
          <h2>${esc(cat.title)}</h2>
          <span class="section-count">${matches.length}</span>
        </div>
        <div class="layout-${cat.layout}">${matches.map((t) => cardHtml(t, q)).join("")}</div>
      </section>`;
  });

  categoriesEl.innerHTML = html;
  renderPopular(q);
  noResultsEl.hidden = shown !== 0;
}

function renderPills() {
  const total = CATEGORIES.reduce((n, c) => n + c.tools.length, 0);
  const items = [{ id: "all", short: "All", count: total }].concat(
    CATEGORIES.map((c) => ({ id: c.id, short: c.short, count: c.tools.length }))
  );
  pillsEl.innerHTML = items
    .map(
      (c) =>
        `<button type="button" class="pill${c.id === state.category ? " active" : ""}" data-cat="${c.id}" role="tab" aria-selected="${c.id === state.category}">${esc(c.short)}<span class="pill-count">${c.count}</span></button>`
    )
    .join("");
}

function renderNav() {
  const shortcuts = ["from-pdf", "to-pdf", "pdf-security", "documents", "images", "developer"];
  navEl.innerHTML =
    shortcuts
      .map((id) => {
        const cat = CATEGORIES.find((c) => c.id === id);
        return `<a href="#tools" data-cat="${id}">${esc(cat.short)}</a>`;
      })
      .join("") + `<a href="#tools" data-cat="all">All tools</a>`;
}

function setCategory(id) {
  state.category = id;
  renderPills();
  render();
}

pillsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".pill");
  if (btn) setCategory(btn.dataset.cat);
});

navEl.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-cat]");
  if (link) setCategory(link.dataset.cat);
});

// Tool cards without a link yet should not jump to the top of the page.
toolsEl.addEventListener("click", (e) => {
  if (e.target.closest(".tool-card[data-pending]")) e.preventDefault();
});

searchEl.addEventListener("input", () => {
  state.query = searchEl.value;
  render();
});

// Press "/" anywhere to jump to search.
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
    e.preventDefault();
    searchEl.focus();
  }
});

// Drop zone: visual feedback only. Files are not read or uploaded.
const dropzone = document.getElementById("dropzone");
["dragenter", "dragover"].forEach((type) =>
  dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.add("is-over");
  })
);
["dragleave", "drop"].forEach((type) =>
  dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-over");
  })
);
// Stop the browser from opening a file that is dropped elsewhere on the page.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

const totalTools = CATEGORIES.reduce((n, c) => n + c.tools.length, 0);
document.getElementById("heroMeta").textContent = `${totalTools} tools / ${CATEGORIES.length} categories`;
document.getElementById("year").textContent = new Date().getFullYear();

renderNav();
renderPills();
render();