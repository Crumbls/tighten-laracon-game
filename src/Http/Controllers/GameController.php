<?php

namespace Crumbls\Laraconman\Http\Controllers;

use Illuminate\Routing\Controller;
use Crumbls\Laraconman\Models\Map;
use Illuminate\View\View;

class GameController extends Controller
{
    /**
     * Display the Pacman game with a random map.
     */
    public function __invoke(): View
    {
        $map = Map::inRandomOrder()->first();
        return view('laraconman::game', [
            'map' => $map,
        ]);
    }
}
