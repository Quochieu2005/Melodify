<?php

/*
|--------------------------------------------------------------------------
| Trusted proxies
|--------------------------------------------------------------------------
|
| On Render the app sits behind a load balancer, so the TCP peer is always the
| balancer and the visitor's address only arrives in X-Forwarded-For. Without
| trusting the balancer, $request->ip() is the balancer's address for everyone:
| every per-IP rate limit and per-IP cap (login, OTP, media, catalog, reports,
| share/view caps) becomes one bucket shared by all visitors, and the admin
| audit log records the balancer instead of the person.
|
| By default the private ranges are trusted (the balancer reaches the container
| from the private network). Trusting only those means a client cannot forge
| its address: Symfony skips trusted hops from the right and takes the first
| public one, which the balancer wrote. Set TRUSTED_PROXIES to a comma
| separated list of addresses or CIDR ranges, or to "*" to trust every hop (a
| client can then forge X-Forwarded-For, so only use it when nothing but the
| balancer can reach the app).
|
*/

$configured = trim((string) env('TRUSTED_PROXIES', '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1'));

return [
    'proxies' => $configured === '*'
        ? '*'
        : array_values(array_filter(array_map('trim', explode(',', $configured)))),
];
