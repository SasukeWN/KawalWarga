<?php

namespace App\Support;

/**
 * Referensi kategori ringan (slug + label) yang menggantikan enum Category lama.
 * Menyediakan ->value dan ->label() agar kode resource lama tetap kompatibel.
 */
final class CategoryRef
{
    public function __construct(
        public readonly string $value,
        private readonly string $labelText,
    ) {}

    public function label(): string
    {
        return $this->labelText;
    }
}
