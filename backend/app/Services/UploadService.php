<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadService
{
    /**
     * Simpan foto laporan ke disk "uploads" di dalam folder "reports" dengan nama acak.
     * Mengembalikan path relatif terhadap disk uploads (contoh: "reports/uuid.jpg").
     */
    public function storeReportPhoto(UploadedFile $file): string
    {
        return $this->storeInFolder($file, 'reports');
    }

    /**
     * Simpan foto bukti penyelesaian ke disk "uploads" di dalam folder "completions".
     */
    public function storeCompletionPhoto(UploadedFile $file): string
    {
        return $this->storeInFolder($file, 'completions');
    }

    private function storeInFolder(UploadedFile $file, string $folder): string
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: ($file->extension() ?: 'jpg'));
        if (! in_array($ext, ['jpg', 'jpeg', 'png'], true)) {
            $ext = 'jpg';
        }

        $filename = Str::uuid()->toString().'.'.$ext;

        Storage::disk('uploads')->putFileAs($folder, $file, $filename);

        return $folder.'/'.$filename;
    }
}
