<?php

namespace App\Http\Resources;

use App\Enums\Category;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminReportListResource extends JsonResource
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

        return [
            'ticket_id'      => $this->ticket_id,
            'title'          => $this->title,
            'status'         => $status->value,
            'status_label'   => $status->label(),
            'category'       => $category?->value,
            'category_label' => $category?->label(),
            'urgency'        => $urgency?->value,
            'urgency_label'  => $urgency?->label(),
            'address_text'   => $this->address_text,
            'created_at'     => $this->created_at?->toIso8601String(),
        ];
    }
}
