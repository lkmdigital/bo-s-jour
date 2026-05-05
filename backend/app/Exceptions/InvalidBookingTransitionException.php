<?php

namespace App\Exceptions;

use RuntimeException;
use Illuminate\Http\JsonResponse;

class InvalidBookingTransitionException extends RuntimeException
{
    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'error'   => 'invalid_transition',
        ], 422);
    }
}
