<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 60)->unique();
            $table->string('label', 80);
            $table->string('description', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Kategori bawaan (sama dengan 3 kategori awal pada kontrak API v1.1).
        $now = now();
        DB::table('categories')->insert([
            ['slug' => 'jalan_rusak', 'label' => 'Jalan Rusak', 'description' => 'Kerusakan jalan, aspal berlubang, trotoar rusak.', 'is_active' => true, 'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'sampah', 'label' => 'Sampah', 'description' => 'Tumpukan sampah liar, sampah menghalangi jalan atau saluran.', 'is_active' => true, 'sort_order' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'lampu_mati', 'label' => 'Lampu Mati', 'description' => 'Lampu penerangan jalan umum atau taman padam/rusak.', 'is_active' => true, 'sort_order' => 3, 'created_at' => $now, 'updated_at' => $now],
        ]);

        // Kategori yang dipilih sendiri oleh pelapor (opsional).
        Schema::table('reports', function (Blueprint $table) {
            $table->string('reporter_category', 60)->nullable()->after('ai_urgency');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('reporter_category');
        });

        Schema::dropIfExists('categories');
    }
};
