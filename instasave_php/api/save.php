<?php
require 'common.php';

/*
 * Saves ONE media item to DOWNLOAD_DIR/<username>/<filename>.
 * The username folder is created automatically.
 * Same filename already there -> skipped (no duplicate, no rename).
 */

try {
    $in   = body_json();
    $item = $in['item'] ?? null;

    if (!is_array($item) || empty($item['url'])) {
        throw new Exception('Missing media URL.');
    }

    set_time_limit(120);

    // Folder name = sanitized username (same rule as clean_user)
    $user = clean_user($item['username'] ?? 'unknown_user');

    if (preg_match('/^\.+$/', $user)) {
        $user = '_';
    }

    // Filename: the one stored on the item, else the same deterministic rule
    $name = basename((string) ($item['filename'] ?? ''));
    $name = preg_replace('/[^A-Za-z0-9_.-]/', '_', $name);
    $ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));

    if ($name === '' || !in_array($ext, ['jpg', 'mp4'], true)) {
        $name = filename_for($item);
    }

    $dir = rtrim(DOWNLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR . $user;

    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new Exception('Could not create folder: ' . $user);
    }

    $path   = $dir . DIRECTORY_SEPARATOR . $name;
    $folder = basename(DOWNLOAD_DIR) . '/' . $user;

    if (is_file($path) && filesize($path) > 0) {
        send_json([
            'ok'       => true,
            'status'   => 'skipped',
            'folder'   => $folder,
            'filename' => $name
        ]);
    }

    $data = http_get($item['url'], 90);

    if ($data === '' || $data === null) {
        throw new Exception('Empty download.');
    }

    // Write to a temp name first so a half-finished file never counts as saved
    $tmp = $path . '.part';

    if (file_put_contents($tmp, $data) === false) {
        throw new Exception('Could not write file. Check folder permissions.');
    }

    if (!rename($tmp, $path)) {
        @unlink($tmp);
        throw new Exception('Could not save file.');
    }

    send_json([
        'ok'       => true,
        'status'   => 'saved',
        'folder'   => $folder,
        'filename' => $name
    ]);

} catch (Throwable $e) {
    send_json(['ok' => false, 'error' => $e->getMessage()], 500);
}