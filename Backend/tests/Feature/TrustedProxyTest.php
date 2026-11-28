<?php

namespace Tests\Feature;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class TrustedProxyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Route::get('/__client-ip', fn (Request $request) => response($request->ip()));
    }

    private function clientIp(string $remoteAddr, ?string $forwardedFor): string
    {
        $server = ['REMOTE_ADDR' => $remoteAddr] + ($forwardedFor !== null ? ['HTTP_X_FORWARDED_FOR' => $forwardedFor] : []);

        return $this->withServerVariables($server)->get('/__client-ip')->assertOk()->getContent();
    }

    public function test_the_visitor_address_comes_from_x_forwarded_for_when_the_peer_is_the_load_balancer(): void
    {
        // Render's balancer connects from the private network and writes the visitor's address.
        $this->assertSame('203.0.113.9', $this->clientIp('10.20.30.40', '203.0.113.9'));
    }

    public function test_an_address_the_client_put_in_front_of_the_real_one_is_ignored(): void
    {
        // The client sent "198.51.100.7"; the balancer appended the real address after it.
        $this->assertSame('203.0.113.9', $this->clientIp('10.20.30.40', '198.51.100.7, 203.0.113.9'));
    }

    public function test_a_request_that_does_not_come_through_a_trusted_proxy_cannot_forge_its_address(): void
    {
        $this->assertSame('198.51.100.50', $this->clientIp('198.51.100.50', '1.2.3.4'));
    }

    public function test_without_the_header_the_peer_address_is_used(): void
    {
        $this->assertSame('10.20.30.40', $this->clientIp('10.20.30.40', null));
    }

    public function test_different_visitors_behind_the_balancer_get_different_rate_limit_buckets(): void
    {
        $this->assertNotSame(
            $this->clientIp('10.20.30.40', '203.0.113.9'),
            $this->clientIp('10.20.30.40', '203.0.113.10'),
        );
    }
}
