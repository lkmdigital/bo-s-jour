<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'frontend_url' => env('FRONTEND_URL', 'https://bosejour.ci'),

    'malia_pay' => [
        'api_url' => env('MALIA_PAY_API_URL', 'https://malia-pay.com/api/v1/OnlinePaymentService/add_payer'),
        'merchant_id' => env('MALIA_PAY_MERCHANT_ID', 'MI_AOXBNNUD2J'),
        'aggregated_merchant_id' => env('MALIA_PAY_AGGREGATED_MERCHANT_ID', 'am-1j54gkvb820we'),
        // Secret partagé pour authentifier les webhooks entrants de Malia Pay.
        // Tant qu'il est vide, le webhook est accepté (rétrocompat) mais un avertissement
        // est journalisé. À renseigner en prod (et côté Malia Pay) pour rejeter les faux appels.
        'webhook_secret' => env('MALIA_PAY_WEBHOOK_SECRET', ''),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL') . '/api/auth/google/callback'),
    ],

    'microsoft' => [
        'client_id' => env('MICROSOFT_CLIENT_ID'),
        'client_secret' => env('MICROSOFT_CLIENT_SECRET'),
        'redirect' => env('MICROSOFT_REDIRECT_URI', env('APP_URL') . '/api/auth/microsoft/callback'),
        'tenant' => env('MICROSOFT_TENANT', 'common'),
    ],

    'onesignal' => [
        'app_id'       => env('ONESIGNAL_APP_ID', '2fefb867-761c-4857-93dd-8937c418e98a'),
        'api_key'      => env('ONESIGNAL_REST_API_KEY', ''),
        'api_url'      => env('ONESIGNAL_API_URL', 'https://onesignal.com/api/v1/notifications'),
        'email_enabled'    => env('ONESIGNAL_EMAIL_ENABLED', false),
        'from_email'   => env('ONESIGNAL_FROM_EMAIL', 'contact@bosejour.ci'),
        'from_name'    => env('ONESIGNAL_FROM_NAME', 'Bosejour'),
    ],

    'smsto' => [
        'enabled'              => env('SMSTO_ENABLED', false),
        'api_key'              => env('SMSTO_API_KEY', ''),
        'api_url'              => env('SMSTO_API_URL', 'https://api.sms.to/sms/send'),
        'sender_id'            => env('SMSTO_SENDER_ID', 'Bosejour'),
        'default_country_code' => env('SMSTO_DEFAULT_COUNTRY_CODE', '225'),
    ],

    // Module IA (doc client "MODULE IA BOSÉJOUR") — Assistant IA Administrateur,
    // §1.1 "Assistant Conversationnel". Tant que la clé est vide, l'assistant
    // répond avec un message d'indisponibilité plutôt que d'échouer en 500.
    'anthropic' => [
        'api_key' => env('ANTHROPIC_API_KEY', ''),
        'model'   => env('ANTHROPIC_MODEL', 'claude-opus-5'),
    ],

];

