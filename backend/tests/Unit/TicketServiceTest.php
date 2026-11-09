<?php

namespace Tests\Unit;

use App\Services\TicketService;
use PHPUnit\Framework\TestCase;

class TicketServiceTest extends TestCase
{
    public function test_format_pads_id_to_minimum_three_digits(): void
    {
        $this->assertSame('ADU-001', TicketService::format(1));
        $this->assertSame('ADU-042', TicketService::format(42));
        $this->assertSame('ADU-204', TicketService::format(204));
        $this->assertSame('ADU-1205', TicketService::format(1205));
    }

    public function test_normalize_accepts_various_valid_ticket_inputs(): void
    {
        $this->assertSame('ADU-204', TicketService::normalize('#ADU-204'));
        $this->assertSame('ADU-204', TicketService::normalize('adu-204'));
        $this->assertSame('ADU-204', TicketService::normalize('204'));
        $this->assertSame('ADU-204', TicketService::normalize(' #adu-0204 '));
        $this->assertSame('ADU-204', TicketService::normalize('ADU204'));
        $this->assertSame('ADU-007', TicketService::normalize('7'));
        $this->assertSame('ADU-007', TicketService::normalize('#0007'));
        $this->assertSame('ADU-1050', TicketService::normalize('#adu-1050'));
    }

    public function test_normalize_returns_null_for_invalid_inputs(): void
    {
        $this->assertNull(TicketService::normalize(''));
        $this->assertNull(TicketService::normalize('   '));
        $this->assertNull(TicketService::normalize('#'));
        $this->assertNull(TicketService::normalize('0'));
        $this->assertNull(TicketService::normalize('ADU-000'));
        $this->assertNull(TicketService::normalize('TIKET-204'));
        $this->assertNull(TicketService::normalize('ADU-204A'));
    }
}
