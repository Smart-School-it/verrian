<?php
declare(strict_types=1);
/* Google sign-in (OpenID Connect, authorization code + PKCE). Only verified accounts of the school domain are accepted. */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
require_once __DIR__.'/store.php';

const VERRIAN_GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const VERRIAN_GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const VERRIAN_GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';

function verrian_b64url_encode(string $v): string { return rtrim(strtr(base64_encode($v), '+/', '-_'), '='); }
function verrian_b64url_decode(string $v): string
{
    $out = base64_decode(strtr($v, '-_', '+/').str_repeat('=', (4 - strlen($v) % 4) % 4), true);
    if ($out === false) throw new UnexpectedValueException('Token non valido.');
    return $out;
}

/** Authorization URL; state, nonce and PKCE verifier stay in the session until the callback. */
function verrian_google_auth_url(string $return): string
{
    $c = verrian_config();
    $state = verrian_b64url_encode(random_bytes(24));
    $nonce = verrian_b64url_encode(random_bytes(24));
    $verifier = verrian_b64url_encode(random_bytes(48));
    $_SESSION['oauth'] = ['state' => $state, 'nonce' => $nonce, 'verifier' => $verifier, 'return' => $return, 'at' => time()];
    return VERRIAN_GOOGLE_AUTH.'?'.http_build_query([
        'client_id' => $c['client_id'], 'redirect_uri' => verrian_redirect_uri(), 'response_type' => 'code',
        'scope' => 'openid email profile', 'state' => $state, 'nonce' => $nonce, 'hd' => $c['domain'], 'prompt' => 'select_account',
        'code_challenge' => verrian_b64url_encode(hash('sha256', $verifier, true)), 'code_challenge_method' => 'S256',
    ]);
}

function verrian_http_post(string $url, array $fields): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($fields), CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = is_string($body) ? json_decode($body, true) : null;
    if ($status !== 200 || !is_array($data)) throw new RuntimeException('Google non ha confermato l’accesso. Riprova.');
    return $data;
}

/** Google signing keys, cached for an hour; refreshed once when a token uses an unknown key id. */
function verrian_google_keys(bool $fresh = false): array
{
    $cache = verrian_dir().'/google-jwks.json';
    $doc = verrian_read($cache);
    if (!$fresh && $doc && ($doc['at'] ?? 0) > time() - 3600) return $doc['keys'];
    $ch = curl_init(VERRIAN_GOOGLE_JWKS);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
    $body = curl_exec($ch);
    curl_close($ch);
    $data = is_string($body) ? json_decode($body, true) : null;
    if (!is_array($data['keys'] ?? null)) {
        if ($doc) return $doc['keys'];
        throw new RuntimeException('Chiavi di Google non disponibili.');
    }
    verrian_write($cache, ['at' => time(), 'keys' => $data['keys']]);
    return $data['keys'];
}

function verrian_der(int $tag, string $value): string
{
    $len = strlen($value);
    $head = $len < 128 ? chr($len) : (($b = ltrim(pack('N', $len), "\0")) !== '' ? chr(0x80 | strlen($b)).$b : '');
    return chr($tag).$head.$value;
}

/** RSA public key in PEM from the modulus and exponent of a JWK. */
function verrian_jwk_pem(array $key): string
{
    $int = static function (string $v): string { $v = ltrim($v, "\0"); if ($v === '' || ord($v[0]) > 127) $v = "\0".$v; return verrian_der(0x02, $v); };
    $rsa = verrian_der(0x30, $int(verrian_b64url_decode($key['n'])).$int(verrian_b64url_decode($key['e'])));
    $spki = verrian_der(0x30, verrian_der(0x30, verrian_der(0x06, "\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01").verrian_der(0x05, '')).verrian_der(0x03, "\0".$rsa));
    return "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($spki), 64, "\n")."-----END PUBLIC KEY-----\n";
}

/** Checks signature (RS256), issuer, audience, expiry, nonce, verified e-mail and school domain. Returns the claims. */
function verrian_verify_id_token(string $token, string $nonce, ?array $keys = null, ?int $now = null): array
{
    $c = verrian_config();
    $parts = explode('.', $token);
    if (count($parts) !== 3) throw new UnexpectedValueException('Token non valido.');
    $header = json_decode(verrian_b64url_decode($parts[0]), true);
    $claims = json_decode(verrian_b64url_decode($parts[1]), true);
    if (!is_array($header) || !is_array($claims) || ($header['alg'] ?? '') !== 'RS256' || !is_string($header['kid'] ?? null)) throw new UnexpectedValueException('Token non valido.');
    $find = static fn (array $ks) => array_values(array_filter($ks, static fn ($k) => ($k['kid'] ?? null) === $header['kid'] && ($k['kty'] ?? '') === 'RSA'))[0] ?? null;
    $key = $find($keys ?? verrian_google_keys());
    if (!$key && $keys === null) $key = $find(verrian_google_keys(true));
    if (!$key) throw new UnexpectedValueException('Chiave del token sconosciuta.');
    if (openssl_verify($parts[0].'.'.$parts[1], verrian_b64url_decode($parts[2]), verrian_jwk_pem($key), OPENSSL_ALGO_SHA256) !== 1) throw new UnexpectedValueException('Firma del token non valida.');
    $now ??= time();
    if (!in_array($claims['iss'] ?? '', ['https://accounts.google.com', 'accounts.google.com'], true) || ($claims['aud'] ?? '') !== $c['client_id']) throw new UnexpectedValueException('Token destinato a un’altra applicazione.');
    if (!is_int($claims['exp'] ?? null) || $claims['exp'] < $now - 60 || ($claims['iat'] ?? 0) > $now + 300) throw new UnexpectedValueException('Token scaduto: riprova l’accesso.');
    if (!hash_equals($nonce, (string) ($claims['nonce'] ?? ''))) throw new UnexpectedValueException('Accesso non riconosciuto: riprova.');
    $email = strtolower((string) ($claims['email'] ?? ''));
    if (($claims['email_verified'] ?? false) !== true || ($claims['hd'] ?? '') !== $c['domain'] || !str_ends_with($email, '@'.$c['domain'])) throw new DomainException('Puoi accedere soltanto con un account @'.$c['domain'].'.');
    if (!is_string($claims['sub'] ?? null) || $claims['sub'] === '') throw new UnexpectedValueException('Token non valido.');
    return $claims;
}

/** Callback: exchanges the code, verifies the identity and starts the session. Returns the page to go back to. */
function verrian_google_finish(array $query): string
{
    $o = $_SESSION['oauth'] ?? null;
    unset($_SESSION['oauth']);
    if (!is_array($o) || !is_string($query['state'] ?? null) || !hash_equals($o['state'], $query['state']) || $o['at'] < time() - 600) throw new UnexpectedValueException('Richiesta di accesso scaduta o non valida: riprova.');
    if (isset($query['error'])) throw new DomainException('Accesso annullato.');
    if (!is_string($query['code'] ?? null)) throw new UnexpectedValueException('Risposta di Google incompleta.');
    $c = verrian_config();
    $tokens = verrian_http_post(VERRIAN_GOOGLE_TOKEN, ['code' => $query['code'], 'client_id' => $c['client_id'], 'client_secret' => $c['client_secret'], 'redirect_uri' => verrian_redirect_uri(), 'grant_type' => 'authorization_code', 'code_verifier' => $o['verifier']]);
    if (!is_string($tokens['id_token'] ?? null)) throw new RuntimeException('Google non ha inviato l’identità.');
    $claims = verrian_verify_id_token($tokens['id_token'], $o['nonce']);
    verrian_login(['sub' => $claims['sub'], 'email' => strtolower($claims['email']), 'name' => trim((string) ($claims['name'] ?? '')) ?: strtolower($claims['email'])]);
    return $o['return'];
}
