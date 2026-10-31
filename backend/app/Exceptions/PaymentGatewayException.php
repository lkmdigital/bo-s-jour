<?php

namespace App\Exceptions;

/**
 * Échec de la passerelle de paiement (MaliaPay) dont le message est sûr à montrer au voyageur :
 * la cause technique réelle est journalisée à part, jamais exposée.
 */
class PaymentGatewayException extends \Exception
{
    public function __construct(string $message, private int $httpStatus = 500)
    {
        parent::__construct($message);
    }

    public function httpStatus(): int
    {
        return $this->httpStatus;
    }
}
