<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Dilempar ketika terjadi konflik status (misalnya laporan sudah diambil petugas lain).
 * Dirender sebagai HTTP 409 oleh exception handler.
 */
class ConflictException extends RuntimeException
{
    public function __construct(string $message = 'Konflik status data.')
    {
        parent::__construct($message);
    }
}
