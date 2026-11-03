<?php
declare(strict_types=1);
/* Session, CSRF protection and JSON helpers shared by the API endpoints. */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
require_once __DIR__.'/store.php';

const VERRIAN_SESSION_SECONDS = 8 * 3600;

function verrian_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('verrian_sid');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', (string) VERRIAN_SESSION_SECONDS);
    session_save_path(verrian_dir('sessions'));
    session_start();
    if (isset($_SESSION['user']) && ($_SESSION['since'] ?? 0) < time() - VERRIAN_SESSION_SECONDS) $_SESSION = [];
    $_SESSION['csrf'] ??= bin2hex(random_bytes(24));
}

function verrian_login(array $user): void
{
    verrian_session();
    session_regenerate_id(true);
    $_SESSION['user'] = $user;
    $_SESSION['since'] = time();
    $_SESSION['csrf'] = bin2hex(random_bytes(24));
    verrian_remember_user($user);
}

function verrian_logout(): void
{
    verrian_session();
    if (isset($_SESSION['user'])) verrian_audit('logout', $_SESSION['user']);
    $_SESSION = [];
    session_regenerate_id(true);
    $_SESSION['csrf'] = bin2hex(random_bytes(24));
}

function verrian_user(): ?array { verrian_session(); return is_array($_SESSION['user'] ?? null) ? $_SESSION['user'] : null; }
function verrian_is_admin(?array $user): bool { return $user !== null && in_array(strtolower($user['email']), verrian_config()['admins'], true); }

function verrian_json(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function verrian_fail(string $message, int $status = 400): never { verrian_json(['ok' => false, 'error' => $message], $status); }

/** State-changing requests need the session token in a header and must come from this site. */
function verrian_require_post(): array
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') verrian_fail('Metodo non consentito.', 405);
    verrian_session();
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && $origin !== verrian_config()['origin']) verrian_fail('Richiesta da un altro sito.', 403);
    if (!hash_equals($_SESSION['csrf'], (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) verrian_fail('Sessione cambiata: ricarica la pagina.', 403);
    $raw = file_get_contents('php://input', false, null, 0, 400001);
    if (strlen((string) $raw) > 400000) verrian_fail('Livello troppo grande.', 413);
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) verrian_fail('Richiesta non valida.');
    return $data;
}

/** Same-site return paths only, so the login cannot be used to send people elsewhere. */
function verrian_safe_return(mixed $path): string
{
    return is_string($path) && preg_match('#\A/(?:editor/)?(?:[?\#][A-Za-z0-9=&_.\-]*)?\z#', $path) ? $path : '/editor/';
}
