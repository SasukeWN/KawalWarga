<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChatbotRequest;
use App\Services\Ai\ChatbotService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ChatbotController extends Controller
{
    /**
     * POST /api/v1/chatbot
     * Tanya asisten AI KawalWarga untuk cek tiket, lupa ID tiket, atau panduan layanan.
     */
    public function send(ChatbotRequest $request, ChatbotService $chatbotService): JsonResponse
    {
        $result = $chatbotService->reply(
            (string) $request->validated('message'),
            (array) ($request->validated('history') ?? [])
        );

        return ApiResponse::success($result);
    }
}
