<?php

require_once __DIR__ . '/common.php';


/*
|--------------------------------------------------------------------------
| Get Instagram User ID
|--------------------------------------------------------------------------
*/

function username_to_user_id($username)
{
    $username = trim($username);

    if ($username === '') {
        return null;
    }

    $url = 'https://www.instagram.com/' . rawurlencode($username) . '/';

    $headers = [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: en-US,en;q=0.9',
    ];

    try {

        $ch = curl_init($url);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_ENCODING => '',
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $html = curl_exec($ch);

        if ($html === false) {
            curl_close($ch);
            return null;
        }

        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        curl_close($ch);

        if ($httpCode >= 400) {
            return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Same patterns as your Python script
        |--------------------------------------------------------------------------
        */

        if (preg_match('/"user_id"\s*:\s*"(\d+)"/', $html, $match)) {
            return $match[1];
        }

        if (preg_match('/"id"\s*:\s*"(\d+)"/', $html, $match)) {
            return $match[1];
        }


        /*
        |--------------------------------------------------------------------------
        | Additional Instagram patterns
        |--------------------------------------------------------------------------
        */

        $additionalPatterns = [
            '/"profilePage_(\d+)"/',
            '/"pk"\s*:\s*"(\d+)"/',
            '/"user"\s*:\s*\{.*?"id"\s*:\s*"(\d+)"/s',
            '/"owner"\s*:\s*\{.*?"id"\s*:\s*"(\d+)"/s',
        ];

        foreach ($additionalPatterns as $pattern) {

            if (preg_match($pattern, $html, $match)) {
                return $match[1];
            }

        }

    } catch (Throwable $e) {

        return null;
    }

    return null;
}


/*
|--------------------------------------------------------------------------
| Story GraphQL URL
|--------------------------------------------------------------------------
*/

function build_story_graphql_url($userId)
{
    $variables = [
        'reel_ids' => [(int) $userId],
        'highlight_reel_ids' => [],
        'precomposed_overlay' => false
    ];

    $json = json_encode(
        $variables,
        JSON_UNESCAPED_SLASHES
    );

    $encoded = rawurlencode($json);

    return
        'https://www.instagram.com/graphql/query/' .
        '?query_hash=de8017ee0a7c9c45ec4260733d81ea31' .
        '&variables=' .
        $encoded;
}


/*
|--------------------------------------------------------------------------
| Highlight GraphQL URL
|--------------------------------------------------------------------------
*/

function build_highlight_graphql_url($highlightId)
{
    $variables = [
        'reel_ids' => [],
        'highlight_reel_ids' => [(int) $highlightId],
        'precomposed_overlay' => false
    ];

    $json = json_encode(
        $variables,
        JSON_UNESCAPED_SLASHES
    );

    $encoded = rawurlencode($json);

    return
        'https://www.instagram.com/graphql/query/' .
        '?query_hash=de8017ee0a7c9c45ec4260733d81ea31' .
        '&variables=' .
        $encoded;
}


/*
|--------------------------------------------------------------------------
| Post GraphQL URL (doc_id based)
|--------------------------------------------------------------------------
|
| The old ?__a=1&__d=dis endpoint and the old query_hash GraphQL
| endpoint are both dead for single posts. Instagram's own frontend
| now calls this doc_id-based GraphQL query instead. Response shape
| is {"data":{"xdt_shortcode_media": {...}}} -- already handled by
| extract_media()'s deep search.
|
*/

function build_post_graphql_url($shortcode)
{
    $variables = [
        'shortcode' => $shortcode,
        'fetch_tagged_user_count' => null,
        'hoisted_comment_id' => null,
        'hoisted_reply_id' => null
    ];

    $json = json_encode(
        $variables,
        JSON_UNESCAPED_SLASHES
    );

    $encoded = rawurlencode($json);

    return
        'https://www.instagram.com/graphql/query/' .
        '?doc_id=24368985919464652' .
        '&variables=' .
        $encoded;
}


/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

try {

    $input = body_json();

    $url = trim($input['url'] ?? '');

    /*
    |--------------------------------------------------------------------------
    | Manual User ID, if supplied by frontend
    |--------------------------------------------------------------------------
    */

    $manualUserId = trim($input['user_id'] ?? '');


    if ($url === '') {

        throw new Exception(
            'Please enter an Instagram URL.'
        );

    }


    /*
    |--------------------------------------------------------------------------
    | 1. HIGHLIGHT
    |--------------------------------------------------------------------------
    |
    | MUST come before normal /stories/ detection.
    |
    */

    if (
        preg_match(
            '~instagram\.com/stories/highlights/(\d+)~i',
            $url,
            $match
        )
    ) {

        $highlightId = $match[1];

        $generatedUrl =
            build_highlight_graphql_url($highlightId);

        send_json([
            'ok' => true,
            'type' => 'highlight',
            'highlight_id' => $highlightId,
            'url' => $generatedUrl
        ]);

    }


    /*
    |--------------------------------------------------------------------------
    | 2. REGULAR STORY
    |--------------------------------------------------------------------------
    */

    if (
        preg_match(
            '~instagram\.com/stories/([^/?#]+)~i',
            $url,
            $match
        )
    ) {

        $username = $match[1];


        /*
        |--------------------------------------------------------------------------
        | Try automatic user ID
        |--------------------------------------------------------------------------
        */

        $userId = username_to_user_id($username);


        /*
        |--------------------------------------------------------------------------
        | If automatic lookup fails, use manually supplied ID
        |--------------------------------------------------------------------------
        */

        if (!$userId && $manualUserId !== '') {

            if (!preg_match('/^\d+$/', $manualUserId)) {

                throw new Exception(
                    'Invalid Instagram user ID.'
                );

            }

            $userId = $manualUserId;
        }


        /*
        |--------------------------------------------------------------------------
        | Still no user ID
        |--------------------------------------------------------------------------
        */

        if (!$userId) {

            send_json([
                'ok' => false,
                'needs_user_id' => true,
                'username' => $username,
                'error' =>
                    'Could not automatically find the Instagram user ID for @' .
                    $username .
                    '.'
            ], 422);

        }


        /*
        |--------------------------------------------------------------------------
        | Build exact same GraphQL structure as Python
        |--------------------------------------------------------------------------
        */

        $generatedUrl =
            build_story_graphql_url($userId);


        send_json([
            'ok' => true,
            'type' => 'story',
            'username' => $username,
            'user_id' => $userId,
            'url' => $generatedUrl
        ]);

    }


    /*
    |--------------------------------------------------------------------------
    | 3. POST / REEL
    |--------------------------------------------------------------------------
    */

    if (
        preg_match(
            '~instagram\.com/(p|reel)/([^/?#]+)~i',
            $url,
            $match
        )
    ) {

        $shortcode = $match[2];

        $generatedUrl =
            build_post_graphql_url($shortcode);


        send_json([
            'ok' => true,
            'type' => 'post',
            'shortcode' => $shortcode,
            'url' => $generatedUrl
        ]);

    }


    /*
    |--------------------------------------------------------------------------
    | Unsupported URL
    |--------------------------------------------------------------------------
    */

    throw new Exception(
        'Unsupported Instagram URL.'
    );


} catch (Throwable $e) {

    send_json([
        'ok' => false,
        'error' => $e->getMessage()
    ], 400);

}