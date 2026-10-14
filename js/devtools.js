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
})();