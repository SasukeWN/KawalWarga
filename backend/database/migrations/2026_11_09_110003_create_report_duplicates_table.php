<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_duplicates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('duplicate_of_id')->constrained('reports')->cascadeOnDelete();
            $table->integer('distance_m');
            $table->string('reason');

            $table->index('report_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_duplicates');
    }
};
