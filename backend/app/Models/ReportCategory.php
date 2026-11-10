<?php

namespace App\Models;

use App\Support\CategoryRef;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Kategori laporan yang dikelola admin (tabel categories).
 */
class ReportCategory extends Model
{
    protected $table = 'categories';

    protected $fillable = [
        'slug',
        'label',
        'description',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active'  => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @var array<string, string>|null  cache slug => label selama satu request */
    private static ?array $labelCache = null;

    public static function flushCache(): void
    {
        self::$labelCache = null;
    }

    /**
     * @return array<string, string>
     */
    private static function labels(): array
    {
        if (self::$labelCache === null) {
            self::$labelCache = static::query()->pluck('label', 'slug')->all();
        }

        return self::$labelCache;
    }

    /**
     * Ubah slug mentah (mis. kolom reports.category) menjadi CategoryRef.
     * Slug yang sudah tidak ada di tabel tetap dikembalikan dengan label hasil humanize.
     */
    public static function ref(mixed $slug): ?CategoryRef
    {
        if ($slug instanceof \BackedEnum) {
            $slug = $slug->value;
        }

        if (! is_string($slug) || trim($slug) === '') {
            return null;
        }

        $slug  = trim($slug);
        $label = self::labels()[$slug] ?? Str::headline($slug);

        return new CategoryRef($slug, $label);
    }

    public static function labelFor(mixed $slug): ?string
    {
        return self::ref($slug)?->label();
    }

    /**
     * Daftar kategori yang boleh dipilih warga / dipakai AI.
     *
     * @return Collection<int, ReportCategory>
     */
    public static function active(): Collection
    {
        return static::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    /**
     * Buat slug unik dari label (huruf kecil, pemisah underscore).
     */
    public static function makeSlug(string $label): string
    {
        $base = Str::slug($label, '_');
        if ($base === '') {
            $base = 'kategori';
        }
        $base = mb_substr($base, 0, 50);

        $slug = $base;
        $i    = 2;
        while (static::query()->where('slug', $slug)->exists()) {
            $slug = $base.'_'.$i;
            $i++;
        }

        return $slug;
    }

    /**
     * Jumlah laporan yang memakai kategori ini (kategori final, rekomendasi AI, atau pilihan pelapor).
     */
    public function usageCount(): int
    {
        return Report::query()
            ->where(function ($q) {
                $q->where('category', $this->slug)
                    ->orWhere('ai_category', $this->slug)
                    ->orWhere('reporter_category', $this->slug);
            })
            ->count();
    }
}
