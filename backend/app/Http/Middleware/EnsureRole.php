<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return ApiResponse::error('Belum login atau token tidak valid.', 401);
        }

        $userRole = $user->role instanceof Role ? $user->role->value : (string) $user->role;

        if (! in_array($userRole, $roles, true)) {
            return ApiResponse::error('Akses ditolak. Role tidak diizinkan.', 403);
        }

        return $next($request);
    }
}
