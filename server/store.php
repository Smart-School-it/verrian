<?php
declare(strict_types=1);
/* File storage for student levels: one JSON file per level, one per author, and an append-only register of every action. */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
require_once __DIR__.'/config.php';

const VERRIAN_MAX_LEVELS_PER_USER = 60;

function verrian_dir(string $sub = ''): string
{
    $dir = rtrim(verrian_config()['data_dir'], '/').($sub !== '' ? '/'.$sub : '');
    if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) throw new RuntimeException('Archivio non disponibile.');
    return $dir;
}

function verrian_read(string $file): ?array
{
    if (!is_file($file)) return null;
    $data = json_decode((string) file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

/** Atomic write: a reader never sees a half-written file. */
function verrian_write(string $file, array $data): void
{
    $tmp = $file.'.'.bin2hex(random_bytes(6)).'.tmp';
    if (file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), LOCK_EX) === false || !rename($tmp, $file)) {
        @unlink($tmp);
        throw new RuntimeException('Salvataggio non riuscito.');
    }
}

/** Serialises every change to the archive, so an author index and its levels stay consistent. */
function verrian_locked(callable $fn): mixed
{
    $lock = fopen(verrian_dir().'/.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Archivio occupato, riprova.');
    try { return $fn(); } finally { flock($lock, LOCK_UN); fclose($lock); }
}

function verrian_valid_id(mixed $id): bool
{
    return is_string($id) && preg_match('/\A[A-Za-z0-9]{10}\z/', $id) === 1;
}

function verrian_new_id(): string
{
    $chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
        $id = '';
        for ($i = 0; $i < 10; $i++) $id .= $chars[random_int(0, strlen($chars) - 1)];
    } while (is_file(verrian_dir('levels').'/'.$id.'.json'));
    return $id;
}

function verrian_level_file(string $id): string { return verrian_dir('levels').'/'.$id.'.json'; }
function verrian_user_file(string $sub): string { return verrian_dir('users').'/'.hash('sha256', 'google:'.$sub).'.json'; }

function verrian_level(string $id): ?array
{
    return verrian_valid_id($id) ? verrian_read(verrian_level_file($id)) : null;
}

/** Register of who did what: one JSON line per action, never rewritten. */
function verrian_audit(string $action, array $user, ?string $id = null, array $extra = []): void
{
    $row = ['at' => gmdate('Y-m-d\TH:i:s\Z'), 'action' => $action, 'level' => $id, 'email' => $user['email'] ?? null, 'name' => $user['name'] ?? null] + $extra;
    file_put_contents(verrian_dir().'/registro.jsonl', json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n", FILE_APPEND | LOCK_EX);
}

function verrian_remember_user(array $user): void
{
    verrian_locked(function () use ($user) {
        $file = verrian_user_file($user['sub']);
        $doc = verrian_read($file) ?? ['sub' => $user['sub'], 'levels' => [], 'first_login' => gmdate('Y-m-d\TH:i:s\Z')];
        $doc['email'] = $user['email'];
        $doc['name'] = $user['name'];
        $doc['last_login'] = gmdate('Y-m-d\TH:i:s\Z');
        verrian_write($file, $doc);
    });
    verrian_audit('login', $user);
}

/** Creates or updates a level owned by $user. $pack is already cleaned and checked by the shared validator. */
function verrian_save_level(array $user, ?string $id, array $pack, bool $ok, ?string $origin = null): array
{
    return verrian_locked(function () use ($user, $id, $pack, $ok, $origin) {
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $userFile = verrian_user_file($user['sub']);
        $owner = verrian_read($userFile) ?? ['sub' => $user['sub'], 'email' => $user['email'], 'name' => $user['name'], 'levels' => []];
        if ($id === null) {
            $active = array_filter($owner['levels'], static fn ($l) => ($l = verrian_level($l)) && empty($l['deleted_at']));
            if (count($active) >= VERRIAN_MAX_LEVELS_PER_USER) throw new DomainException('Hai raggiunto il limite di '.VERRIAN_MAX_LEVELS_PER_USER.' livelli: elimina quelli che non ti servono più.');
            $id = verrian_new_id();
            $level = ['id' => $id, 'author' => ['sub' => $user['sub'], 'email' => $user['email'], 'name' => $user['name']], 'created_at' => $now, 'origin' => $origin, 'versions' => 0];
            $owner['levels'][] = $id;
            $action = 'create';
        } else {
            $level = verrian_level($id);
            if (!$level || !empty($level['deleted_at'])) throw new DomainException('Livello non trovato.');
            if ($level['author']['sub'] !== $user['sub']) throw new DomainException('Puoi modificare soltanto i tuoi livelli: fanne una copia.');
            $action = 'update';
        }
        $level['pack'] = $pack;
        $level['playable'] = $ok;
        $level['updated_at'] = $now;
        $level['versions'] = ($level['versions'] ?? 0) + 1;
        verrian_write(verrian_level_file($id), $level);
        $owner['email'] = $user['email'];
        $owner['name'] = $user['name'];
        verrian_write($userFile, $owner);
        // Edits are frequent (autosave): the register keeps creations, copies and deletions, plus the first edit of each minute.
        if ($action === 'create' || substr($level['last_logged'] ?? '', 0, 16) !== substr($now, 0, 16)) {
            verrian_audit($action, $user, $id, ['title' => $pack['level']['title'] ?? '', 'origin' => $origin]);
            $level['last_logged'] = $now;
            verrian_write(verrian_level_file($id), $level);
        }
        return $level;
    });
}

/** Soft delete: the level stops being playable but stays in the register, so authorship is never lost. */
function verrian_delete_level(array $user, string $id): void
{
    verrian_locked(function () use ($user, $id) {
        $level = verrian_level($id);
        if (!$level || !empty($level['deleted_at'])) throw new DomainException('Livello non trovato.');
        if ($level['author']['sub'] !== $user['sub']) throw new DomainException('Puoi eliminare soltanto i tuoi livelli.');
        $level['deleted_at'] = gmdate('Y-m-d\TH:i:s\Z');
        verrian_write(verrian_level_file($id), $level);
    });
    verrian_audit('delete', $user, $id);
}

/** Levels of one author, newest first, without the full pack. */
function verrian_user_levels(array $user): array
{
    $owner = verrian_read(verrian_user_file($user['sub'])) ?? ['levels' => []];
    $out = [];
    foreach ($owner['levels'] as $id) {
        $l = verrian_level($id);
        if ($l && empty($l['deleted_at'])) $out[] = verrian_summary($l);
    }
    usort($out, static fn ($a, $b) => strcmp($b['updated_at'], $a['updated_at']));
    return $out;
}

function verrian_summary(array $l, bool $withAuthor = false): array
{
    $s = ['id' => $l['id'], 'title' => $l['pack']['level']['title'] ?? '', 'theme' => $l['pack']['theme'] ?? 0, 'nickname' => $l['pack']['author'] ?? '', 'playable' => (bool) ($l['playable'] ?? false), 'created_at' => $l['created_at'], 'updated_at' => $l['updated_at'], 'origin' => $l['origin'] ?? null];
    if ($withAuthor) $s += ['author_name' => $l['author']['name'], 'author_email' => $l['author']['email'], 'deleted_at' => $l['deleted_at'] ?? null, 'versions' => $l['versions'] ?? 1];
    return $s;
}

/** Register for administrators: every level with its verified author, including deleted ones. */
function verrian_all_levels(): array
{
    $out = [];
    foreach (glob(verrian_dir('levels').'/*.json') ?: [] as $file) {
        $l = verrian_read($file);
        if ($l && isset($l['id'])) $out[] = verrian_summary($l, true);
    }
    usort($out, static fn ($a, $b) => strcmp($b['updated_at'], $a['updated_at']));
    return $out;
}
