<?php

namespace App\Http\Resources;

use App\Enums\Category;
use App\Enums\EventType;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use App\Models\ReportDuplicate;
use App\Models\ReportEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminReportDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $status = $this->status instanceof ReportStatus
            ? $this->status
            : ReportStatus::from((string) $this->status);

        $category = $this->category instanceof Category
            ? $this->category
            : ($this->category ? Category::tryFrom((string) $this->category) : null);

        $urgency = $this->urgency instanceof Urgency
            ? $this->urgency
            : ($this->urgency ? Urgency::tryFrom((string) $this->urgency) : null);

        $aiCategory = $this->ai_category instanceof Category
            ? $this->ai_category
            : ($this->ai_category ? Category::tryFrom((string) $this->ai_category) : null);

        $aiUrgency = $this->ai_urgency instanceof Urgency
            ? $this->ai_urgency
            : ($this->ai_urgency ? Urgency::tryFrom((string) $this->ai_urgency) : null);

        $aiDone = $this->ai_status === 'done';

        /** @var \Illuminate\Support\Collection<int, ReportDuplicate> $duplicates */
        $duplicates = $this->relationLoaded('duplicates')
            ? $this->duplicates
            : $this->duplicates()->with('duplicateOf')->get();

        $duplicateItems = $duplicates
            ->filter(fn (ReportDuplicate $dup) => $dup->duplicateOf !== null)
            ->map(fn (ReportDuplicate $dup): array => [
                'ticket_id'  => $dup->duplicateOf->ticket_id,
                'title'      => $dup->duplicateOf->title,
                'distance_m' => (int) $dup->distance_m,
            ])
            ->values()
            ->all();

        $verification = null;
        if ($this->verified_at !== null) {
            $verification = [
                'category'    => $category?->value,
                'urgency'     => $urgency?->value,
                'note'        => $this->verification_note,
                'verified_by' => $this->verifier ? [
                    'name'     => $this->verifier->name,
                    'position' => $this->verifier->position,
                ] : null,
                'verified_at' => $this->verified_at->toIso8601String(),
            ];
        }

        $rejection = null;
        if ($status === ReportStatus::DITOLAK) {
            $rejection = [
                'reason'     => $this->rejection_reason,
                'decided_by' => $this->rejecter ? [
                    'name'     => $this->rejecter->name,
                    'position' => $this->rejecter->position,
                ] : null,
                'at'         => $this->rejected_at?->toIso8601String(),
            ];
        }

        $handler = null;
        if ($this->handler_id !== null && $this->handler) {
            $handler = [
                'name'     => $this->handler->name,
                'position' => $this->handler->position,
                'taken_at' => $this->taken_at?->toIso8601String(),
            ];
        }

        $completion = null;
        if ($status === ReportStatus::SELESAI) {
            $completion = [
                'notes'        => $this->completion_notes,
                'photo_url'    => $this->completion_photo_url,
                'completed_by' => $this->handler ? [
                    'name'     => $this->handler->name,
                    'position' => $this->handler->position,
                ] : null,
                'completed_at' => $this->completed_at?->toIso8601String(),
            ];
        }

        /** @var \Illuminate\Support\Collection<int, ReportEvent> $events */
        $events = $this->relationLoaded('events') ? $this->events : $this->events()->get();

        $timeline = $events->map(fn (ReportEvent $ev): array => [
            'event'       => $ev->event instanceof EventType ? $ev->event->value : (string) $ev->event,
            'title'       => $ev->title,
            'description' => $ev->description,
            'at'          => $ev->created_at?->toIso8601String(),
        ])->values()->all();

        return [
            'ticket_id'      => $this->ticket_id,
            'title'          => $this->title,
            'status'         => $status->value,
            'status_label'   => $status->label(),
            'category'       => $category?->value,
            'category_label' => $category?->label(),
            'urgency'        => $urgency?->value,
            'urgency_label'  => $urgency?->label(),
            'description'    => $this->description,
            'photo_url'      => $this->photo_url,
            'location'       => [
                'latitude'     => (float) $this->latitude,
                'longitude'    => (float) $this->longitude,
                'address_text' => $this->address_text,
            ],
            'reporter'       => [
                'phone' => $this->reporter_phone,
            ],
            'received_at'    => $this->created_at?->toIso8601String(),
            'ai'             => [
                'status'     => (string) $this->ai_status,
                'summary'    => $aiDone ? $this->ai_summary : null,
                'category'   => $aiDone ? $aiCategory?->value : null,
                'urgency'    => $aiDone ? $aiUrgency?->value : null,
                'duplicates' => $duplicateItems,
            ],
            'verification'   => $verification,
            'rejection'      => $rejection,
            'handler'        => $handler,
            'completion'     => $completion,
            'timeline'       => $timeline,
        ];
    }
}
