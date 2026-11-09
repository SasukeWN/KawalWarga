<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportDuplicate extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'report_id',
        'duplicate_of_id',
        'distance_m',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'distance_m' => 'integer',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'report_id');
    }

    public function duplicateOf(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'duplicate_of_id');
    }
}
