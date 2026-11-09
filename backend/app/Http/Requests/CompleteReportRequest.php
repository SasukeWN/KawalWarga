<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompleteReportRequest extends FormRequest
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
            'notes' => ['required', 'string', 'min:10', 'max:1000'],
            'photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'notes.required' => 'Catatan penyelesaian wajib diisi.',
            'notes.min'      => 'Catatan penyelesaian minimal 10 karakter.',
            'notes.max'      => 'Catatan penyelesaian maksimal 1000 karakter.',
            'photo.required' => 'Foto bukti penyelesaian wajib diunggah.',
            'photo.file'     => 'Foto bukti harus berupa file.',
            'photo.image'    => 'File bukti penyelesaian harus berupa gambar.',
            'photo.mimes'    => 'Format foto harus jpg, jpeg, atau png.',
            'photo.max'      => 'Ukuran foto maksimal 5 MB.',
        ];
    }
}
