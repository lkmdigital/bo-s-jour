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

    'malia_pay' => [
        'api_url' => env('MALIA_PAY_API_URL', 'https://malia-pay.com/api/v1/OnlinePaymentService/add_payer'),
        'merchant_id' => env('MALIA_PAY_MERCHANT_ID', 'MI_AOXBNNUD2J'),
        'aggregated_merchant_id' => env('MALIA_PAY_AGGREGATED_MERCHANT_ID', 'am-1j54gkvb820we'),
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
        'from_name'    => env('ONESIGNAL_FROM_NAME', 'BosEjour'),
    ],

];

