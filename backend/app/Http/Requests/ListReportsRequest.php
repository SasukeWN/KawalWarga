<?php

namespace App\Http\Requests;

use App\Enums\ReportStatus;
use App\Enums\Urgency;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListReportsRequest extends FormRequest
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
            'search'   => ['nullable', 'string', 'max:50'],
            'status'   => ['nullable', 'string', Rule::enum(ReportStatus::class)],
            'category' => ['nullable', 'string', Rule::exists('categories', 'slug')],
            'urgency'  => ['nullable', 'string', Rule::enum(Urgency::class)],
            'sort'     => ['nullable', 'string', 'in:newest,oldest,urgency'],
            'from'     => ['nullable', 'date_format:Y-m-d'],
            'to'       => ['nullable', 'date_format:Y-m-d'],
            'page'     => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'status.Illuminate\Validation\Rules\Enum'   => 'Filter status tidak valid.',
            'category.exists'                           => 'Filter kategori tidak valid.',
            'urgency.Illuminate\Validation\Rules\Enum'  => 'Filter urgensi tidak valid.',
            'sort.in'                                   => 'Pilihan urutan tidak valid.',
            'from.date_format'                          => 'Format tanggal awal harus YYYY-MM-DD.',
            'to.date_format'                            => 'Format tanggal akhir harus YYYY-MM-DD.',
            'per_page.max'                              => 'Jumlah item per halaman maksimal 50.',
        ];
    }
}
