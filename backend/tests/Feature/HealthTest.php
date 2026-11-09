<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_returns_ok_envelope_with_jakarta_timezone(): void
    {
        $response = $this->get('/api/v1/health');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'OK',
                'data' => [
                    'app' => 'ok',
                    'db'  => 'ok',
                ],
            ]);

        $time = $response->json('data.time');
        $this->assertNotEmpty($time);
        $this->assertStringEndsWith('+07:00', $time);
    }

    public function test_unknown_api_route_returns_404_json_envelope_even_without_accept_header(): void
    {
        $response = $this->get('/api/v1/endpoint-tidak-ada', [
            'Accept' => 'text/html',
        ]);

        $response->assertStatus(404)
            ->assertHeader('Content-Type', 'application/json')
            ->assertExactJson([
                'success' => false,
                'message' => 'Endpoint tidak ditemukan.',
            ]);
    }

    public function test_health_ai_rejects_missing_or_wrong_health_key(): void
    {
        config(['services.health_key' => 'secret-health-key']);

        $this->get('/api/v1/health/ai')
            ->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);

        $this->get('/api/v1/health/ai', ['X-Health-Key' => 'wrong-key'])
            ->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_health_ai_succeeds_when_gemini_responds_ok(): void
    {
        config([
            'services.health_key'     => 'secret-health-key',
            'services.gemini.api_key' => 'dummy-api-key',
            'services.gemini.model'   => 'gemini-test-model',
        ]);

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    ['content' => ['parts' => [['text' => 'ok']]]],
                ],
            ], 200),
        ]);

        $response = $this->get('/api/v1/health/ai', [
            'X-Health-Key' => 'secret-health-key',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'OK',
                'data' => [
                    'ai' => 'ok',
                ],
            ]);
    }
}
