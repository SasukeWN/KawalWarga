<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_id')->nullable()->unique();
            $table->string('title');
            $table->text('description');
            $table->string('photo_path');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('address_text')->nullable();
            $table->string('reporter_phone')->nullable();
            $table->string('status')->default('menunggu_verifikasi');
            $table->string('category')->nullable();
            $table->string('urgency')->nullable();
            $table->string('ai_status')->default('pending');
            $table->string('ai_category')->nullable();
            $table->string('ai_urgency')->nullable();
            $table->text('ai_summary')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('verification_note')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('handler_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('taken_at')->nullable();
            $table->text('completion_notes')->nullable();
            $table->string('completion_photo_path')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('category');
            $table->index('urgency');
            $table->index('created_at');
            $table->index('handler_id');
            $table->index(['latitude', 'longitude']);
            $table->index('reporter_phone');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
