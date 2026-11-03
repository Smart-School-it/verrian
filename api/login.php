<?php
declare(strict_types=1);
// Starts Google sign-in; only @verri.edu.it accounts are accepted on return.
require __DIR__.'/../server/session.php';
require __DIR__.'/../server/google.php';
verrian_session();
header('Cache-Control: no-store, private');
if (!verrian_configured()) { http_response_code(503); header('Content-Type: text/plain; charset=utf-8'); echo 'Accesso con Google non ancora configurato.'; exit; }
header('Location: '.verrian_google_auth_url(verrian_safe_return($_GET['return'] ?? '/editor/')), true, 302);
