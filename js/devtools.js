// ------------------------------------------------------------
// Working developer tools. Loaded after script.js.
// Clicking a tool card whose name is registered below opens it in a dialog.
// To add another tool: TOOLS["Exact card name"] = (root) => { ...build UI inside root... }
// ------------------------------------------------------------
(() => {
  const TOOLS = {};
  const scripts = {};

  function loadScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = src;
        el.onload = resolve;
        el.onerror = () => {
          delete scripts[src];
          reject(new Error("Could not load " + src));
        };
        document.head.appendChild(el);
      });
    }
    return scripts[src];
  }

  function download(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Dialog ----------
  function openTool(name) {
    const dlg = document.createElement("dialog");
    dlg.className = "tool-dialog";
    dlg.setAttribute("aria-labelledby", "tdTitle");
    dlg.innerHTML =
      '<div class="td-head"><h2 class="td-title" id="tdTitle"></h2>' +
      '<button type="button" class="td-close">Close</button></div>' +
      '<div class="td-body"></div>';
    dlg.querySelector(".td-title").textContent = name;
    dlg.querySelector(".td-close").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", () => dlg.remove());
    document.body.appendChild(dlg);
    dlg.showModal();
    TOOLS[name](dlg.querySelector(".td-body"));
  }

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".tool-card");
    const h3 = card && card.querySelector("h3");
    if (!h3) return;
    const name = h3.textContent.trim();
    if (TOOLS[name]) {
      e.preventDefault();
      openTool(name);
    }
  });

  // ---------- QR code generator ----------
  TOOLS["QR code generator"] = (root) => {
    root.innerHTML = `
      <div class="td-grid">
        <div class="td-controls">
          <label class="td-field"><span>Text or URL</span>
            <textarea class="qr-text" rows="5" placeholder="https://example.com" spellcheck="false"></textarea>
          </label>
          <div class="td-row">
            <label class="td-field"><span>Error correction</span>
              <select class="qr-ecc">
                <option value="L">Low (7%)</option>
                <option value="M" selected>Medium (15%)</option>
                <option value="Q">Quartile (25%)</option>
                <option value="H">High (30%)</option>
              </select>
            </label>
            <label class="td-field"><span>Size</span>
              <select class="qr-size">
                <option value="256">256 px</option>
                <option value="384">384 px</option>
                <option value="512" selected>512 px</option>
                <option value="1024">1024 px</option>
              </select>
            </label>
          </div>
          <div class="td-row">
            <label class="td-field"><span>Foreground</span><input type="color" class="qr-fg" value="#17102b"></label>
            <label class="td-field"><span>Background</span><input type="color" class="qr-bg" value="#ffffff"></label>
            <label class="td-field"><span>Margin (modules)</span><input type="number" class="qr-margin" min="0" max="10" value="4"></label>
          </div>
        </div>
        <div class="td-output">
          <div class="td-preview">
            <canvas class="qr-canvas" width="1" height="1" hidden></canvas>
            <p class="td-msg" role="status"></p>
          </div>
          <div class="td-actions">
            <button type="button" class="td-btn td-btn-primary" data-act="png">Download PNG</button>
            <button type="button" class="td-btn" data-act="svg">Download SVG</button>
            <button type="button" class="td-btn" data-act="copy">Copy image</button>
          </div>
        </div>
      </div>`;

    const $ = (s) => root.querySelector(s);
    const text = $(".qr-text"), ecc = $(".qr-ecc"), size = $(".qr-size");
    const fg = $(".qr-fg"), bg = $(".qr-bg"), margin = $(".qr-margin");
    const canvas = $(".qr-canvas"), msg = $(".td-msg");
    const buttons = root.querySelectorAll("[data-act]");
    let current = null; // { qr, n, m, px }

    const lum = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a, b) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    function setState(note, warn, ready) {
      msg.textContent = note;
      msg.classList.toggle("warn", !!warn);
      msg.hidden = !note;
      canvas.hidden = !ready;
      buttons.forEach((b) => (b.disabled = !ready));
      if (!ready) current = null;
    }

    function render() {
      if (typeof qrcode === "undefined") return;
      if (!text.value) {
        setState("Type some text or a URL to generate a QR code.", false, false);
        return;
      }
      let qr;
      try {
        qr = qrcode(0, ecc.value);
        qr.addData(text.value);
        qr.make();
      } catch (err) {
        setState("This is too long for a QR code at this error-correction level. Shorten the text or choose a lower level.", true, false);
        return;
      }
      const n = qr.getModuleCount();
      const m = Math.min(10, Math.max(0, parseInt(margin.value, 10) || 0));
      const cell = Math.max(1, Math.floor(+size.value / (n + 2 * m)));
      const px = cell * (n + 2 * m);
      canvas.width = canvas.height = px;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = bg.value;
      ctx.fillRect(0, 0, px, px);
      ctx.fillStyle = fg.value;
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if (qr.isDark(r, c)) ctx.fillRect((c + m) * cell, (r + m) * cell, cell, cell);
      current = { qr, n, m, px };
      const low = contrast(fg.value, bg.value) < 3 || lum(fg.value) > lum(bg.value);
      setState(
        low ? "Low contrast, or a light code on a dark background. Some scanners may not read this." : "",
        low,
        true
      );
    }

    function toSvg() {
      const { qr, n, m, px } = current;
      const total = n + 2 * m;
      let d = "";
      for (let r = 0; r < n; r++) {
        let c = 0;
        while (c < n) {
          if (!qr.isDark(r, c)) { c++; continue; }
          let len = 0;
          while (c + len < n && qr.isDark(r, c + len)) len++;
          d += `M${c + m} ${r + m}h${len}v1h-${len}z`;
          c += len;
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${px}" height="${px}" shape-rendering="crispEdges">` +
        `<rect width="${total}" height="${total}" fill="${bg.value}"/><path d="${d}" fill="${fg.value}"/></svg>`;
    }

    root.querySelector(".td-actions").addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]");
      if (!act || !current) return;
      if (act.dataset.act === "png") {
        canvas.toBlob((b) => download(b, "qr-code.png"), "image/png");
      } else if (act.dataset.act === "svg") {
        download(new Blob([toSvg()], { type: "image/svg+xml" }), "qr-code.svg");
      } else {
        canvas.toBlob(async (b) => {
          const label = act.textContent;
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
            act.textContent = "Copied";
          } catch (err) {
            act.textContent = "Copy not supported";
          }
          setTimeout(() => (act.textContent = label), 1600);
        }, "image/png");
      }
    });

    [text, ecc, size, fg, bg, margin].forEach((el) => el.addEventListener("input", render));
    setState("Loading…", false, false);
    loadScript("vendor/qrcode.min.js")
      .then(() => { render(); text.focus(); })
      .catch(() => setState("Could not load vendor/qrcode.min.js. Check that the vendor folder is next to index.html.", true, false));
  };

    // ---------- PDF to Word ----------
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const DOCX = "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js";

  TOOLS["PDF to Word"] = (root) => {
    root.innerHTML = `
      <div class="td-controls">
        <label class="td-field"><span>PDF file</span>
          <input type="file" class="p2w-file" accept="application/pdf,.pdf">
        </label>
        <label class="td-field"><span>Pages (optional, e.g. 1-3,5)</span>
          <input type="text" class="p2w-pages" placeholder="All pages" spellcheck="false">
        </label>
        <div class="td-actions">
          <button type="button" class="td-btn td-btn-primary" disabled>Convert to DOCX</button>
        </div>
        <p class="td-msg" role="status" style="text-align:left"></p>
      </div>`;

    const $ = (s) => root.querySelector(s);
    const fileEl = $(".p2w-file"), pagesEl = $(".p2w-pages");
    const btn = $(".td-btn-primary"), msg = $(".td-msg");
    const say = (t, warn) => { msg.textContent = t; msg.classList.toggle("warn", !!warn); };

    let libsReady = false;
    say("Loading converter…");
    Promise.all([loadScript(PDFJS), loadScript(DOCX)])
      .then(() => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        libsReady = true;
        say("Pick a PDF to start.");
        sync();
      })
      .catch(() => say("Could not load the libraries. Check your internet connection.", true));

    const sync = () => (btn.disabled = !(libsReady && fileEl.files[0]));
    fileEl.addEventListener("change", sync);

    function parsePages(str, total) {
      if (!str.trim()) return Array.from({ length: total }, (_, i) => i + 1);
      const set = new Set();
      str.split(",").forEach((part) => {
        const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
        if (!m) return;
        const a = +m[1], b = m[2] ? +m[2] : a;
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= total) set.add(i);
      });
      return [...set].sort((x, y) => x - y);
    }

    // Group text items into lines, then lines into paragraphs.
    async function pageLines(page) {
      const { items } = await page.getTextContent();
      const rows = [];
      items
        .filter((it) => it.str && it.str.trim() !== "")
        .map((it) => ({
          s: it.str,
          x: it.transform[4],
          y: it.transform[5],
          w: it.width,
          size: Math.abs(it.transform[3]) || it.height || 10,
        }))
        .sort((a, b) => b.y - a.y || a.x - b.x)
        .forEach((it) => {
          const row = rows.find((r) => Math.abs(r.y - it.y) < Math.max(2, it.size * 0.4));
          if (row) row.items.push(it);
          else rows.push({ y: it.y, items: [it] });
        });
      return rows.map((r) => {
        r.items.sort((a, b) => a.x - b.x);
        let text = "", prevEnd = null;
        r.items.forEach((it) => {
          if (prevEnd !== null && it.x - prevEnd > it.size * 0.15 && !text.endsWith(" ") && !it.s.startsWith(" ")) text += " ";
          text += it.s;
          prevEnd = it.x + it.w;
        });
        return { y: r.y, size: Math.max(...r.items.map((i) => i.size)), text: text.trim() };
      });
    }

    function toParagraphs(lines, bodySize) {
      const paras = [];
      let cur = null, prev = null;
      lines.forEach((ln) => {
        const isHead = ln.size > bodySize * 1.25 && ln.text.length < 120;
        const gap = prev ? prev.y - ln.y : Infinity;
        const sizeChanged = prev && Math.abs(prev.size - ln.size) > bodySize * 0.15;
        if (!cur || gap > ln.size * 1.6 || sizeChanged || isHead || cur.head) {
          cur = { text: ln.text, head: isHead, size: ln.size };
          paras.push(cur);
        } else if (cur.text.endsWith("-")) {
          cur.text = cur.text.slice(0, -1) + ln.text;
        } else {
          cur.text += " " + ln.text;
        }
        prev = ln;
      });
      return paras;
    }

    btn.addEventListener("click", async () => {
      const file = fileEl.files[0];
      if (!file) return;
      btn.disabled = true;
      try {
        say("Reading PDF…");
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const wanted = parsePages(pagesEl.value, pdf.numPages);
        if (!wanted.length) throw new Error("No valid pages in that range. This PDF has " + pdf.numPages + " page(s).");

        const pageData = [];
        for (const n of wanted) {
          say(`Extracting page ${n} of ${pdf.numPages}…`);
          pageData.push(await pageLines(await pdf.getPage(n)));
        }

        const allSizes = pageData.flat().map((l) => l.size).sort((a, b) => a - b);
        const chars = pageData.flat().reduce((n, l) => n + l.text.length, 0);
        if (chars < 20) throw new Error("No selectable text found. This looks like a scanned PDF, which needs OCR first.");
        const bodySize = allSizes[Math.floor(allSizes.length / 2)] || 10;

        const { Document, Paragraph, TextRun, HeadingLevel, Packer } = docx;
        const children = [];
        pageData.forEach((lines, i) => {
          const paras = toParagraphs(lines, bodySize);
          paras.forEach((p, j) => {
            children.push(new Paragraph({
              pageBreakBefore: i > 0 && j === 0,
              heading: p.head ? (p.size > bodySize * 1.6 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2) : undefined,
              spacing: { after: 160 },
              children: [new TextRun({ text: p.text })],
            }));
          });
        });

        say("Building DOCX…");
        const doc = new Document({ sections: [{ children }] });
        const blob = await Packer.toBlob(doc);
        download(blob, file.name.replace(/\.pdf$/i, "") + ".docx");
        say(`Done. ${wanted.length} page(s) converted. Text and headings only; images and complex layouts are not kept.`);
      } catch (err) {
        say(err.message || "Conversion failed.", true);
      } finally {
        sync();
      }
    });
  };
})();

