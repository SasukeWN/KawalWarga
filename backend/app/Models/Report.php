<?php

namespace App\Models;

use App\Enums\Category;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Report extends Model
{
    protected $fillable = [
        'ticket_id',
        'title',
        'description',
        'photo_path',
        'latitude',
        'longitude',
        'address_text',
        'reporter_phone',
        'status',
        'category',
        'urgency',
        'ai_status',
        'ai_category',
        'ai_urgency',
        'ai_summary',
        'verified_by',
        'verified_at',
        'verification_note',
        'rejection_reason',
        'rejected_by',
        'rejected_at',
        'handler_id',
        'taken_at',
        'completion_notes',
        'completion_photo_path',
        'completed_at',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude'     => 'float',
            'longitude'    => 'float',
            'status'       => ReportStatus::class,
            'category'     => Category::class,
            'urgency'      => Urgency::class,
            'ai_category'  => Category::class,
            'ai_urgency'   => Urgency::class,
            'verified_at'  => 'datetime',
            'rejected_at'  => 'datetime',
            'taken_at'     => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function events(): HasMany
    {
        return $this->hasMany(ReportEvent::class)->orderByDesc('created_at')->orderByDesc('id');
    }

    public function duplicates(): HasMany
    {
        return $this->hasMany(ReportDuplicate::class, 'report_id');
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handler_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function rejecter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    /**
     * URL absolut foto laporan.
     */
    public function getPhotoUrlAttribute(): string
    {
        $base = rtrim((string) config('app.url'), '/');

        return $base.'/uploads/'.ltrim((string) $this->photo_path, '/');
    }

    /**
     * URL absolut foto bukti penyelesaian (null bila belum ada).
     */
    public function getCompletionPhotoUrlAttribute(): ?string
    {
        if (! $this->completion_photo_path) {
            return null;
        }

        $base = rtrim((string) config('app.url'), '/');

        return $base.'/uploads/'.ltrim($this->completion_photo_path, '/');
    }

    public function getStatusLabelAttribute(): string
    {
        $status = $this->status instanceof ReportStatus
            ? $this->status
            : ReportStatus::tryFrom((string) $this->status);

        return $status ? $status->label() : '';
    }

    public function getCategoryLabelAttribute(): ?string
    {
        $category = $this->category instanceof Category
            ? $this->category
            : ($this->category ? Category::tryFrom((string) $this->category) : null);

        return $category?->label();
    }

    public function getUrgencyLabelAttribute(): ?string
    {
        $urgency = $this->urgency instanceof Urgency
            ? $this->urgency
            : ($this->urgency ? Urgency::tryFrom((string) $this->urgency) : null);

        return $urgency?->label();
    }
}
