<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ReportStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class OfficerController extends Controller
{
    /**
     * GET /api/v1/admin/officers
     * Daftar seluruh petugas lapangan beserta ringkasan statistik.
     */
    public function index(Request $request): JsonResponse
    {
        $officers = User::query()
            ->where('role', Role::PETUGAS->value)
            ->withCount([
                'handledReports as tasks_in_progress_count' => fn ($q) => $q->where('status', ReportStatus::DIPROSES->value),
                'handledReports as tasks_completed_count'   => fn ($q) => $q->where('status', ReportStatus::SELESAI->value),
            ])
            ->orderBy('id', 'desc')
            ->get();

        $total     = $officers->count();
        $active    = $officers->where('is_active', true)->count();
        $suspended = $total - $active;

        $items = $officers->map(fn (User $user): array => [
            'id'                      => $user->id,
            'name'                    => $user->name,
            'email'                   => $user->email,
            'position'                => $user->position,
            'is_active'               => (bool) $user->is_active,
            'tasks_in_progress_count' => (int) $user->tasks_in_progress_count,
            'tasks_completed_count'   => (int) $user->tasks_completed_count,
            'created_at'              => $user->created_at?->format('c'),
        ])->values()->all();

        return ApiResponse::success([
            'summary' => [
                'total'     => $total,
                'active'    => $active,
                'suspended' => $suspended,
            ],
            'officers' => $items,
        ], 'Data petugas berhasil dimuat.');
    }

    /**
     * POST /api/v1/admin/officers
     * Tambah petugas baru dengan mengisi email dan password.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'string', 'email', 'max:100', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'max:100'],
            'name'     => ['nullable', 'string', 'max:100'],
            'position' => ['nullable', 'string', 'max:100'],
        ], [
            'email.required'    => 'Email petugas wajib diisi.',
            'email.email'       => 'Format email tidak valid.',
            'email.unique'      => 'Email sudah terdaftar.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min'      => 'Kata sandi minimal 6 karakter.',
            'name.max'          => 'Nama maksimal 100 karakter.',
            'position.max'      => 'Posisi maksimal 100 karakter.',
        ]);

        $rawEmail = strtolower(trim($data['email']));
        $name     = trim($data['name'] ?? '');
        if ($name === '') {
            $username = explode('@', $rawEmail)[0] ?? 'petugas';
            $name     = Str::headline(str_replace(['.', '_', '-'], ' ', $username));
        }

        $position = trim($data['position'] ?? '');
        if ($position === '') {
            $position = 'Petugas lapangan';
        }

        $user = User::create([
            'name'      => $name,
            'email'     => $rawEmail,
            'password'  => Hash::make($data['password']),
            'role'      => Role::PETUGAS,
            'position'  => $position,
            'is_active' => true,
        ]);

        return ApiResponse::success([
            'id'                      => $user->id,
            'name'                    => $user->name,
            'email'                   => $user->email,
            'position'                => $user->position,
            'is_active'               => true,
            'tasks_in_progress_count' => 0,
            'tasks_completed_count'   => 0,
            'created_at'              => $user->created_at?->format('c'),
        ], 'Petugas berhasil ditambahkan.', 201);
    }

    /**
     * PATCH /api/v1/admin/officers/{id}/status
     * Ubah status aktif / tangguhkan akun petugas.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ], [
            'is_active.required' => 'Status aktif wajib disertakan.',
            'is_active.boolean'  => 'Status aktif harus bernilai boolean.',
        ]);

        $officer = User::query()
            ->where('role', Role::PETUGAS->value)
            ->findOrFail($id);

        $newStatus = (bool) $data['is_active'];
        $officer->is_active = $newStatus;
        $officer->save();

        if (! $newStatus) {
            // Cabut semua sesi / token login petugas yang ditangguhkan
            $officer->tokens()->delete();
        }

        $msg = $newStatus
            ? 'Akun petugas berhasil diaktifkan kembali.'
            : 'Akun petugas berhasil ditangguhkan.';

        return ApiResponse::success([
            'id'        => $officer->id,
            'name'      => $officer->name,
            'email'     => $officer->email,
            'position'  => $officer->position,
            'is_active' => (bool) $officer->is_active,
        ], $msg);
    }
}
