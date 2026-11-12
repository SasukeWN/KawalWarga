<?php

namespace App\Http\Resources;

use App\Enums\ReportStatus;
use App\Models\ReportCategory;
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

        $category = ReportCategory::ref($this->category ?? $this->ai_category);

        $rawUrgency = $this->urgency ?? $this->ai_urgency;
        $urgency    = $rawUrgency instanceof Urgency
            ? $rawUrgency
            : ($rawUrgency ? Urgency::tryFrom((string) $rawUrgency) : null);

        return [
            'ticket_id'        => $this->ticket_id,
            'title'            => $this->title,
            'status'           => $status->value,
            'status_label'     => $status->label(),
            'category'         => $category?->value,
            'category_label'   => $category?->label(),
            'urgency'          => $urgency?->value,
            'urgency_label'    => $urgency?->label(),
            'address_text'     => $this->address_text,
            'created_at'       => $this->created_at?->toIso8601String(),
            'is_overdue'       => $this->is_overdue,
            'sla_target_hours' => $this->sla_target_hours,
            'sla_target_label' => $this->sla_target_label,
            'sla_deadline'     => $this->sla_deadline?->toIso8601String(),
        ];
    }
}
