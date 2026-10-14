<?php require 'common.php';

try {

    $in = body_json();

    $url = trim($in['url'] ?? '');

    if (!$url) {
        throw new Exception('Missing generated URL.');
    }

    /*
     * All generated links (post doc_id GraphQL, story/highlight
     * query_hash GraphQL) are internal API calls -> XHR headers
     * (X-IG-App-ID etc), returning raw JSON. Page headers are kept
     * as a fallback only, in case a plain permalink ever ends up
     * here instead.
     */

    $media = [];

    $raw = http_get($url, 45, ig_headers(), true);

    if ($raw) {
        try {
            $media = extract_media(json_from_raw($raw));
        } catch (Throwable $e) {
            $media = [];
        }
    }

    if (!$media) {

        $raw = http_get($url, 45, ig_page_headers(), true);

        if ($raw) {
            try {
                $media = extract_media(json_from_raw($raw));
            } catch (Throwable $e) {
                $media = [];
            }
        }
    }

    if (!$media) {
        throw new Exception(
            'No media found. Baka private o age-restricted ang post, ' .
            'o nagbago ulit ang format ni Instagram — subukan na lang ' .
            'ang manual paste sa Step 02.'
        );
    }

    foreach ($media as &$x) {
        $x['id'] = bin2hex(random_bytes(8));
    }

    send_json(['ok' => true, 'media' => $media]);

} catch (Throwable $e) {

    send_json(['ok' => false, 'error' => $e->getMessage()], 400);

}