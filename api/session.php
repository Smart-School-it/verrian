<?php
declare(strict_types=1);
// GET: who is signed in (and the CSRF token). POST {action:"logout"}: ends the session.
require __DIR__.'/../server/session.php';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $data = verrian_require_post();
    if (($data['action'] ?? '') !== 'logout') verrian_fail('Azione non valida.');
    verrian_logout();
    verrian_json(['ok' => true, 'user' => null, 'csrf' => $_SESSION['csrf']]);
}
$user = verrian_user();
verrian_json(['ok' => true, 'configured' => verrian_configured(), 'domain' => verrian_config()['domain'], 'user' => $user ? ['name' => $user['name'], 'email' => $user['email']] : null, 'admin' => verrian_is_admin($user), 'csrf' => $_SESSION['csrf']]);
