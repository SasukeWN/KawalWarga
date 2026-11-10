<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\ConflictException;
use App\Http\Controllers\Controller;
use App\Models\ReportCategory;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    /**
     * GET /api/v1/admin/categories
     * Semua kategori (aktif dan nonaktif) beserta jumlah laporan yang memakainya.
     */
    public function index(): JsonResponse
    {
        $items = ReportCategory::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (ReportCategory $c): array => $this->present($c))
            ->values()
            ->all();

        return ApiResponse::success($items);
    }

    /**
     * POST /api/v1/admin/categories
     * Tambah kategori baru. Slug dibuat otomatis dari label.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label'       => ['required', 'string', 'min:3', 'max:80'],
            'description' => ['nullable', 'string', 'max:255'],
        ], [
            'label.required' => 'Nama kategori wajib diisi.',
            'label.min'      => 'Nama kategori minimal 3 karakter.',
            'label.max'      => 'Nama kategori maksimal 80 karakter.',
        ]);

        $label = trim($data['label']);

        $duplicate = ReportCategory::query()
            ->whereRaw('LOWER(label) = ?', [mb_strtolower($label)])
            ->exists();

        if ($duplicate) {
            throw new ConflictException('Kategori dengan nama tersebut sudah ada.');
        }

        $category = ReportCategory::create([
            'slug'        => ReportCategory::makeSlug($label),
            'label'       => $label,
            'description' => isset($data['description']) && trim($data['description']) !== ''
                ? trim($data['description'])
                : null,
            'is_active'   => true,
            'sort_order'  => ((int) ReportCategory::query()->max('sort_order')) + 1,
        ]);

        ReportCategory::flushCache();

        return ApiResponse::created($this->present($category), 'Kategori berhasil ditambahkan.');
    }

    /**
     * PUT /api/v1/admin/categories/{slug}
     * Ubah nama, deskripsi, atau status aktif. Slug tidak berubah agar laporan lama tetap valid.
     */
    public function update(Request $request, string $slug): JsonResponse
    {
        $category = ReportCategory::query()->where('slug', $slug)->firstOrFail();

        $data = $request->validate([
            'label'       => ['sometimes', 'required', 'string', 'min:3', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active'   => ['sometimes', 'required', 'boolean'],
        ], [
            'label.required' => 'Nama kategori wajib diisi.',
            'label.min'      => 'Nama kategori minimal 3 karakter.',
            'label.max'      => 'Nama kategori maksimal 80 karakter.',
        ]);

        if (isset($data['label'])) {
            $label = trim($data['label']);

            $duplicate = ReportCategory::query()
                ->where('id', '!=', $category->id)
                ->whereRaw('LOWER(label) = ?', [mb_strtolower($label)])
                ->exists();

            if ($duplicate) {
                throw new ConflictException('Kategori dengan nama tersebut sudah ada.');
            }

            $category->label = $label;
        }

        if (array_key_exists('description', $data)) {
            $category->description = $data['description'] !== null && trim($data['description']) !== ''
                ? trim($data['description'])
                : null;
        }

        if (array_key_exists('is_active', $data)) {
            // Minimal satu kategori harus tetap aktif agar warga masih bisa memilih.
            if ($data['is_active'] === false && $category->is_active) {
                $otherActive = ReportCategory::query()
                    ->where('is_active', true)
                    ->where('id', '!=', $category->id)
                    ->count();

                if ($otherActive === 0) {
                    throw new ConflictException('Minimal harus ada satu kategori aktif.');
                }
            }

            $category->is_active = (bool) $data['is_active'];
        }

        $category->save();
        ReportCategory::flushCache();

        return ApiResponse::success($this->present($category), 'Kategori berhasil diperbarui.');
    }

    /**
     * DELETE /api/v1/admin/categories/{slug}
     * Hanya boleh bila belum dipakai laporan mana pun; jika sudah dipakai, nonaktifkan saja.
     */
    public function destroy(string $slug): JsonResponse
    {
        $category = ReportCategory::query()->where('slug', $slug)->firstOrFail();

        $used = $category->usageCount();
        if ($used > 0) {
            throw new ConflictException(
                "Kategori sudah dipakai {$used} laporan sehingga tidak dapat dihapus. Nonaktifkan saja agar tidak muncul di formulir warga."
            );
        }

        if ($category->is_active) {
            $otherActive = ReportCategory::query()
                ->where('is_active', true)
                ->where('id', '!=', $category->id)
                ->count();

            if ($otherActive === 0) {
                throw new ConflictException('Minimal harus ada satu kategori aktif.');
            }
        }

        $category->delete();
        ReportCategory::flushCache();

        return ApiResponse::success(null, 'Kategori berhasil dihapus.');
    }

    /**
     * @return array<string, mixed>
     */
    private function present(ReportCategory $c): array
    {
        return [
            'value'         => $c->slug,
            'label'         => $c->label,
            'description'   => $c->description,
            'is_active'     => $c->is_active,
            'reports_count' => $c->usageCount(),
        ];
    }
}
