<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\ReportCategory;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    /**
     * GET /api/v1/categories
     * Daftar kategori aktif yang boleh dipilih warga saat membuat laporan.
     */
    public function index(): JsonResponse
    {
        $items = ReportCategory::active()
            ->map(fn (ReportCategory $c): array => [
                'value'       => $c->slug,
                'label'       => $c->label,
                'description' => $c->description,
            ])
            ->values()
            ->all();

        return ApiResponse::success($items);
    }
}
