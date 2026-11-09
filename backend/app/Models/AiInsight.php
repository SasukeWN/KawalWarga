<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiInsight extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'from_date',
        'to_date',
        'bullets',
        'based_on_total',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'from_date'      => 'date:Y-m-d',
            'to_date'        => 'date:Y-m-d',
            'bullets'        => 'array',
            'based_on_total' => 'integer',
            'generated_at'   => 'datetime',
        ];
    }
}
