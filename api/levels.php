<?php
declare(strict_types=1);
/*
 * GET ?id=X       public: a playable level for the game (author shown by nickname only)
 * GET ?mine=1     signed in: my levels;  GET ?own=X: one of my levels to edit
 * GET ?all=1      administrators: register of every level with its verified author
 * POST {action: save|copy|delete}  signed in, with the X-CSRF-Token header
 */
require __DIR__.'/../server/session.php';
require __DIR__.'/../server/validate.php';
try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
        if (isset($_GET['id'])) {
            $l = verrian_level((string) $_GET['id']);
            if (!$l) verrian_fail('Livello non trovato.', 404);
            if (!empty($l['deleted_at'])) verrian_fail('Questo livello è stato eliminato dal suo autore.', 410);
            verrian_json(['ok' => true, 'id' => $l['id'], 'pack' => $l['pack'], 'updated_at' => $l['updated_at']]);
        }
        $user = verrian_user();
        if (!$user) verrian_fail('Accedi con il tuo account @'.verrian_config()['domain'].'.', 401);
        if (isset($_GET['mine'])) verrian_json(['ok' => true, 'levels' => verrian_user_levels($user)]);
        if (isset($_GET['own'])) {
            $l = verrian_level((string) $_GET['own']);
            if (!$l || !empty($l['deleted_at']) || $l['author']['sub'] !== $user['sub']) verrian_fail('Livello non trovato tra i tuoi.', 404);
            verrian_json(['ok' => true, 'level' => verrian_summary($l), 'pack' => $l['pack']]);
        }
        if (isset($_GET['all'])) {
            if (!verrian_is_admin($user)) verrian_fail('Registro riservato ai docenti indicati nella configurazione.', 403);
            verrian_json(['ok' => true, 'levels' => verrian_all_levels()]);
        }
        verrian_fail('Richiesta non valida.');
    }
    $data = verrian_require_post();
    $user = verrian_user();
    if (!$user) verrian_fail('Accedi con il tuo account @'.verrian_config()['domain'].'.', 401);
    $action = $data['action'] ?? '';
    if ($action === 'save') {
        $id = $data['id'] ?? null;
        if ($id !== null && !verrian_valid_id($id)) verrian_fail('Livello non valido.');
        $origin = is_string($data['origin'] ?? null) && preg_match('/\A(?:remix:[0-3]|file|link|browser|vuoto)\z/', $data['origin']) ? $data['origin'] : null;
        $v = verrian_validate($data['pack'] ?? null);
        $l = verrian_save_level($user, $id, $v['pack'], $v['check']['ok'], $id === null ? $origin : null);
        verrian_json(['ok' => true, 'level' => verrian_summary($l), 'pack' => $l['pack'], 'check' => $v['check']]);
    }
    if ($action === 'copy') {
        $src = verrian_level((string) ($data['id'] ?? ''));
        if (!$src || !empty($src['deleted_at'])) verrian_fail('Livello da copiare non trovato.', 404);
        $pack = $src['pack'];
        $pack['level']['title'] = mb_substr($pack['level']['title'], 0, 52).' · copia';
        // A copy is a new author's work: the original nickname does not travel with it.
        $pack['author'] = '';
        $v = verrian_validate($pack);
        $l = verrian_save_level($user, null, $v['pack'], $v['check']['ok'], 'copia:'.$src['id']);
        verrian_json(['ok' => true, 'level' => verrian_summary($l), 'pack' => $l['pack']]);
    }
    if ($action === 'delete') {
        verrian_delete_level($user, (string) ($data['id'] ?? ''));
        verrian_json(['ok' => true]);
    }
    verrian_fail('Azione non valida.');
} catch (DomainException $e) {
    verrian_fail($e->getMessage(), 422);
} catch (Throwable $e) {
    error_log('Verrian levels: '.$e->getMessage());
    verrian_fail('Servizio non disponibile, riprova tra poco.', 500);
}
