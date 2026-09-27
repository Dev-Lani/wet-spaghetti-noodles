<?php

function body_json()
{
    $raw = file_get_contents('php://input');

    $data = json_decode($raw, true);

    return is_array($data) ? $data : [];
}


function ig_headers()
{
    return [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36',
        'Accept: */*',
        'X-IG-App-ID: 936619743392459',
        'X-Requested-With: XMLHttpRequest',
        'Referer: https://www.instagram.com/'
    ];
}


/*
 * Headers for fetching a normal, browser-rendered Instagram page
 * (post/reel permalink). This is NOT an XHR/API call, so it must
 * NOT look like one -- no X-Requested-With, no X-IG-App-ID.
 * Instagram embeds the post's data inline in this page's HTML,
 * inside <script type="application/json" data-sjs> tags.
 */
function ig_page_headers()
{
    return [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: en-US,en;q=0.9',
    ];
}


function http_get($url, $timeout = 30, $headers = null, $softFail = false)
{
    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_HTTPHEADER => $headers ?? ig_headers(),
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_ENCODING => ''
    ]);

    $data = curl_exec($ch);

    $error = curl_error($ch);

    $code = curl_getinfo(
        $ch,
        CURLINFO_HTTP_CODE
    );

    curl_close($ch);

    if ($data === false) {
        if ($softFail) {
            return null;
        }
        throw new Exception(
            $error ?: 'Request failed.'
        );
    }

    if ($code >= 400) {
        if ($softFail) {
            return null;
        }
        throw new Exception(
            'Instagram returned HTTP ' . $code
        );
    }

    return $data;
}


function clean_user($username)
{
    $username = $username ?: 'unknown_user';

    return preg_replace(
        '/[^A-Za-z0-9_.-]/',
        '_',
        $username
    );
}


function random5()
{
    return str_pad(
        (string) random_int(0, 99999),
        5,
        '0',
        STR_PAD_LEFT
    );
}


function filename_for($item)
{
    $timestamp = !empty(
        $item['taken_at_timestamp']
    )
        ? (float) $item['taken_at_timestamp']
        : time();

    $username = clean_user(
        $item['username'] ?? 'unknown_user'
    );

    $extension = !empty(
        $item['is_video']
    )
        ? 'mp4'
        : 'jpg';

    return $username
        . '_'
        . date('Ymd_His', $timestamp)
        . '_'
        . random5()
        . '.'
        . $extension;
}


function json_from_raw($raw)
{
    $candidates = [];


    /*
     * Try normal JSON first (e.g. a raw API response the user pasted).
     */

    $direct = json_decode(
        $raw,
        true
    );

    if (is_array($direct)) {
        $candidates[] = $direct;
    }


    /*
     * Collect EVERY application/json script tag, not just the first
     * match. Modern Instagram pages embed the post's data inside
     * <script type="application/json" data-sjs> tags, but there are
     * usually several such tags on the page (i18n strings, config,
     * the actual post payload, etc), nested inside a "require"
     * bootstrap structure rather than sitting at the top level.
     */

    if (
        preg_match_all(
            '/<script[^>]*type=["\']application\/json["\'][^>]*>(.*?)<\/script>/is',
            $raw,
            $matches
        )
    ) {

        foreach ($matches[1] as $script) {

            $decoded = json_decode(
                trim($script),
                true
            );

            if (is_array($decoded)) {
                $candidates[] = $decoded;
            }
        }
    }


    if (!$candidates) {
        throw new Exception(
            'The pasted content is not valid JSON.'
        );
    }


    /*
     * Wrap every candidate root as an element of one outer array.
     * extract_media() no longer assumes a fixed top-level shape --
     * it deep-searches this whole tree for the keys it needs, so
     * wrapping multiple roots together here is safe and lets a
     * single call find media data no matter which script tag (or
     * how deeply nested) it ended up in.
     */

    return ['__roots' => $candidates];
}


function best_video($item)
{
    $best = null;

    $bestWidth = -1;


    /*
     * Original reels_media format.
     */

    foreach (
        ($item['video_resources'] ?? []) as $resource
    ) {

        $width = (int) (
            $resource['config_width'] ?? 0
        );

        if (
            !empty($resource['src']) &&
            $width > $bestWidth
        ) {

            $bestWidth = $width;

            $best = $resource['src'];
        }
    }


    /*
     * Instagram mobile API format.
     */

    foreach (
        ($item['video_versions'] ?? []) as $resource
    ) {

        $width = (int) (
            $resource['width'] ?? 0
        );

        if (
            !empty($resource['url']) &&
            $width > $bestWidth
        ) {

            $bestWidth = $width;

            $best = $resource['url'];
        }
    }


    return $best;
}


/*
 * Recursively walks a decoded JSON tree and collects the value of
 * every array key matching one of $keys, no matter how deeply
 * nested. Modern Instagram pages bury the post data several levels
 * inside a "require"/bootstrap structure, so a fixed top-level path
 * (like $data['graphql']['shortcode_media']) can no longer be
 * relied on -- this searches the whole tree instead.
 */
function deep_find_all($node, $keys, &$found = [])
{
    if (!is_array($node)) {
        return $found;
    }

    foreach ($keys as $key) {
        if (
            array_key_exists($key, $node) &&
            is_array($node[$key])
        ) {
            $found[] = $node[$key];
        }
    }

    foreach ($node as $value) {
        if (is_array($value)) {
            deep_find_all($value, $keys, $found);
        }
    }

    return $found;
}


/*
 * Like deep_find_all, but collects the CONTAINING node itself
 * (not just the matched key's value) wherever that key is present
 * with a non-empty array. Needed when the sibling fields on that
 * same container (owner, taken_at) are required to interpret the
 * matched array -- e.g. a "carousel_media" list has no per-slide
 * owner, only the post-level container does.
 */
function deep_find_containers($node, $keys, &$found = [])
{
    if (!is_array($node)) {
        return $found;
    }

    foreach ($keys as $key) {
        if (
            array_key_exists($key, $node) &&
            is_array($node[$key]) &&
            !empty($node[$key])
        ) {
            $found[] = $node;
            break;
        }
    }

    foreach ($node as $value) {
        if (is_array($value)) {
            deep_find_containers($value, $keys, $found);
        }
    }

    return $found;
}


function extract_media($data)
{
    $media = [];

    /*
     * ---------------------------------------------------------
     * Helper: add media item
     * ---------------------------------------------------------
     */
    $addMedia = function ($username, $url, $isVideo, $timestamp = null) use (&$media) {

        if (!$url) {
            return;
        }

        // Prevent duplicate URLs
        foreach ($media as $existing) {
            if ($existing['url'] === $url) {
                return;
            }
        }

        $media[] = [
            'username' => $username ?: 'unknown_user',
            'url' => $url,
            'is_video' => (bool) $isVideo,
            'taken_at_timestamp' => $timestamp
        ];
    };


    /*
     * ---------------------------------------------------------
     * 1. ORIGINAL STORY / HIGHLIGHT FORMAT
     *
     * data.reels_media[].items[]
     * ---------------------------------------------------------
     */
    $reelsMediaGroups = deep_find_all($data, ['reels_media']);

    foreach ($reelsMediaGroups as $reelsMedia) {

        foreach ($reelsMedia as $reel) {

            $owner = $reel['owner'] ?? [];

            $username =
                $owner['username']
                ?? $reel['user']['username']
                ?? 'unknown_user';

            $items = $reel['items'] ?? [];

            if (!is_array($items)) {
                continue;
            }

            foreach ($items as $item) {

                $isVideo = !empty($item['is_video']);

                $timestamp =
                    $item['taken_at_timestamp']
                    ?? $item['taken_at']
                    ?? null;

                /*
                 * VIDEO
                 */
                if ($isVideo) {

                    $videoUrl = best_video($item);

                    if ($videoUrl) {
                        $addMedia(
                            $username,
                            $videoUrl,
                            true,
                            $timestamp
                        );
                    }

                    continue;
                }

                /*
                 * PHOTO
                 */
                $imageUrl =
                    $item['display_url']
                    ?? null;

                if (!$imageUrl) {
                    $candidates =
                        $item['image_versions2']['candidates']
                        ?? [];

                    if (!empty($candidates)) {
                        $imageUrl = $candidates[0]['url'] ?? null;
                    }
                }

                if ($imageUrl) {
                    $addMedia(
                        $username,
                        $imageUrl,
                        false,
                        $timestamp
                    );
                }
            }
        }
    }


    /*
     * ---------------------------------------------------------
     * 2. POST / REEL FORMAT
     *
     * Instagram ?__a=1&__d=dis responses commonly contain
     * graphql.shortcode_media
     * ---------------------------------------------------------
     */

    $shortcodeMediaNodes = deep_find_all(
        $data,
        ['shortcode_media', 'xdt_shortcode_media']
    );

    foreach ($shortcodeMediaNodes as $shortcodeMedia) {

        $mediaNode = $shortcodeMedia;

        /*
         * Username
         */
        $username =
            $mediaNode['owner']['username']
            ?? 'unknown_user';

        /*
         * Timestamp
         */
        $timestamp =
            $mediaNode['taken_at_timestamp']
            ?? $mediaNode['taken_at']
            ?? null;


        /*
         * -----------------------------------------------------
         * CAROUSEL / SIDE CAR
         * -----------------------------------------------------
         */

        $carousel =
            $mediaNode['edge_sidecar_to_children']['edges']
            ?? [];

        if (is_array($carousel) && count($carousel) > 0) {

            foreach ($carousel as $edge) {

                $node = $edge['node'] ?? null;

                if (!is_array($node)) {
                    continue;
                }

                $childUsername =
                    $node['owner']['username']
                    ?? $username;

                $childTimestamp =
                    $node['taken_at_timestamp']
                    ?? $timestamp;

                $isVideo =
                    !empty($node['is_video']);

                /*
                 * VIDEO
                 */
                if ($isVideo) {

                    $videoUrl = null;

                    /*
                     * video_url
                     */
                    if (!empty($node['video_url'])) {
                        $videoUrl = $node['video_url'];
                    }

                    /*
                     * video_versions
                     */
                    if (!$videoUrl && !empty($node['video_versions'])) {

                        $versions = $node['video_versions'];

                        usort($versions, function ($a, $b) {
                            return
                                ($b['width'] ?? 0)
                                <=>
                                ($a['width'] ?? 0);
                        });

                        $videoUrl =
                            $versions[0]['url']
                            ?? null;
                    }

                    if ($videoUrl) {
                        $addMedia(
                            $childUsername,
                            $videoUrl,
                            true,
                            $childTimestamp
                        );
                    }

                    continue;
                }


                /*
                 * PHOTO
                 */

                $imageUrl =
                    $node['display_url']
                    ?? null;

                if (!$imageUrl) {

                    $candidates =
                        $node['image_versions2']['candidates']
                        ?? [];

                    if (!empty($candidates)) {

                        usort($candidates, function ($a, $b) {
                            return
                                (($b['width'] ?? 0) * ($b['height'] ?? 0))
                                <=>
                                (($a['width'] ?? 0) * ($a['height'] ?? 0));
                        });

                        $imageUrl =
                            $candidates[0]['url']
                            ?? null;
                    }
                }

                if ($imageUrl) {
                    $addMedia(
                        $childUsername,
                        $imageUrl,
                        false,
                        $childTimestamp
                    );
                }
            }

        } else {

            /*
             * -------------------------------------------------
             * SINGLE POST / REEL
             * -------------------------------------------------
             */

            $isVideo =
                !empty($mediaNode['is_video']);

            if ($isVideo) {

                $videoUrl =
                    $mediaNode['video_url']
                    ?? null;

                /*
                 * video_versions fallback
                 */
                if (!$videoUrl && !empty($mediaNode['video_versions'])) {

                    $versions =
                        $mediaNode['video_versions'];

                    usort($versions, function ($a, $b) {
                        return
                            ($b['width'] ?? 0)
                            <=>
                            ($a['width'] ?? 0);
                    });

                    $videoUrl =
                        $versions[0]['url']
                        ?? null;
                }

                if ($videoUrl) {
                    $addMedia(
                        $username,
                        $videoUrl,
                        true,
                        $timestamp
                    );
                }

            } else {

                $imageUrl =
                    $mediaNode['display_url']
                    ?? null;

                if (!$imageUrl) {

                    $candidates =
                        $mediaNode['display_resources']
                        ?? [];

                    if (!empty($candidates)) {

                        $last =
                            end($candidates);

                        $imageUrl =
                            $last['src']
                            ?? null;
                    }
                }

                if (!$imageUrl) {

                    $candidates =
                        $mediaNode['image_versions2']['candidates']
                        ?? [];

                    if (!empty($candidates)) {

                        usort($candidates, function ($a, $b) {
                            return
                                (($b['width'] ?? 0) * ($b['height'] ?? 0))
                                <=>
                                (($a['width'] ?? 0) * ($a['height'] ?? 0));
                        });

                        $imageUrl =
                            $candidates[0]['url']
                            ?? null;
                    }
                }

                if ($imageUrl) {
                    $addMedia(
                        $username,
                        $imageUrl,
                        false,
                        $timestamp
                    );
                }
            }
        }
    }


    /*
     * ---------------------------------------------------------
     * 3. NEWER INSTAGRAM RESPONSE FALLBACK
     * ---------------------------------------------------------
     */

    $itemGroups = deep_find_all($data, ['items']);

    foreach ($itemGroups as $items) {

        foreach ($items as $item) {

            if (
                !is_array($item) ||
                (!isset($item['media_type']) && !isset($item['is_video']))
            ) {
                continue;
            }

            $username =
                $item['user']['username']
                ?? $item['owner']['username']
                ?? 'unknown_user';

            $timestamp =
                $item['taken_at']
                ?? $item['taken_at_timestamp']
                ?? null;

            $isVideo =
                !empty($item['media_type'])
                && (int)$item['media_type'] === 2;

            /*
             * Video
             */
            if ($isVideo) {

                $videoUrl = null;

                if (!empty($item['video_versions'])) {

                    $versions =
                        $item['video_versions'];

                    usort($versions, function ($a, $b) {
                        return
                            ($b['width'] ?? 0)
                            <=>
                            ($a['width'] ?? 0);
                    });

                    $videoUrl =
                        $versions[0]['url']
                        ?? null;
                }

                if ($videoUrl) {
                    $addMedia(
                        $username,
                        $videoUrl,
                        true,
                        $timestamp
                    );
                }

                continue;
            }


            /*
             * Photo
             */

            $imageUrl = null;

            $candidates =
                $item['image_versions2']['candidates']
                ?? [];

            if (!empty($candidates)) {

                usort($candidates, function ($a, $b) {
                    return
                        (($b['width'] ?? 0) * ($b['height'] ?? 0))
                        <=>
                        (($a['width'] ?? 0) * ($a['height'] ?? 0));
                });

                $imageUrl =
                    $candidates[0]['url']
                    ?? null;
            }

            if ($imageUrl) {
                $addMedia(
                    $username,
                    $imageUrl,
                    false,
                    $timestamp
                );
            }
        }
    }


    /*
     * ---------------------------------------------------------
     * 4. CAROUSEL_MEDIA (mobile-API-style container)
     *
     * Some response shapes (e.g. the doc_id GraphQL endpoint, or
     * the mobile info API) list carousel slides under a flat
     * "carousel_media" array on the post container, instead of
     * "edge_sidecar_to_children.edges[].node". Slides here don't
     * carry their own owner/timestamp -- those live on the
     * container, so deep_find_containers() is used to keep them
     * together. addMedia() dedups by URL, so if a post's data also
     * matched via edge_sidecar_to_children above, nothing doubles
     * up here.
     * ---------------------------------------------------------
     */

    $carouselContainers = deep_find_containers($data, ['carousel_media']);

    foreach ($carouselContainers as $container) {

        $username =
            $container['user']['username']
            ?? $container['owner']['username']
            ?? 'unknown_user';

        $timestamp =
            $container['taken_at']
            ?? $container['taken_at_timestamp']
            ?? null;

        foreach ($container['carousel_media'] as $slide) {

            if (!is_array($slide)) {
                continue;
            }

            $isVideo =
                !empty($slide['is_video'])
                || ((int) ($slide['media_type'] ?? 0) === 2);

            /*
             * VIDEO
             */
            if ($isVideo) {

                $videoUrl = best_video($slide);

                if (!$videoUrl && !empty($slide['video_versions'])) {

                    $versions = $slide['video_versions'];

                    usort($versions, function ($a, $b) {
                        return
                            ($b['width'] ?? 0)
                            <=>
                            ($a['width'] ?? 0);
                    });

                    $videoUrl =
                        $versions[0]['url']
                        ?? null;
                }

                if ($videoUrl) {
                    $addMedia(
                        $username,
                        $videoUrl,
                        true,
                        $timestamp
                    );
                }

                continue;
            }

            /*
             * PHOTO
             */
            $imageUrl =
                $slide['display_url']
                ?? null;

            if (!$imageUrl) {

                $candidates =
                    $slide['image_versions2']['candidates']
                    ?? [];

                if (!empty($candidates)) {

                    usort($candidates, function ($a, $b) {
                        return
                            (($b['width'] ?? 0) * ($b['height'] ?? 0))
                            <=>
                            (($a['width'] ?? 0) * ($a['height'] ?? 0));
                    });

                    $imageUrl =
                        $candidates[0]['url']
                        ?? null;
                }
            }

            if ($imageUrl) {
                $addMedia(
                    $username,
                    $imageUrl,
                    false,
                    $timestamp
                );
            }
        }
    }


    return $media;
}


function send_json(
    $data,
    $status = 200
)
{
    http_response_code($status);

    header(
        'Content-Type: application/json; charset=utf-8'
    );

    echo json_encode(
        $data,
        JSON_UNESCAPED_SLASHES
    );

    exit;
}