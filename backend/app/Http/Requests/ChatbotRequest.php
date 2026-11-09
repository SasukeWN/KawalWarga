<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChatbotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'message'           => ['required', 'string', 'max:500'],
            'history'           => ['nullable', 'array', 'max:6'],
            'history.*.role'    => ['required_with:history', 'string', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'message.required'           => 'Pesan wajib diisi.',
            'message.max'                => 'Pesan maksimal 500 karakter.',
            'history.array'              => 'Format riwayat percakapan tidak valid.',
            'history.max'                => 'Riwayat percakapan maksimal 6 pesan terakhir.',
            'history.*.role.required_with' => 'Peran pada riwayat percakapan wajib diisi.',
            'history.*.role.in'          => 'Peran pada riwayat percakapan harus user atau assistant.',
            'history.*.content.required_with' => 'Isi riwayat percakapan wajib diisi.',
            'history.*.content.max'      => 'Isi riwayat percakapan terlalu panjang.',
        ];
    }
}
