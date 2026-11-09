<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_insights', function (Blueprint $table) {
            $table->id();
            $table->date('from_date');
            $table->date('to_date');
            $table->json('bullets');
            $table->integer('based_on_total');
            $table->timestamp('generated_at');

            $table->unique(['from_date', 'to_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_insights');
    }
};
