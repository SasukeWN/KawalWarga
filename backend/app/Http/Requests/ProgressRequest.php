<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProgressRequest extends FormRequest
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
            'note' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'note.required' => 'Catatan progres wajib diisi.',
            'note.min'      => 'Catatan progres minimal 5 karakter.',
            'note.max'      => 'Catatan progres maksimal 500 karakter.',
        ];
    }
}
