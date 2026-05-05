<?php

namespace App\Exceptions;

use RuntimeException;
use Illuminate\Http\JsonResponse;

class RoomNotAvailableException extends RuntimeException
{
    public function __construct(string $message = 'Cette chambre n\'est pas disponible pour les dates sélectionnées.')
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'error'   => 'room_not_available',
        ], 409);
    }
}
