#!/usr/bin/env sh
set -eu

PORT="${PORT:-10000}"

# Render provides PORT at runtime. Apache's default port is 80, so adapt both
# Apache configuration files before starting the foreground process.
sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

php artisan storage:link --force || true
php artisan config:cache

exec apache2-foreground
