<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Dilempar saat layanan AI (Gemini) gagal dihubungi, habis waktu, terkena rate limit,
 * atau mengembalikan respons yang tidak valid.
 */
class AiUnavailable extends RuntimeException
{
    public function __construct(string $message = 'Layanan AI sedang tidak tersedia.')
    {
        parent::__construct($message);
    }
}
