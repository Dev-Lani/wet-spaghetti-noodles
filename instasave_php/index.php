<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>InstaSave</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>

<header>
    <div class="brand">
        <span class="mark">IS</span>
        <b>InstaSave</b>
    </div>
    <span class="pill"><i class="dot"></i>Runs locally</span>
</header>

<main>

    <div class="hero">
        <p class="lede">Turn an Instagram link into a private, local collection — no account, no cloud, nothing leaves your machine.</p>
        <svg class="flow" viewBox="0 0 200 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <line x1="20" y1="32" x2="180" y2="32" stroke="var(--border)" stroke-width="1.5"/>
            <line x1="20" y1="32" x2="100" y2="32" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="0 1"/>
            <circle cx="20" cy="32" r="7" fill="var(--ink)"/>
            <circle cx="100" cy="32" r="7" fill="var(--accent)"/>
            <circle cx="180" cy="32" r="7" fill="var(--panel-2)" stroke="var(--border-strong)" stroke-width="1.5"/>
            <text x="20" y="54" text-anchor="middle" class="flowlabel">link</text>
            <text x="100" y="54" text-anchor="middle" class="flowlabel">process</text>
            <text x="180" y="54" text-anchor="middle" class="flowlabel">collection</text>
        </svg>
    </div>

    <div class="rail">

        <!-- STEP 01 -->
        <section class="step">
            <div class="stepnum">1</div>
            <div class="stepbody panel">

                <h2>Paste the link</h2>
                <p>Works with posts, reels, stories, and highlights.</p>

                <div class="row">
                    <input
                        id="igUrl"
                        type="text"
                        placeholder="https://www.instagram.com/..."
                        autocomplete="off"
                    >
                    <button type="button" class="primary" id="generate">Generate link</button>
                </div>

                <div id="generated" class="hidden">

                    <div class="divider"></div>

                    <label>Generated JSON link</label>
                    <div class="row">
                        <input id="jsonUrl" type="text" readonly>
                        <button type="button" class="ghost" id="copy">Copy</button>
                        <button type="button" class="ghost" id="open">Open</button>
                    </div>

                    <button type="button" class="primary full" id="fetchMedia">Fetch media automatically</button>

                </div>

            </div>
        </section>

        <!-- STEP 02 -->
        <section class="step">
            <div class="stepnum">2</div>
            <div class="stepbody panel">

                <h2>Or paste the source</h2>
                <p>If automatic fetch doesn't work, paste the JSON response or page source instead.</p>

                <textarea id="jsonInput" placeholder="Paste JSON here…"></textarea>

                <div class="actions">
                    <button type="button" class="ghost" id="clearJson">Clear</button>
                    <button type="button" class="primary" id="process">Process media</button>
                </div>

            </div>
        </section>

    </div>

    <section class="collection">

        <div class="collectionHead">
            <div>
                <h2>Collection</h2>
                <span class="count"><span id="count">0</span> items saved</span>
            </div>
            <button type="button" class="ghost danger" id="clearAll">Clear all</button>
        </div>

        <div id="grid" class="grid">
            <div class="empty">
                <strong>Nothing collected yet</strong>
                <span>Process a link above — your media will show up here.</span>
            </div>
        </div>

        <div class="bottom">
            <button type="button" class="primary" id="downloadAll">Download all</button>
        </div>

    </section>

</main>

<div id="toast"></div>

<script src="assets/app.js"></script>

</body>
</html>