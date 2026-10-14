<?php
require 'common.php';

try {
    $in  = body_json();
    $url = $in['url'] ?? '';

    if (!$url) {
        throw new Exception('Missing media URL.');
    }

    // Same filename the card shows. Old items without one get the
    // same deterministic name computed here.
    $name = basename($in['filename'] ?? '');

    if ($name === '' || $name === '.' || $name === '..') {
        $name = filename_for($in);
    }

    $name = preg_replace('/[^A-Za-z0-9_.-]/', '_', $name);

    $data = http_get($url, 90);

    $ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $mime = $ext === 'mp4' ? 'video/mp4' : 'image/jpeg';

    header('Content-Type: ' . $mime);
    header('Content-Disposition: attachment; filename="' . $name . '"');
    header('Content-Length: ' . strlen($data));

    echo $data;

} catch (Throwable $e) {
    send_json(['ok' => false, 'error' => $e->getMessage()], 500);
}