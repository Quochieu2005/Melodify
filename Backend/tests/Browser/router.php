<?php

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($path !== '/' && is_file(dirname(__DIR__, 2).'/public'.$path)) {
    return false;
}

$app = require __DIR__.'/bootstrap.php';
if (preg_match('#^/_browser/files/([a-zA-Z0-9_.-]+)$#', $path, $matches)) {
    $file = $testDirectory.'/files/'.$matches[1];
    if (! is_file($file)) {
        http_response_code(404);

        return;
    }
    $response = new BinaryFileResponse($file);
    $response->headers->set('Access-Control-Allow-Origin', '*');
    $response->prepare(Request::capture())->send();

    return;
}
$app->handleRequest(Request::capture());
