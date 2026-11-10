<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\ReportCategory;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * GET /api/v1/categories
     * Daftar kategori aktif yang boleh dipilih warga saat membuat laporan.
     * Menerima query parameter ?all=1 untuk memuat seluruh kategori (mis. untuk filter petugas/publik).
     */
    public function index(Request $request): JsonResponse
    {
        $categories = $request->boolean('all')
            ? ReportCategory::query()->orderBy('sort_order')->orderBy('id')->get()
            : ReportCategory::active();

        $items = $categories
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
