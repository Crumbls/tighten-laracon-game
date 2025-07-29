<x-app-layout title="It's really not Pacman, it's something else! | Crumbls">
    <link rel="stylesheet" href="{{ mix('css/laraconman.css', 'vendor/laraconman') }}">
    <section class="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 relative">

            <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                <div class="w-full md:w-1/4">
                    Left
                </div>
                <div class="w-full md:flex-1">
                    <canvas id="gameCanvas" width="1000" height="1000" class="w-full h-full"></canvas>
                </div>
                <div class="w-full md:w-1/4">
                    Left
                </div>
            </div>
    </section>
    <script>
        // Output the CSV string from the Maps model as a JS variable for game.js
        window.laraconmanMazeCsv = `{!! trim($map->design) !!}`;
        // Prevent arrow keys from scrolling the browser
        window.addEventListener('keydown', function(e) {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
            }
        }, { passive: false });
    </script>
{{-- Use Mix-compiled JS, no type="module" --}}
    <script src="{{ mix('js/laraconman.js', 'vendor/laraconman') }}"></script>
</x-app-layout>