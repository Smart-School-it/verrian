<?php
declare(strict_types=1);
/* Private settings live outside the web root: Google OAuth client, school domain, administrators and data folder. */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

function verrian_config(): array
{
    static $config = null;
    if ($config !== null) return $config;
    $file = getenv('VERRIAN_CONFIG') ?: '/var/www/verrian.verri.edu.it-private/config.php';
    $local = is_file($file) ? require $file : [];
    $config = array_replace([
        'client_id' => '',
        'client_secret' => '',
        'domain' => 'verri.edu.it',
        'origin' => 'https://verrian.verri.edu.it',
        // Teachers who may read the register of all levels with their authors.
        'admins' => [],
        'data_dir' => '/var/www/verrian.verri.edu.it-private/data',
        'node' => '/usr/bin/node',
    ], is_array($local) ? $local : []);
    $config['admins'] = array_values(array_map('strtolower', array_filter((array) $config['admins'], 'is_string')));
    return $config;
}

function verrian_configured(): bool
{
    $c = verrian_config();
    return $c['client_id'] !== '' && $c['client_secret'] !== '';
}

function verrian_redirect_uri(): string
{
    return verrian_config()['origin'].'/api/google-callback.php';
}
