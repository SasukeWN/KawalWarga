<?php

namespace App\Models;

use App\Enums\EventType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'report_id',
        'event',
        'title',
        'description',
        'note',
        'actor_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'event'      => EventType::class,
            'created_at' => 'datetime',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
