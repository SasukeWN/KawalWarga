<?php

namespace App\Http\Resources;

use App\Enums\Role;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $role = $this->role instanceof Role ? $this->role->value : (string) $this->role;

        return [
            'id'       => $this->id,
            'name'     => $this->name,
            'email'    => $this->email,
            'role'     => $role,
            'position' => $this->position,
        ];
    }
}
