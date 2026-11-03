<?php
declare(strict_types=1);
/* Runs the shared JavaScript validator (assets/verrian/level-format.js) on untrusted levels: data on stdin, never code. */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
require_once __DIR__.'/config.php';

function verrian_validate(mixed $pack): array
{
    $raw = json_encode($pack, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    if (strlen($raw) > 400000) throw new DomainException('Livello troppo grande.');
    $node = verrian_config()['node'];
    if (!is_executable($node)) throw new RuntimeException('Verifica dei livelli non disponibile sul server.');
    $proc = proc_open([$node, '--max-old-space-size=64', __DIR__.'/clean-level.cjs'], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, __DIR__, ['LANG' => 'C.UTF-8']);
    if (!is_resource($proc)) throw new RuntimeException('Verifica dei livelli non disponibile.');
    try {
        stream_set_blocking($pipes[1], false);
        fwrite($pipes[0], $raw);
        fclose($pipes[0]);
        $out = '';
        $deadline = microtime(true) + 4;
        while (true) {
            $out .= (string) stream_get_contents($pipes[1]);
            $status = proc_get_status($proc);
            if (!$status['running']) break;
            if (microtime(true) > $deadline || strlen($out) > 600000) throw new RuntimeException('La verifica del livello non è terminata.');
            usleep(2000);
        }
        $out .= (string) stream_get_contents($pipes[1]);
        $result = json_decode($out, true);
        if (!is_array($result)) throw new RuntimeException('Verifica del livello non riuscita.');
        if (($result['ok'] ?? false) !== true) throw new DomainException($result['error'] ?? 'Livello non valido.');
        return ['pack' => $result['pack'], 'check' => $result['check']];
    } finally {
        foreach ($pipes as $p) if (is_resource($p)) fclose($p);
        $s = proc_get_status($proc);
        if ($s['running']) proc_terminate($proc, 9);
        proc_close($proc);
    }
}
