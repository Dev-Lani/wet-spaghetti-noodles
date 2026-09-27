const KEY = 'instasave_collection_v1';

let collection = [];

try {
    collection = JSON.parse(
        localStorage.getItem(KEY) || '[]'
    );

    if (!Array.isArray(collection)) {
        collection = [];
    }

} catch {
    collection = [];
}


const $ = (id) => document.getElementById(id);


function toast(message) {

    const t = $('toast');

    if (!t) {
        return;
    }

    t.textContent = message;

    t.classList.add('show');

    setTimeout(() => {
        t.classList.remove('show');
    }, 2600);
}


function save() {

    localStorage.setItem(
        KEY,
        JSON.stringify(collection)
    );

}


function esc(value) {

    return String(value ?? '').replace(
        /[&<>"']/g,
        (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char])
    );

}


function render() {

    $('count').textContent = collection.length;

    const grid = $('grid');


    if (!collection.length) {

        grid.innerHTML = `
            <div class="empty">
                <strong>No media collected yet</strong>
                <span>
                    Process JSON above and your media will appear here.
                </span>
            </div>
        `;

        return;
    }


    grid.innerHTML = collection.map((item, index) => {

        const preview = item.is_video

            ? `
                <video
                    src="${esc(item.url)}"
                    controls
                    preload="metadata">
                </video>
            `

            : `
                <img
                    src="${esc(item.url)}"
                    loading="lazy"
                    alt="">
            `;


        return `
            <article class="card">

                <div class="preview">

                    ${preview}

                    <span>
                        ${item.is_video ? 'VIDEO' : 'IMAGE'}
                    </span>

                </div>


                <div class="meta">

                    <b>
                        ${esc(item.username)}
                    </b>

                    <small>
                        ${esc(item.filename)}
                    </small>


                    <button
                        type="button"
                        class="download"
                        data-i="${index}">

                        Download

                    </button>

                </div>

            </article>
        `;

    }).join('');


    document
        .querySelectorAll('.download')
        .forEach((button) => {

            button.onclick = () => {

                downloadOne(
                    collection[
                        Number(button.dataset.i)
                    ]
                );

            };

        });

}


async function post(url, data) {

    const response = await fetch(url, {

        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify(data)

    });


    let result;


    try {

        result = await response.json();

    } catch {

        throw new Error(
            `Server returned invalid JSON (HTTP ${response.status}).`
        );

    }


    if (!response.ok || !result.ok) {

        const error = new Error(
            result.error || 'Request failed.'
        );

        error.data = result;

        throw error;
    }


    return result;
}



$('generate').onclick = async () => {

    const input = $('igUrl').value.trim();


    if (!input) {

        toast(
            'Please enter an Instagram URL.'
        );

        return;
    }


    try {

        const result = await post(
            'api/generate.php',
            {
                url: input
            }
        );


        console.log(
            'Generate response:',
            result
        );


        $('jsonUrl').value = result.url;

        $('generated').classList.remove(
            'hidden'
        );


        toast(
            `Generated ${result.type || 'Instagram'} JSON link.`
        );


    } catch (error) {

        console.error(error);


        if (
            error.data &&
            error.data.needs_user_id
        ) {

            const username =
                error.data.username ||
                'this account';


            const manualId = prompt(
                `Could not automatically find the Instagram user ID for @${username}.\n\n` +
                `Enter the Instagram user ID manually:`
            );


            if (
                !manualId ||
                !manualId.trim()
            ) {

                toast(
                    'User ID not provided.'
                );

                return;
            }


            try {

                const result = await post(
                    'api/generate.php',
                    {
                        url: input,
                        user_id: manualId.trim()
                    }
                );


                $('jsonUrl').value =
                    result.url;


                $('generated').classList.remove(
                    'hidden'
                );


                toast(
                    'Story JSON link generated.'
                );


            } catch (secondError) {

                console.error(
                    secondError
                );

                toast(
                    secondError.message
                );

            }


            return;
        }


        toast(
            error.message
        );

    }

};


$('copy').onclick = async () => {

    const value =
        $('jsonUrl').value.trim();


    if (!value) {

        toast(
            'Nothing to copy.'
        );

        return;
    }


    try {

        await navigator.clipboard.writeText(
            value
        );

        toast('Copied.');

    } catch {

        $('jsonUrl').select();

        document.execCommand(
            'copy'
        );

        toast('Copied.');

    }

};


$('open').onclick = () => {

    const url =
        $('jsonUrl').value.trim();


    if (!url) {

        toast(
            'No generated link.'
        );

        return;
    }


    window.open(
        url,
        '_blank',
        'noopener,noreferrer'
    );

};


$('fetchMedia').onclick = async () => {

    const url =
        $('jsonUrl').value.trim();


    if (!url) {

        toast(
            'No generated link.'
        );

        return;
    }


    toast(
        'Fetching media...'
    );


    try {

        const result = await post(
            'api/fetch.php',
            {
                url: url
            }
        );


        const existing =
            new Set(
                collection.map(
                    item => item.url
                )
            );


        let added = 0;


        result.media.forEach((item) => {

            if (!existing.has(item.url)) {

                collection.push(item);

                existing.add(item.url);

                added++;

            }

        });


        save();

        render();


        toast(
            `${added} new media added.`
        );


    } catch (error) {

        console.error(error);

        toast(
            error.message
        );

    }

};


$('clearJson').onclick = () => {

    $('jsonInput').value = '';

};


$('process').onclick = async () => {

    const json =
        $('jsonInput').value.trim();


    if (!json) {

        toast(
            'Paste JSON or page source first.'
        );

        return;
    }


    try {

        const result = await post(
            'api/process.php',
            {
                json: json
            }
        );


        const existing =
            new Set(
                collection.map(
                    item => item.url
                )
            );


        let added = 0;


        result.media.forEach((item) => {

            if (!existing.has(item.url)) {

                collection.push(item);

                existing.add(item.url);

                added++;

            }

        });


        save();

        render();


        $('jsonInput').value = '';


        toast(
            `${added} new media added.`
        );


    } catch (error) {

        console.error(error);

        toast(
            error.message
        );

    }

};


async function downloadOne(item) {

    try {

        const response =
            await fetch(
                'api/download.php',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify(item)
                }
            );


        if (!response.ok) {

            let errorMessage =
                'Download failed.';


            try {

                const error =
                    await response.json();

                errorMessage =
                    error.error ||
                    errorMessage;

            } catch {}


            throw new Error(
                errorMessage
            );

        }


        const blob =
            await response.blob();


        const url =
            URL.createObjectURL(blob);


        const anchor =
            document.createElement('a');


        anchor.href = url;

        anchor.download =
            item.filename ||
            'instagram_media';


        document.body.appendChild(
            anchor
        );

        anchor.click();

        anchor.remove();


        setTimeout(() => {

            URL.revokeObjectURL(url);

        }, 1000);


    } catch (error) {

        console.error(error);

        toast(
            error.message
        );

    }

}


$('clearAll').onclick = () => {

    if (!collection.length) {

        toast(
            'Collection is already empty.'
        );

        return;
    }


    if (
        confirm(
            'Clear the entire media collection?'
        )
    ) {

        collection = [];

        save();

        render();

        toast(
            'Collection cleared.'
        );

    }

};


$('downloadAll').onclick = async () => {
    if (!collection.length) {
        toast('No media to download.');
        return;
    }

    toast(`Starting ${collection.length} download(s)...`);

    for (let i = 0; i < collection.length; i++) {
        const item = collection[i];

        try {
            const response = await fetch('api/download.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: item.url,
                    username: item.username,
                    taken_at_timestamp: item.taken_at_timestamp,
                    is_video: item.is_video
                })
            });

            if (!response.ok) {
                throw new Error(`Download failed for item ${i + 1}`);
            }

            const blob = await response.blob();

            const disposition = response.headers.get('Content-Disposition');
            let filename = item.filename || `media_${i + 1}`;

            if (disposition) {
                const match = disposition.match(/filename="?([^"]+)"?/);
                if (match) {
                    filename = match[1];
                }
            }

            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(blobUrl);

            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(error);
        }
    }

    toast('All downloads started.');
};

render();