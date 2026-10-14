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

  // ---------- PDF to Word (layout-aware) ----------
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
    const sync = () => (btn.disabled = !(libsReady && fileEl.files[0]));
    say("Loading converter…");
    Promise.all([loadScript(PDFJS), loadScript(DOCX)])
      .then(() => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        libsReady = true;
        say("Pick a PDF to start.");
        sync();
      })
      .catch(() => say("Could not load the libraries. Check your internet connection.", true));
    fileEl.addEventListener("change", sync);

    const tw = (pt) => Math.round(pt * 20);

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

    // ----- fonts -----
    function fontInfo(page, id, styles) {
      let raw = "";
      try { raw = page.commonObjs.get(id).name || ""; } catch (e) {}
      const generic = (styles[id] && styles[id].fontFamily) || "";
      const n = raw.replace(/^[A-Z]{6}\+/, "");
      const b = /bold|black|heavy|semibold|demi/i.test(n);
      const i = /italic|oblique/i.test(n);
      let f = "Arial";
      if (/courier|mono|consolas/i.test(n)) f = "Courier New";
      else if (/times|georgia|garamond|cambria|serif/i.test(n) && !/sans/i.test(n)) f = /georgia/i.test(n) ? "Georgia" : /cambria/i.test(n) ? "Cambria" : "Times New Roman";
      else if (/calibri/i.test(n)) f = "Calibri";
      else if (/verdana/i.test(n)) f = "Verdana";
      else if (!n) f = /monospace/.test(generic) ? "Courier New" : /serif/.test(generic) && !/sans/.test(generic) ? "Times New Roman" : "Arial";
      return { b, i, f };
    }

    // ----- images -----
    const mul = (m, n) => [
      m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
      m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
      m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
    ];

    function getImg(page, name) {
      for (const store of [page.objs, page.commonObjs]) {
        try { const o = store.get(name); if (o) return o; } catch (e) {}
      }
      return null;
    }

    function imgToPng(img) {
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      if (img.bitmap) {
        c.width = img.bitmap.width; c.height = img.bitmap.height;
        ctx.drawImage(img.bitmap, 0, 0);
      } else {
        const { width: w, height: h, data: d } = img;
        c.width = w; c.height = h;
        const id = ctx.createImageData(w, h), o = id.data;
        if (d.length === w * h * 4) o.set(d);
        else if (d.length === w * h * 3) {
          for (let p = 0, q = 0; p < w * h; p++) { o[q++] = d[p * 3]; o[q++] = d[p * 3 + 1]; o[q++] = d[p * 3 + 2]; o[q++] = 255; }
        } else {
          const rb = (w + 7) >> 3;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const v = (d[y * rb + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0, q = (y * w + x) * 4;
            o[q] = o[q + 1] = o[q + 2] = v; o[q + 3] = 255;
          }
        }
        ctx.putImageData(id, 0, 0);
      }
      return new Promise((res, rej) =>
        c.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error("png"))), "image/png"));
    }

    // ----- read one page into rows (lines) + images -----
    async function readPage(page) {
      const vp = page.getViewport({ scale: 1 });
      const ops = await page.getOperatorList(); // also forces fonts to load
      const tc = await page.getTextContent();
      const cache = {};
      const fi = (id) => cache[id] || (cache[id] = fontInfo(page, id, tc.styles));

      const items = tc.items
        .filter((it) => it.str && it.str.trim() !== "")
        .map((it) => {
          const f = fi(it.fontName);
          return { s: it.str, x: it.transform[4], y: it.transform[5], w: it.width,
            size: Math.abs(it.transform[3]) || it.height || 10, b: f.b, i: f.i, f: f.f };
        })
        .sort((a, b) => b.y - a.y || a.x - b.x);

      const rows = [];
      items.forEach((it) => {
        const r = rows.find((r) => Math.abs(r.y - it.y) < Math.max(2, it.size * 0.4));
        if (r) r.items.push(it); else rows.push({ y: it.y, items: [it] });
      });
      rows.sort((a, b) => b.y - a.y);

      rows.forEach((r) => {
        r.items.sort((a, b) => a.x - b.x);
        const segs = [];
        let seg = null, prevEnd = null;
        r.items.forEach((it) => {
          const gap = prevEnd === null ? 0 : it.x - prevEnd;
          let text = it.s;
          if (!seg || gap > Math.max(it.size * 2.2, 14)) {
            seg = { x: it.x, x2: it.x + it.w, runs: [] };
            segs.push(seg);
          } else if (gap > it.size * 0.15 && !/\s$/.test(seg.runs[seg.runs.length - 1].t) && !/^\s/.test(text)) {
            text = " " + text;
          }
          const last = seg.runs[seg.runs.length - 1];
          if (last && last.b === it.b && last.i === it.i && last.f === it.f && Math.abs(last.s - it.size) < 0.5) last.t += text;
          else seg.runs.push({ t: text, b: it.b, i: it.i, f: it.f, s: it.size });
          seg.x2 = it.x + it.w;
          prevEnd = it.x + it.w;
        });
        r.segs = segs;
        r.x = segs[0].x;
        r.x2 = segs[segs.length - 1].x2;
        r.size = Math.max(...r.items.map((i) => i.size));
        delete r.items;
      });

      const images = [];
      const OPS = pdfjsLib.OPS;
      let ctm = [1, 0, 0, 1, 0, 0];
      const st = [];
      for (let k = 0; k < ops.fnArray.length; k++) {
        const fn = ops.fnArray[k], a = ops.argsArray[k];
        if (fn === OPS.save) st.push(ctm);
        else if (fn === OPS.restore) ctm = st.pop() || ctm;
        else if (fn === OPS.transform) ctm = mul(a, ctm);
        else if (fn === OPS.paintImageXObject) {
          const w = Math.hypot(ctm[0], ctm[1]), h = Math.hypot(ctm[2], ctm[3]);
          if (w < 12 || h < 12) continue;
          const o = getImg(page, a[0]);
          if (!o) continue;
          try {
            const data = await imgToPng(o);
            images.push({ data, x: ctm[4], w, h, y: Math.max(ctm[5], ctm[5] + ctm[3]), bottom: Math.min(ctm[5], ctm[5] + ctm[3]) });
          } catch (e) { /* skip unreadable image */ }
        }
      }
      return { W: vp.width, H: vp.height, rows, images };
    }

    // ----- layout: rows -> paragraphs / tables / images -> docx section -----
    function buildSection(pg) {
      const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun } = docx;
      const { W, H, rows, images } = pg;
      const left = rows.length ? Math.min(...rows.map((r) => r.x)) : 36;
      const right = rows.length ? Math.max(...rows.map((r) => r.x2)) : W - 36;
      const mid = (left + right) / 2, textW = Math.max(100, right - left);

      const isCenter = (r) => Math.abs((r.x + r.x2) / 2 - mid) < W * 0.03 && r.x - left > W * 0.06;

      function groupParas(buf) {
        const out = [];
        let cur = null;
        buf.forEach((r) => {
          const p = cur && cur.rows[cur.rows.length - 1];
          const split = !p || p.y - r.y > r.size * 1.55 || Math.abs(p.size - r.size) > 1 ||
            p.x2 < right - p.size * 4 || isCenter(p) !== isCenter(r);
          if (split) { cur = { kind: "p", y: r.y, bottom: r.y, rows: [r] }; out.push(cur); }
          else { cur.rows.push(r); cur.bottom = r.y; }
        });
        return out;
      }

      const els = [];
      let buf = [];
      const flush = () => { groupParas(buf).forEach((p) => els.push(p)); buf = []; };

      let i = 0;
      while (i < rows.length) {
        if (rows[i].segs.length < 2) { buf.push(rows[i++]); continue; }
        const col1 = rows[i].segs[1].x;
        let j = i + 1;
        while (j < rows.length) {
          const r = rows[j], gap = rows[j - 1].y - r.y;
          if (r.segs.length >= 2) j++;
          else if (rows[j + 1] && rows[j + 1].segs.length >= 2 && gap < r.size * 3) j++;
          else if (gap < r.size * 1.6 && r.x >= col1 - 3) j++;
          else break;
        }
        const trs = rows.slice(i, j);
        const multi = trs.filter((r) => r.segs.length >= 2);
        const cols = [];
        multi.flatMap((r) => r.segs).sort((a, b) => a.x - b.x).forEach((s) => {
          const c = cols[cols.length - 1];
          if (c && s.x <= c.x2 + 3) c.x2 = Math.max(c.x2, s.x2); else cols.push({ x: s.x, x2: s.x2 });
        });
        if (multi.length < 2 || cols.length < 2) { buf.push(...trs); i = j; continue; }

        flush();
        const colOf = (s) => {
          const cx = (s.x + s.x2) / 2;
          let k = cols.findIndex((c) => cx >= c.x - 3 && cx <= c.x2 + 3);
          if (k < 0) {
            let best = 1e9; k = 0;
            cols.forEach((c, n) => { const d = Math.abs(cx - (c.x + c.x2) / 2); if (d < best) { best = d; k = n; } });
          }
          return k;
        };
        const matrix = [];
        trs.forEach((r, idx) => {
          const cont = r.segs.length < 2 && matrix.length && trs[idx - 1].y - r.y < r.size * 1.6;
          let target;
          if (cont) target = matrix[matrix.length - 1];
          else { target = Array(cols.length).fill(null); matrix.push(target); }
          r.segs.forEach((s) => {
            const k = colOf(s);
            let cell = target[k];
            if (!cell) cell = target[k] = { runs: [], align: s.x2 >= cols[k].x2 - 3 && s.x > cols[k].x + 4 ? "right" : "left" };
            if (cell.runs.length) cell.runs.push({ ...s.runs[0], t: " " });
            s.runs.forEach((ru) => cell.runs.push({ ...ru }));
          });
        });
        els.push({ kind: "t", y: trs[0].y, bottom: trs[trs.length - 1].y, size: trs[0].size, cols, matrix });
        i = j;
      }
      flush();

      images.forEach((im) => els.push({ kind: "i", y: im.y, bottom: im.bottom, im }));
      els.sort((a, b) => b.y - a.y);

      const mkRuns = (runs) => runs.map((r) => new TextRun({ text: r.t, bold: r.b, italics: r.i, font: r.f, size: Math.round(r.s * 2) }));

      function paraRuns(prows) {
        const out = [];
        prows.forEach((r, li) => {
          r.segs.forEach((sg, si) => {
            sg.runs.forEach((ru) => out.push({ ...ru }));
            if (si < r.segs.length - 1) out.push({ ...sg.runs[sg.runs.length - 1], t: "    " });
          });
          if (li < prows.length - 1) {
            const last = out[out.length - 1];
            const nx = prows[li + 1].segs[0].runs[0].t;
            if (/\w-$/.test(last.t) && /^[a-z]/.test(nx)) last.t = last.t.slice(0, -1);
            else out.push({ ...last, t: " " });
          }
        });
        return out;
      }

      const children = [];
      let prevBottom = null;
      els.forEach((el) => {
        if (el.kind === "p") {
          const rs = el.rows, first = rs[0];
          const before = prevBottom === null ? 0 : Math.min(40, Math.max(0, prevBottom - first.y - first.size * 1.2));
          let alignment = AlignmentType.LEFT;
          if (isCenter(first)) alignment = AlignmentType.CENTER;
          else if (right - first.x2 < first.size * 0.8 && first.x - left > W * 0.25) alignment = AlignmentType.RIGHT;
          const spacing = { before: tw(before), after: 0 };
          if (rs.length > 1) {
            const lh = (rs[0].y - rs[rs.length - 1].y) / (rs.length - 1);
            if (lh > first.size * 0.9 && lh < first.size * 3) { spacing.line = tw(lh); spacing.lineRule = "atLeast"; }
          }
          const props = { alignment, spacing, children: mkRuns(paraRuns(rs)) };
          if (alignment === AlignmentType.LEFT) {
            const base = rs.length > 1 ? rs[1].x : first.x;
            const fl = first.x - base;
            props.indent = { left: tw(Math.max(0, base - left)) };
            if (fl > 2) props.indent.firstLine = tw(fl);
            else if (fl < -2) props.indent.hanging = tw(-fl);
          }
          children.push(new Paragraph(props));
          prevBottom = el.bottom;
        } else if (el.kind === "t") {
          const { cols, matrix } = el;
          let ws = cols.map((c, k) => (k < cols.length - 1 ? cols[k + 1].x - c.x : c.x2 - c.x + 10));
          const sum = ws.reduce((a, b) => a + b, 0);
          if (sum > textW) ws = ws.map((w) => (w * textW) / sum);
          const widths = ws.map(tw);
          const opts = {
            width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
            columnWidths: widths,
            rows: matrix.map((row) => new TableRow({
              children: widths.map((w, k) => {
                const cell = row[k];
                return new TableCell({
                  width: { size: w, type: WidthType.DXA },
                  margins: { top: 40, bottom: 40, left: 80, right: 80 },
                  children: [new Paragraph({
                    alignment: cell && cell.align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    spacing: { before: 0, after: 0 },
                    children: cell ? mkRuns(cell.runs) : [],
                  })],
                });
              }),
            })),
          };
          if (cols[0].x - left > 6) opts.indent = { size: tw(cols[0].x - left), type: WidthType.DXA };
          children.push(new Table(opts));
          prevBottom = el.bottom - el.size * 0.8;
        } else {
          const { im } = el;
          const scale = Math.min(1, textW / im.w);
          const before = prevBottom === null ? 0 : Math.min(40, Math.max(0, prevBottom - im.y));
          children.push(new Paragraph({
            spacing: { before: tw(before), after: 0 },
            indent: { left: tw(Math.max(0, im.x - left)) },
            children: [new ImageRun({
              type: "png",
              data: im.data,
              transformation: { width: Math.round(im.w * scale * 96 / 72), height: Math.round(im.h * scale * 96 / 72) },
            })],
          }));
          prevBottom = im.bottom;
        }
      });

      // Word needs a paragraph after a table; keep it tiny so it doesn't spill to a new page.
      children.push(new Paragraph({
        spacing: { before: 0, after: 0, line: 20, lineRule: "atLeast" },
        children: [new TextRun({ text: "", size: 2 })],
      }));

      const f = els[0];
      const firstTop = f ? (f.kind === "p" ? f.y + f.rows[0].size * 0.9 : f.y) : H - 36;
      return {
        properties: {
          page: {
            size: { width: tw(Math.min(W, H)), height: tw(Math.max(W, H)), orientation: W > H ? "landscape" : "portrait" },
            margin: {
              top: tw(Math.max(18, H - firstTop)),
              bottom: tw(28),
              left: tw(Math.max(18, left)),
              right: tw(Math.max(18, W - right)),
            },
          },
        },
        children,
      };
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

        const pages = [];
        for (const n of wanted) {
          say(`Analyzing page ${n} of ${pdf.numPages}…`);
          pages.push(await readPage(await pdf.getPage(n)));
        }
        if (!pages.some((p) => p.rows.length || p.images.length)) throw new Error("Nothing readable in this PDF. It may be a scan that needs OCR.");

        say("Building DOCX…");
        const doc = new docx.Document({ sections: pages.map(buildSection) });
        download(await docx.Packer.toBlob(doc), file.name.replace(/\.pdf$/i, "") + ".docx");

        const tables = 0;
        say(`Done. ${wanted.length} page(s) converted.`);
      } catch (err) {
        console.error(err);
        say(err.message || "Conversion failed.", true);
      } finally {
        sync();
      }
    });
  };
})();

