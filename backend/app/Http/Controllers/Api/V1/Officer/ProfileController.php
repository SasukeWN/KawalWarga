<?php

namespace App\Http\Controllers\Api\V1\Officer;

use App\Enums\ReportStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    /**
     * GET /api/v1/officer/profile
     * Profil lengkap petugas yang sedang login beserta statistik penanganan.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        $tasksInProgress = $user->handledReports()
            ->where('status', ReportStatus::DIPROSES->value)
            ->count();

        $tasksCompleted = $user->handledReports()
            ->where('status', ReportStatus::SELESAI->value)
            ->count();

        $base = (new UserResource($user))->resolve($request);

        return ApiResponse::success(array_merge($base, [
            'tasks_in_progress_count' => $tasksInProgress,
            'tasks_completed_count'   => $tasksCompleted,
            'created_at'              => $user->created_at?->format('c'),
        ]), 'Profil petugas berhasil dimuat.');
    }

    /**
     * PUT /api/v1/officer/profile/password
     * Ganti kata sandi petugas.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password'      => ['required', 'string'],
            'password'              => ['required', 'string', 'min:6', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ], [
            'current_password.required'      => 'Kata sandi saat ini wajib diisi.',
            'password.required'              => 'Kata sandi baru wajib diisi.',
            'password.min'                   => 'Kata sandi baru minimal 6 karakter.',
            'password.confirmed'             => 'Konfirmasi kata sandi baru tidak cocok.',
            'password_confirmation.required' => 'Konfirmasi kata sandi baru wajib diisi.',
        ]);

        $user = $request->user();

        if (! Hash::check($request->input('current_password'), $user->password)) {
            return ApiResponse::error('Kata sandi saat ini tidak cocok.', 422, [
                'current_password' => ['Kata sandi saat ini tidak cocok.'],
            ]);
        }

        $user->password = Hash::make($request->input('password'));
        $user->save();

        return ApiResponse::success(null, 'Kata sandi berhasil diperbarui.');
    }
}
