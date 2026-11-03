<?php
declare(strict_types=1);
/* Backend of the level editor: storage and ownership, soft delete, register, server validation and Google ID token checks. Uses a temporary folder. */
$tmp = sys_get_temp_dir().'/verrian-test-'.bin2hex(random_bytes(4));
mkdir($tmp, 0700, true);
file_put_contents($tmp.'/config.php', "<?php return ['client_id'=>'test-client.apps.googleusercontent.com','client_secret'=>'x','domain'=>'verri.edu.it','admins'=>['Prof@verri.edu.it'],'data_dir'=>'$tmp/data'];");
putenv('VERRIAN_CONFIG='.$tmp.'/config.php');
require __DIR__.'/../server/session.php';
require __DIR__.'/../server/google.php';
require __DIR__.'/../server/validate.php';
$n = 0;
function ok(bool $v, string $m): void { global $n; if (!$v) { fwrite(STDERR, "FALLITO: $m\n"); exit(1); } $n++; }
function throws(callable $f, string $class, string $m): void { try { $f(); } catch (Throwable $e) { ok($e instanceof $class, $m.' ('.get_class($e).': '.$e->getMessage().')'); return; } ok(false, $m.' (nessuna eccezione)'); }
try {
    $anna = ['sub' => '111', 'email' => 'anna.rossi@verri.edu.it', 'name' => 'Anna Rossi'];
    $luca = ['sub' => '222', 'email' => 'luca.bianchi@verri.edu.it', 'name' => 'Luca Bianchi'];
    ok(verrian_configured(), 'Configurazione letta dal file privato');
    ok(verrian_is_admin(['email' => 'prof@verri.edu.it']) && !verrian_is_admin($anna) && !verrian_is_admin(null), 'Docenti del registro riconosciuti senza distinzione di maiuscole');
    $v = verrian_validate(['format' => 'verrian-level', 'theme' => 1, 'author' => 'Guardiana<42>', 'level' => ['title' => '<b>Mondo</b>', 'width' => 99999]]);
    ok($v['pack']['author'] === 'Guardiana42' && !str_contains($v['pack']['level']['title'], '<') && $v['pack']['level']['width'] === 8000, 'Il server ripulisce i dati con lo stesso validatore del gioco');
    throws(fn () => verrian_validate(['level' => ['title' => str_repeat('x', 500000)]]), DomainException::class, 'Livelli troppo grandi rifiutati');
    $l = verrian_save_level($anna, null, $v['pack'], $v['check']['ok'], 'vuoto');
    ok(verrian_valid_id($l['id']) && $l['author']['email'] === $anna['email'] && $l['versions'] === 1, 'Creazione con autore verificato');
    $l2 = verrian_save_level($anna, $l['id'], $v['pack'], true);
    ok($l2['id'] === $l['id'] && $l2['versions'] === 2 && $l2['created_at'] === $l['created_at'], 'Aggiornamento dello stesso livello');
    throws(fn () => verrian_save_level($luca, $l['id'], $v['pack'], true), DomainException::class, 'Un altro studente non può modificare il livello');
    throws(fn () => verrian_delete_level($luca, $l['id']), DomainException::class, 'Un altro studente non può eliminarlo');
    ok(count(verrian_user_levels($anna)) === 1 && verrian_user_levels($luca) === [], 'Ognuno vede solo i propri livelli');
    $copy = verrian_save_level($luca, null, $v['pack'], true, 'copia:'.$l['id']);
    ok($copy['author']['sub'] === '222' && $copy['origin'] === 'copia:'.$l['id'], 'La copia appartiene a chi la fa e ricorda l’originale');
    verrian_delete_level($anna, $l['id']);
    ok(!empty(verrian_level($l['id'])['deleted_at']) && verrian_user_levels($anna) === [], 'Eliminazione logica: il livello sparisce dalla libreria');
    $all = verrian_all_levels();
    ok(count($all) === 2 && in_array('anna.rossi@verri.edu.it', array_column($all, 'author_email'), true) && count(array_filter($all, fn ($r) => $r['deleted_at'])) === 1, 'Il registro conserva anche i livelli eliminati con il loro autore');
    $log = array_map(fn ($r) => json_decode($r, true)['action'], file($tmp.'/data/registro.jsonl'));
    ok($log === ['create', 'create', 'delete'], 'Registro delle azioni: creazioni ed eliminazione');
    ok(!verrian_valid_id('../../etc') && !verrian_valid_id('abc') && verrian_level('../config') === null, 'Identificativi non validi rifiutati');
    ok(verrian_safe_return('/editor/?copia=abcdefghij') === '/editor/?copia=abcdefghij' && verrian_safe_return('https://evil.example/') === '/editor/' && verrian_safe_return('//evil.example') === '/editor/', 'Ritorno dopo l’accesso solo verso pagine del sito');
    // ID token signed with a test key, verified with the same code path used for Google's keys.
    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    $d = openssl_pkey_get_details($key)['rsa'];
    $jwks = [['kty' => 'RSA', 'kid' => 'k1', 'alg' => 'RS256', 'n' => verrian_b64url_encode($d['n']), 'e' => verrian_b64url_encode($d['e'])]];
    $token = function (array $over = [], string $kid = 'k1', $signKey = null) use ($key) {
        $claims = array_replace(['iss' => 'https://accounts.google.com', 'aud' => 'test-client.apps.googleusercontent.com', 'sub' => '999', 'email' => 'Mario.Verdi@verri.edu.it', 'email_verified' => true, 'hd' => 'verri.edu.it', 'name' => 'Mario Verdi', 'nonce' => 'N', 'iat' => 1000, 'exp' => 4600], $over);
        $h = verrian_b64url_encode(json_encode(['alg' => 'RS256', 'kid' => $kid])).'.'.verrian_b64url_encode(json_encode($claims));
        openssl_sign($h, $sig, $signKey ?? $key, OPENSSL_ALGO_SHA256);
        return $h.'.'.verrian_b64url_encode($sig);
    };
    $c = verrian_verify_id_token($token(), 'N', $jwks, 2000);
    ok($c['sub'] === '999' && $c['email'] === 'Mario.Verdi@verri.edu.it', 'Token valido accettato');
    throws(fn () => verrian_verify_id_token($token(['hd' => 'gmail.com', 'email' => 'x@gmail.com']), 'N', $jwks, 2000), DomainException::class, 'Account fuori dominio rifiutato');
    throws(fn () => verrian_verify_id_token($token(['hd' => 'verri.edu.it', 'email' => 'x@gmail.com']), 'N', $jwks, 2000), DomainException::class, 'E-mail di un altro dominio rifiutata');
    throws(fn () => verrian_verify_id_token($token(['email_verified' => false]), 'N', $jwks, 2000), DomainException::class, 'E-mail non verificata rifiutata');
    throws(fn () => verrian_verify_id_token($token(['aud' => 'altra-app']), 'N', $jwks, 2000), UnexpectedValueException::class, 'Token di un’altra applicazione rifiutato');
    throws(fn () => verrian_verify_id_token($token(), 'N', $jwks, 9000), UnexpectedValueException::class, 'Token scaduto rifiutato');
    throws(fn () => verrian_verify_id_token($token(), 'ALTRO', $jwks, 2000), UnexpectedValueException::class, 'Nonce diverso rifiutato');
    throws(fn () => verrian_verify_id_token($token([], 'k1', openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA])), 'N', $jwks, 2000), UnexpectedValueException::class, 'Firma falsa rifiutata');
    throws(fn () => verrian_verify_id_token($token([], 'k9'), 'N', $jwks, 2000), UnexpectedValueException::class, 'Chiave sconosciuta rifiutata');
    $parts = explode('.', $token());
    throws(fn () => verrian_verify_id_token(verrian_b64url_encode(json_encode(['alg' => 'none', 'kid' => 'k1'])).'.'.$parts[1].'.', 'N', $jwks, 2000), UnexpectedValueException::class, 'Token senza firma rifiutato');
    echo "Officina dei livelli lato server: $n controlli superati.\n";
} finally {
    exec('rm -rf '.escapeshellarg($tmp));
}
