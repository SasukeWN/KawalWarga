<?php

namespace App\Http\Resources;

use App\Enums\Category;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OfficerReportItemResource extends JsonResource
{
    public function __construct(mixed $resource, private readonly bool $includeTaskTimestamps = false)
    {
        parent::__construct($resource);
    }

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

        $data = [
            'ticket_id'      => $this->ticket_id,
            'title'          => $this->title,
            'status'         => $status->value,
            'status_label'   => $status->label(),
            'category'       => $category?->value,
            'category_label' => $category?->label(),
            'urgency'        => $urgency?->value,
            'urgency_label'  => $urgency?->label(),
            'photo_url'      => $this->photo_url,
            'location'       => [
                'latitude'     => (float) $this->latitude,
                'longitude'    => (float) $this->longitude,
                'address_text' => $this->address_text,
            ],
            'verified_at'    => $this->verified_at?->toIso8601String(),
        ];

        if ($this->includeTaskTimestamps) {
            $data['taken_at']     = $this->taken_at?->toIso8601String();
            $data['completed_at'] = $this->completed_at?->toIso8601String();
        }

        return $data;
    }
}
