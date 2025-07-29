const mix = require('laravel-mix');

mix.js('resources/assets/js/game.js', 'js/laraconman.js')
    .css('resources/assets/css/game.css', 'css/laraconman.css')
    .setPublicPath('public')
    .sourceMaps();

// Optionally, add CSS or other assets here
// mix.sass('resources/assets/sass/app.scss', 'public/css');

// Versioning for cache busting in production
if (mix.inProduction()) {
    mix.version();
}
