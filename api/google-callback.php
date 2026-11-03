<?php
declare(strict_types=1);
// Redirect URI registered in the Google Cloud console: https://verrian.verri.edu.it/api/google-callback.php
require __DIR__.'/../server/session.php';
require __DIR__.'/../server/google.php';
verrian_session();
header('Cache-Control: no-store, private');
try {
    $return = verrian_google_finish($_GET);
    header('Location: '.verrian_safe_return($return), true, 303);
} catch (Throwable $e) {
    $message = $e instanceof DomainException || $e instanceof UnexpectedValueException ? $e->getMessage() : 'Accesso non riuscito. Riprova tra poco.';
    if (!($e instanceof DomainException || $e instanceof UnexpectedValueException)) error_log('Verrian login: '.$e->getMessage());
    header('Location: /editor/?accesso='.rawurlencode(mb_substr($message, 0, 160)), true, 303);
}
