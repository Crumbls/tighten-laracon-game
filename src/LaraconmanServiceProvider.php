<?php

namespace Crumbls\Laraconman;

use Crumbls\Laraconman\Commands\InstallCommand;
use Illuminate\Support\ServiceProvider;

class LaraconmanServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/web.php');
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'laraconman');
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        if ($this->app->runningInConsole()) {
            $this->commands([
                InstallCommand::class,
            ]);

            $this->publishes([
                __DIR__.'/../resources/views' => resource_path('views/vendor/laraconman'),
            ], 'laraconman-views');

            // Publish Mix-compiled JS and manifest on vendor:publish
            $this->publishes([
                __DIR__.'/../../public/js/laraconman.js' => public_path('vendor/laraconman/js/laraconman.js'),
            ], 'laraconman-assets');
            if (file_exists(__DIR__.'/../../public/mix-manifest.json')) {
                $this->publishes([
                    __DIR__.'/../../public/mix-manifest.json' => public_path('vendor/laraconman/mix-manifest.json'),
                ], 'laraconman-assets');
            }

            $this->publishes([
                __DIR__.'/../resources/assets' => public_path('vendor/laraconman'),
            ], 'laraconman-assets');

            $this->publishes([
                __DIR__.'/../database/migrations' => database_path('migrations'),
            ], 'laraconman-migrations');
        }
    }
}