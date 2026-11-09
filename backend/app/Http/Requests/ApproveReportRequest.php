<?php

namespace App\Http\Requests;

use App\Enums\Category;
use App\Enums\Urgency;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ApproveReportRequest extends FormRequest
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
            'category' => ['required', 'string', Rule::enum(Category::class)],
            'urgency'  => ['required', 'string', Rule::enum(Urgency::class)],
            'note'     => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'category.required'                         => 'Kategori wajib dipilih.',
            'category.Illuminate\Validation\Rules\Enum' => 'Kategori yang dipilih tidak valid.',
            'urgency.required'                          => 'Tingkat urgensi wajib dipilih.',
            'urgency.Illuminate\Validation\Rules\Enum'  => 'Tingkat urgensi yang dipilih tidak valid.',
            'note.max'                                  => 'Catatan verifikasi maksimal 500 karakter.',
        ];
    }
}
