FROM php:8.3-apache-bookworm

ENV APP_ENV=production \
    APP_DEBUG=false \
    PORT=10000

WORKDIR /var/www/html

# System libraries, Laravel PHP extensions, and the MongoDB driver.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        libcurl4-openssl-dev \
        libicu-dev \
        libonig-dev \
        libssl-dev \
        libxml2-dev \
        libzip-dev \
        pkg-config \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        mbstring \
        opcache \
        xml \
        zip \
    && pecl install mongodb \
    && docker-php-ext-enable mongodb \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/* /tmp/pear

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install PHP dependencies before copying the application for better layer caching.
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

COPY . .
COPY docker/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/entrypoint.sh /usr/local/bin/melodify-entrypoint

RUN chmod +x /usr/local/bin/melodify-entrypoint \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 10000

ENTRYPOINT ["/usr/local/bin/melodify-entrypoint"]
