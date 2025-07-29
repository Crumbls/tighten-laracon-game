<x-app-layout title="It's really not Pacman, it's something else! | Crumbls">
    <link rel="stylesheet" href="{{ mix('css/laraconman.css', 'vendor/laraconman') }}">
    <section class="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 relative">

            <div class="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4">
                <div class="w-full md:flex-1">
                    <!-- Score Display -->
                    <div class="mb-4 text-center">
                        <div class="arounded-lg flex just">
                            <div class="mx-auto border border-gray-600 rounded-lg overflow-hidden flex items-center">
                                <div class="text-center">
                                    <div class="bg-[#ea384c] text-center text-sm font-medium uppercase tracking-wide px-2">Score</div>
                                    <div id="score" class="text-black text-2xl font-bold">-</div>
                                    </div>
                                <div class="text-center">
                                    <div class="bg-[#ea384c] text-center text-sm font-medium uppercase tracking-wide px-2">Lives</div>
                                    <div id="lives" class="text-black text-2xl font-bold">-</div>
                                </div>
                                <div class="text-center">
                                    <div class="bg-[#ea384c] text-center text-sm font-medium uppercase tracking-wide px-2">Level</div>
                                    <div id="level" class="text-black text-2xl font-bold">-</div>
                                </div>
                                </div>
                            </div>
                        </div>

                    <canvas id="gameCanvas" width="1000" height="1000" class="w-full h-full"></canvas>
                </div>
                <div class="w-full md:w-1/4">
                    <div class="mt-12">
                        <div class="relative">
                            <h2 class="text-2xl font-bold mb-4 text-center">
                                Quick Reference
                            </h2>
                            <div class="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-red-600/20 blur-xl -z-10 rounded-lg"></div>
                        </div>

                        <div class="bg-gradient-to-br from-gray-800 via-gray-900 to-black p-8 border border-gray-600">

                            <ul class="space-y-4 relative z-10">
                                <li class="group flex-col space-y-4 justify-between items-center justify-center">
                                    <span class="text-lg font-medium text-center">Movement:</span>
                                    <div class="flex space-x-2">
                                        <kbd class="rounded-full w-12 h-12 flex items-center justify-center bg-[#ea384c] text-white text-xl font-bold">↑</kbd>
                                        <kbd class="rounded-full w-12 h-12 flex items-center justify-center bg-[#ea384c] text-white text-xl font-bold">↓</kbd>
                                        <kbd class="rounded-full w-12 h-12 flex items-center justify-center bg-[#ea384c] text-white text-xl font-bold">←</kbd>
                                        <kbd class="rounded-full w-12 h-12 flex items-center justify-center bg-[#ea384c] text-white text-xl font-bold">→</kbd>
                                    </div>
                                </li>

                                <li class="group flex justify-between items-center">
                                    <span class="text-lg font-medium text-center">Mute:</span>
                                    <kbd class="rounded-full w-12 h-12 flex items-center justify-center bg-[#ea384c] text-white text-xl font-bold">M</kbd>
                                </li>

                                <li class="group flex justify-between items-center">
                                    <span class="text-lg font-medium text-center">Pause:</span>
                                    <kbd class="rounded-full w-12 h-12 flex items-center justify-center bg-[#ea384c] text-white text-xl font-bold">P</kbd>
                                </li>

                                <li class="group flex justify-between items-center">
                                    <span class="text-lg font-medium text-center">Start/Select:</span>
                                    <kbd class="rounded-full w-auto px-2 h-12 flex items-center justify-center bg-[#ea384c] text-white text-xl font-bold">ENTER</kbd>
                                </li>

                            </ul>
                        </div>
                    </div>
                </div>

                </div>
            </div>
    </section>
    <script>
        window.laraconmanMazeCsvs = {!! $records->map(function($record) { return trim($record->design); })->unique()->toJson()  !!}
        window.laraconmanAudioPath = '{{ url('vendor/laraconman/audio/') }}'
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