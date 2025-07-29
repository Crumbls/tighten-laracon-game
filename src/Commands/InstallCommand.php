<?php

namespace Crumbls\Laraconman\Commands;

use Crumbls\Laraconman\Models\Map;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

class InstallCommand extends Command
{
    protected $signature = 'laraconman:install
                           {--force : Force installation even if already installed}
                           {--maps=20 : Number of maps to generate}';

    protected $description = 'Install Laraconman package with migrations and sample data';

    public function handle(): int
    {
        $this->info('🎮 Installing Laraconman...');
/*
        if ($this->isAlreadyInstalled() && !$this->option('force')) {
            $this->warn('Laraconman appears to already be installed.');
            
            if (!$this->confirm('Continue anyway?')) {
                $this->info('Installation cancelled.');
                return self::SUCCESS;
            }
        }
*/
        $this->runMigrations();
        $this->publishAssets();

		Map::all()->each(fn($map) => $map->delete());

        $this->seedMaps();
        
        $this->newLine();
        $this->info('✅ Laraconman installation complete!');
        $this->info('🎯 Visit /laraconman to play the game');
        //$this->info('📊 Generated ' . $this->option('maps') . ' sample maps');

        return self::SUCCESS;
    }

    private function isAlreadyInstalled(): bool
    {
        try {
            return Schema::hasTable('maps') && Map::count() > 0;
        } catch (\Exception $e) {
            return false;
        }
    }

    private function runMigrations(): void
    {
        $this->info('📦 Running migrations...');
        
        Artisan::call('migrate', [
            '--path' => 'vendor/crumbls/laraconman/database/migrations',
            '--force' => true
        ]);

        if (Artisan::output()) {
            $this->line(Artisan::output());
        }

        $this->info('✅ Migrations completed');
    }

    private function publishAssets(): void
    {
        $this->info('📁Publishing assets...');

        Artisan::call('vendor:publish', [
            '--tag' => 'laraconman-assets',
            '--force' => $this->option('force')
        ]);

	    $manifestPath =__DIR__.'/../../public/mix-manifest.json';

		if (!file_exists($manifestPath)) {
			throw new \Exception('Execute npm i and npm run build first.');
		}

		$contents = json_decode(file_get_contents($manifestPath), true);
	    $manifestBase = dirname($manifestPath);

	    foreach ($contents as $src => $dest) {
            // $src: "/js/laraconman.js", $dest: "/js/laraconman.js"
            $srcFile = $manifestBase . $src;
            $destFile = public_path('vendor/laraconman' . $dest);
            $destDir = dirname($destFile);
            if (!file_exists($destDir)) {
                mkdir($destDir, 0777, true);
            } else if (!is_dir($destDir)) {
                throw new \Exception('Not a directory: ' . $destDir);
            }
            copy($srcFile, $destFile);
        }

        // Copy mix-manifest.json to vendor/laraconman so mix() works in Blade
        $manifestDest = public_path('vendor/laraconman/mix-manifest.json');
        $manifestDestDir = dirname($manifestDest);
        if (!file_exists($manifestDestDir)) {
            mkdir($manifestDestDir, 0777, true);
        }
        copy($manifestPath, $manifestDest);

	    // Copy images to application's public/vendor/laraconman/images directory
	    $srcImgDir = __DIR__.'/../../resources/assets/images';
	    $destImgDir = public_path('vendor/laraconman/images');
	    @mkdir($destImgDir, 0777, true);
	    foreach (glob($srcImgDir . '/*.{svg,png}', GLOB_BRACE) as $imgFile) {
		    $destFile = $destImgDir . '/' . basename($imgFile);
		    copy($imgFile, $destFile);
	    }

	    // Copy images to application's public/vendor/laraconman/images directory
	    $srcDir = __DIR__.'/../../resources/assets/audio';
	    $destDir = public_path('vendor/laraconman/audio');
	    @mkdir($destDir, 0777, true);
	    foreach (glob($srcDir . '/*.mp3') as $imgFile) {
		    $destFile = $destDir . '/' . basename($imgFile);
		    copy($imgFile, $destFile);
	    }

        $this->info('✅ Assets published');
    }

    private function seedMaps(): void
    {
	    $x = Map::count();

        $mapCount = (int) $this->option('maps');

		$mapCount = max(0, $mapCount - $x);

		if (!$mapCount) {
			$this->info('📊Maps already generated!');
			return;
		}

        $this->info("🗺️  Generating {$mapCount} sample maps...");

        for ($i = 0; $i < $mapCount; $i++) {
            Map::factory()->create([
                'name' => "Level " . ($i + 1),
                'difficulty_level' => min(5, ceil(($i + 1) / 2))
            ]);
		}
        $this->info('✅ Sample maps generated');
    }
}