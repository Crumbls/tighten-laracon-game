<?php

use Illuminate\Support\Facades\Route;
use Crumbls\Laraconman\Http\Controllers\GameController;

Route::get('/laraconman', GameController::class)->name('laraconman.game');