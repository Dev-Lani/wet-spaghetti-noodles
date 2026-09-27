<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >

    <title>InstaSave</title>

    <link
        rel="stylesheet"
        href="assets/style.css"
    >
</head>

<body>

<header>
    <div>
        <b>InstaSave</b>
        <span>Private local media collector</span>
    </div>

    <i>● Local</i>
</header>


<main>

    <!-- STEP 01 -->
    <section class="panel">

        <div class="step">01</div>

        <h2>Instagram URL</h2>

        <p>
            Paste a post, reel, story, or highlight URL.
        </p>

        <div class="row">

            <input
                id="igUrl"
                type="text"
                placeholder="https://www.instagram.com/..."
                autocomplete="off"
            >

            <button
                type="button"
                id="generate"
            >
                Generate JSON Link
            </button>

        </div>


        <div
            id="generated"
            class="hidden"
        >

            <label>
                Generated link
            </label>

            <div class="row">

                <input
                    id="jsonUrl"
                    type="text"
                    readonly
                >

                <button
                    type="button"
                    id="copy"
                >
                    Copy
                </button>

                <button
                    type="button"
                    id="open"
                >
                    Open
                </button>

            </div>

            <div class="actions">

                <button
                    type="button"
                    id="fetchMedia"
                >
                    Fetch Media Automatically
                </button>

            </div>

        </div>

    </section>


    <!-- STEP 02 -->
    <section class="panel">

        <div class="step">02</div>

        <h2>JSON / Page Source</h2>

        <p>
            Paste the JSON response or page source here.
        </p>

        <textarea
            id="jsonInput"
            placeholder="Paste JSON here..."
        ></textarea>


        <div class="actions">

            <button
                type="button"
                class="secondary"
                id="clearJson"
            >
                Clear
            </button>

            <button
                type="button"
                id="process"
            >
                Process Media
            </button>

        </div>

    </section>


    <!-- COLLECTION -->
    <section class="collection">

        <div class="collectionHead">

            <div>

                <small>
                    MEDIA COLLECTION
                </small>

                <h2>
                    <span id="count">0</span>
                    items
                </h2>

            </div>


            <button
                type="button"
                class="danger"
                id="clearAll"
            >
                Clear All
            </button>

        </div>


        <div
            id="grid"
            class="grid"
        >

            <div class="empty">

                <strong>
                    No media collected yet
                </strong>

                <span>
                    Process JSON above and your media will appear here.
                </span>

            </div>

        </div>


        <div class="bottom">

            <button
                type="button"
                id="downloadAll"
            >
                Download All
            </button>

        </div>

    </section>

</main>


<div id="toast"></div>


<script src="assets/app.js"></script>

</body>
</html>