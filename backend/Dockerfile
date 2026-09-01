# Backend Laravel (bo séjour) — image PHP-FPM, servie derrière le conteneur Nginx
# du même docker-compose (voir docker/nginx/default.conf). Même principe que le
# stack local Nginx+PHP-FPM monté ponctuellement pendant les tests de charge k6
# (2026-08-31) — devenu ici l'image de référence, plus une expérimentation jetable.

# ─── Étape 1 : dépendances Composer (mise en cache séparée du code applicatif) ──
FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --ignore-platform-reqs

COPY . .
RUN composer dump-autoload --optimize --no-dev

# ─── Étape 2 : runtime PHP-FPM ───────────────────────────────────────────────
FROM php:8.2-fpm-alpine AS runtime

RUN apk add --no-cache \
        libpng-dev \
        libzip-dev \
        libxml2-dev \
        oniguruma-dev \
        freetype-dev \
        libjpeg-turbo-dev \
        icu-dev \
        $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

# opcache réglé pour la prod — voir php.ini-recommended ; validate_timestamps=0
# nécessite un restart du conteneur après un déploiement de code (image reconstruite
# de toute façon à chaque déploiement, donc sans impact ici).
RUN { \
        echo 'opcache.memory_consumption=128'; \
        echo 'opcache.interned_strings_buffer=8'; \
        echo 'opcache.max_accelerated_files=10000'; \
        echo 'opcache.validate_timestamps=0'; \
        echo 'opcache.enable_cli=0'; \
    } > /usr/local/etc/php/conf.d/opcache-recommended.ini

WORKDIR /var/www/html

COPY --from=vendor /app /var/www/html

RUN addgroup -g 1000 www && adduser -G www -u 1000 -D www \
    && chown -R www:www /var/www/html/storage /var/www/html/bootstrap/cache

USER www

EXPOSE 9000
CMD ["php-fpm"]
