const KEY = 'instasave_collection_v1';

const $ = (id) => document.getElementById(id);


/* ------------------------------------------------------------------ */
/* Collection (localStorage)                                           */
/* ------------------------------------------------------------------ */

function uid() {
    return Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
}

let collection = [];

try {
    collection = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(collection)) collection = [];
} catch {
    collection = [];
}

// Old saved items may have no id. Give them one so Remove works.
// (Old items without `filename` are fine: the server computes the same
// deterministic name on first download and we store it then.)
collection.forEach((item) => {
    if (!item.id) item.id = uid();
});


function save() {
    localStorage.setItem(KEY, JSON.stringify(collection));
}

function toast(message) {
    const t = $('toast');
    if (!t) return;
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Same rule as clean_user() in common.php, plus a guard for "." / "..".
function cleanUser(username) {
    let u = String(username || 'unknown_user').replace(/[^A-Za-z0-9_.-]/g, '_');
    if (/^\.+$/.test(u)) u = '_';
    return u;
}

// Adds items; skips ones already in the collection.
// Filename is stable per media, so it is the dedupe key (CDN URLs expire).
function addItems(media) {
    const names = new Set(collection.map((i) => i.filename).filter(Boolean));
    const urls = new Set(collection.map((i) => i.url));
    let added = 0;

    media.forEach((item) => {
        if ((item.filename && names.has(item.filename)) || urls.has(item.url)) {
            return;
        }
        collection.push(item);
        if (item.filename) names.add(item.filename);
        urls.add(item.url);
        added++;
    });

    save();
    render();
    return added;
}


/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

function render() {
    $('count').textContent = collection.length;

    const grid = $('grid');

    if (!collection.length) {
        grid.innerHTML = `
            <div class="empty">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="6" width="14" height="14" rx="2"/>
                    <rect x="7" y="2" width="14" height="14" rx="2"/>
                </svg>
                <strong>Nothing collected yet</strong>
                <span>Process a link above — your media will show up here.</span>
            </div>
        `;
        return;
    }

    grid.innerHTML = collection.map((item) => {
        const preview = item.is_video
            ? `<video src="${esc(item.url)}" controls preload="metadata"></video>`
            : `<img src="${esc(item.url)}" loading="lazy" alt="">`;

        return `
            <article class="card">
                <div class="preview">
                    ${preview}
                    <span>${item.is_video ? 'VIDEO' : 'IMAGE'}</span>
                </div>
                <div class="meta">
                    <b>${esc(item.username)}</b>
                    <small>${esc(item.filename || '')}</small>
                    <div class="btns">
                        <button type="button" class="download" data-id="${esc(item.id)}">Download</button>
                        <button type="button" class="remove danger" data-id="${esc(item.id)}">Remove</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// One delegated listener for Download / Remove (identified by item id).
$('grid').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;

    const id = btn.dataset.id;

    if (btn.classList.contains('remove')) {
        removeItem(id);
    } else if (btn.classList.contains('download')) {
        const item = collection.find((x) => x.id === id);
        if (item) downloadOne(item);
    }
});

function removeItem(id) {
    const before = collection.length;
    collection = collection.filter((x) => x.id !== id);
    if (collection.length === before) return;
    save();
    render();
    toast('Removed');
}


/* ------------------------------------------------------------------ */
/* API helper                                                          */
/* ------------------------------------------------------------------ */

async function post(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(`Server returned invalid JSON (HTTP ${response.status}).`);
    }

    if (!response.ok || !result.ok) {
        const error = new Error(result.error || 'Request failed.');
        error.data = result;
        throw error;
    }

    return result;
}


/* ------------------------------------------------------------------ */
/* Step 1: generate / copy / open / fetch                              */
/* ------------------------------------------------------------------ */

$('generate').onclick = async () => {
    const input = $('igUrl').value.trim();

    if (!input) {
        toast('Please enter an Instagram URL.');
        return;
    }

    try {
        const result = await post('api/generate.php', { url: input });

        $('jsonUrl').value = result.url;
        $('generated').classList.remove('hidden');
        toast(`Generated ${result.type || 'Instagram'} JSON link.`);

    } catch (error) {
        console.error(error);

        if (error.data && error.data.needs_user_id) {
            const username = error.data.username || 'this account';

            const manualId = prompt(
                `Could not automatically find the Instagram user ID for @${username}.\n\n` +
                `Enter the Instagram user ID manually:`
            );

            if (!manualId || !manualId.trim()) {
                toast('User ID not provided.');
                return;
            }

            try {
                const result = await post('api/generate.php', {
                    url: input,
                    user_id: manualId.trim()
                });

                $('jsonUrl').value = result.url;
                $('generated').classList.remove('hidden');
                toast('Story JSON link generated.');

            } catch (secondError) {
                console.error(secondError);
                toast(secondError.message);
            }

            return;
        }

        toast(error.message);
    }
};

$('copy').onclick = async () => {
    const value = $('jsonUrl').value.trim();

    if (!value) {
        toast('Nothing to copy.');
        return;
    }

    try {
        await navigator.clipboard.writeText(value);
        toast('Copied.');
    } catch {
        $('jsonUrl').select();
        document.execCommand('copy');
        toast('Copied.');
    }
};

$('open').onclick = () => {
    const url = $('jsonUrl').value.trim();

    if (!url) {
        toast('No generated link.');
        return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
};

$('fetchMedia').onclick = async () => {
    const url = $('jsonUrl').value.trim();

    if (!url) {
        toast('No generated link.');
        return;
    }

    toast('Fetching media...');

    try {
        const result = await post('api/fetch.php', { url });
        toast(`${addItems(result.media)} new media added.`);
    } catch (error) {
        console.error(error);
        toast(error.message);
    }
};


/* ------------------------------------------------------------------ */
/* Step 2: manual paste                                                */
/* ------------------------------------------------------------------ */

$('clearJson').onclick = () => {
    $('jsonInput').value = '';
};

$('process').onclick = async () => {
    const json = $('jsonInput').value.trim();

    if (!json) {
        toast('Paste JSON or page source first.');
        return;
    }

    try {
        const result = await post('api/process.php', { json });
        const added = addItems(result.media);
        $('jsonInput').value = '';
        toast(`${added} new media added.`);
    } catch (error) {
        console.error(error);
        toast(error.message);
    }
};


/* ------------------------------------------------------------------ */
/* Download / Download all (saved by the server into downloads/<user>/) */
/* ------------------------------------------------------------------ */

async function saveToServer(item) {
    const result = await post('api/save.php', {
        item: {
            url: item.url,
            username: item.username,
            taken_at_timestamp: item.taken_at_timestamp,
            is_video: item.is_video,
            filename: item.filename
        }
    });

    // Old item without filename: remember the deterministic name now.
    if (!item.filename && result.filename) item.filename = result.filename;

    return result;
}

async function downloadOne(item) {
    try {
        toast('Saving...');
        const r = await saveToServer(item);

        save();
        render();

        toast(
            r.status === 'skipped'
                ? `Already saved: ${r.folder}/${r.filename}`
                : `Saved to ${r.folder}/${r.filename}`
        );

    } catch (error) {
        console.error(error);
        toast(error.message);
    }
}

$('downloadAll').onclick = async () => {
    if (!collection.length) {
        toast('No media to download.');
        return;
    }

    const items = collection.slice();
    let saved = 0, skipped = 0, failed = 0;

    for (let i = 0; i < items.length; i++) {
        toast(`Saving ${i + 1}/${items.length}...`);

        try {
            const r = await saveToServer(items[i]);
            if (r.status === 'skipped') skipped++; else saved++;
        } catch (error) {
            console.error(error);
            failed++;
        }
    }

    save();
    render();

    toast(`${saved} saved, ${skipped} skipped, ${failed} failed`);
};


/* ------------------------------------------------------------------ */
/* Clear all                                                           */
/* ------------------------------------------------------------------ */

$('clearAll').onclick = () => {
    if (!collection.length) {
        toast('Collection is already empty.');
        return;
    }

    if (confirm('Clear the entire media collection?')) {
        collection = [];
        save();
        render();
        toast('Collection cleared.');
    }
};

render();