<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReportRequest extends FormRequest
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
            'description'    => ['required', 'string', 'min:20', 'max:2000'],
            'latitude'       => ['required', 'numeric', 'between:-90,90'],
            'longitude'      => ['required', 'numeric', 'between:-180,180'],
            'address_text'   => ['nullable', 'string', 'max:255'],
            // Kategori pilihan pelapor (opsional); hanya kategori aktif yang dikelola admin.
            'category'       => [
                'nullable',
                'string',
                Rule::exists('categories', 'slug')->where('is_active', true),
            ],
            'photo'          => ['required', 'file', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
            'reporter_phone' => [
                'nullable',
                'string',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $trimmed = trim((string) $value);
                    if (! preg_match('/^(\+62|62|08|8)[0-9\s\-]+$/', $trimmed)) {
                        $fail('Nomor WhatsApp harus diawali +62, 62, atau 08 dan hanya berisi angka.');

                        return;
                    }

                    $digits = preg_replace('/\D+/', '', $trimmed);
                    $len    = strlen((string) $digits);
                    if ($len < 9 || $len > 15) {
                        $fail('Nomor WhatsApp harus terdiri dari 9 hingga 15 digit.');
                    }
                },
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'description.required' => 'Deskripsi laporan wajib diisi.',
            'description.min'      => 'Deskripsi minimal 20 karakter.',
            'description.max'      => 'Deskripsi maksimal 2000 karakter.',
            'latitude.required'    => 'Titik koordinat lokasi (latitude) wajib diisi.',
            'latitude.numeric'     => 'Format latitude tidak valid.',
            'latitude.between'     => 'Nilai latitude harus berada di antara -90 dan 90.',
            'longitude.required'   => 'Titik koordinat lokasi (longitude) wajib diisi.',
            'longitude.numeric'    => 'Format longitude tidak valid.',
            'longitude.between'    => 'Nilai longitude harus berada di antara -180 dan 180.',
            'address_text.max'     => 'Teks alamat maksimal 255 karakter.',
            'category.exists'      => 'Kategori yang dipilih tidak tersedia.',
            'photo.required'       => 'Foto bukti laporan wajib diunggah.',
            'photo.file'           => 'Foto bukti harus berupa file.',
            'photo.image'          => 'File yang diunggah harus berupa gambar.',
            'photo.mimes'          => 'Format foto harus jpg, jpeg, atau png.',
            'photo.max'            => 'Ukuran foto maksimal 5 MB.',
        ];
    }
}
