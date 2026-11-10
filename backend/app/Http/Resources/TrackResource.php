<?php

namespace App\Http\Resources;

use App\Enums\EventType;
use App\Enums\ReportStatus;
use App\Models\ReportCategory;
use App\Models\ReportEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TrackResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $status = $this->status instanceof ReportStatus
            ? $this->status
            : ReportStatus::from((string) $this->status);

        $isUnverified = $status === ReportStatus::MENUNGGU_VERIFIKASI;

        $rawCategory  = $this->category ?? $this->ai_category;
        $categoryEnum = (! $isUnverified && $rawCategory)
            ? ReportCategory::ref($rawCategory)
            : null;

        /** @var \Illuminate\Support\Collection<int, ReportEvent> $events */
        $events = $this->relationLoaded('events') ? $this->events : $this->events()->with('actor')->get();

        $latestNoteEvent = $events->first(
            fn (ReportEvent $ev) => $ev->note !== null && trim($ev->note) !== ''
        );

        $latestUpdate = null;
        if ($latestNoteEvent) {
            $actorUser = $latestNoteEvent->actor ?? $this->handler;
            $latestUpdate = [
                'note'  => $latestNoteEvent->note,
                'actor' => $actorUser ? [
                    'name'     => $actorUser->name,
                    'position' => $actorUser->position,
                ] : null,
                'at'    => $latestNoteEvent->created_at?->toIso8601String(),
            ];
        }

        $timeline = $events->map(fn (ReportEvent $ev): array => [
            'event'       => $ev->event instanceof EventType ? $ev->event->value : (string) $ev->event,
            'title'       => $ev->title,
            'description' => $ev->description,
            'at'          => $ev->created_at?->toIso8601String(),
        ])->values()->all();

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

        return [
            'ticket_id'      => $this->ticket_id,
            'title'          => $this->title,
            'status'         => $status->value,
            'status_label'   => $status->label(),
            'category'       => $categoryEnum?->value,
            'category_label' => $categoryEnum?->label(),
            'description'    => $this->description,
            'location'       => [
                'latitude'     => (float) $this->latitude,
                'longitude'    => (float) $this->longitude,
                'address_text' => $this->address_text,
            ],
            'photo_url'      => $this->photo_url,
            'received_at'    => $this->created_at?->toIso8601String(),
            'latest_update'  => $latestUpdate,
            'timeline'       => $timeline,
            'rejection'      => $rejection,
            'completion'     => $completion,
        ];
    }
}
