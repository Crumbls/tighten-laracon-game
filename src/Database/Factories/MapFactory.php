<?php

namespace Crumbls\Laraconman\Database\Factories;

use Crumbls\Laraconman\Models\Map;
use Illuminate\Database\Eloquent\Factories\Factory;

class MapFactory extends Factory
{
    protected $model = Map::class;

    public function definition(): array
    {
        // List of demo mazes (flattened, as in demo-mazedata*.js)
        $mazes = [
            [ // demo-mazedata1
                [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
                [1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,1],
                [1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1],
                [0,0,0,0,1,0,1,0,0,5,0,0,1,0,1,0,0,0,0],
                [4,1,1,1,1,1,1,0,3,3,3,0,1,1,1,1,1,1,4],
                [0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1],
                [1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1],
                [0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0],
                [1,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,1],
                [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
            ],
            [ // demo-mazedata2
                [4,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,4],
                [0,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,0],
                [2,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,2],
                [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
                [1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1],
                [0,0,0,0,1,0,1,0,0,5,0,0,1,0,1,0,0,0,0],
                [1,1,1,1,1,1,1,0,3,3,3,0,1,1,1,1,1,1,1],
                [1,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,1],
                [1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1],
                [0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0],
                [4,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,4],
                [0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0],
                [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1],
                [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
            ],
            [ // demo-mazedata3
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,1],
                [2,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,2],
                [0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0],
                [4,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,4],
                [0,0,1,0,0,0,1,0,0,5,0,0,1,0,0,0,1,0,0],
                [1,1,1,1,1,1,1,0,3,3,3,0,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0],
                [4,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,4],
                [0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0],
                [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,1],
                [2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2],
            ],
        ];
        // REVERT: Do not modify pen/ghost door in demo mazes; trust demo-mazedata*.js layouts
        // Only perform minimal validation or adaptation if needed for gameplay, not forced centering
        // (All previous logic for pen/door centering is removed)
        // If you need to adapt for new features, do it here, but default maps are trusted

        // Remove tunnel tiles from top/bottom corners in all demo mazes
        foreach ($mazes as &$maze) {
            $width = count($maze[0]);
            $height = count($maze);
            // Top row corners
            if ($maze[0][0] === 4) $maze[0][0] = 1;
            if ($maze[0][$width-1] === 4) $maze[0][$width-1] = 1;
            // Bottom row corners
            if ($maze[$height-1][0] === 4) $maze[$height-1][0] = 1;
            if ($maze[$height-1][$width-1] === 4) $maze[$height-1][$width-1] = 1;
            // Remove dead-end paths on the outer ring
            // For each edge cell, if it's a path (1 or 2), but the only neighbor is a wall, convert to wall
            // Repeat until no more changes
            $changed = true;
            while ($changed) {
                $changed = false;
                // Top and bottom rows
                foreach ([0, $height-1] as $r) {
                    for ($c = 0; $c < $width; $c++) {
                        if (in_array($maze[$r][$c], [1,2])) {
                            $neighbors = [];
                            if ($r > 0) $neighbors[] = $maze[$r-1][$c];
                            if ($r < $height-1) $neighbors[] = $maze[$r+1][$c];
                            if ($c > 0) $neighbors[] = $maze[$r][$c-1];
                            if ($c < $width-1) $neighbors[] = $maze[$r][$c+1];
                            $open = array_filter($neighbors, fn($n) => in_array($n, [1,2,3,4,5]));
                            if (count($open) <= 1) {
                                $maze[$r][$c] = 0; $changed = true;
                            }
                        }
                    }
                }
                // Left and right columns
                foreach ([0, $width-1] as $c) {
                    for ($r = 0; $r < $height; $r++) {
                        if (in_array($maze[$r][$c], [1,2])) {
                            $neighbors = [];
                            if ($r > 0) $neighbors[] = $maze[$r-1][$c];
                            if ($r < $height-1) $neighbors[] = $maze[$r+1][$c];
                            if ($c > 0) $neighbors[] = $maze[$r][$c-1];
                            if ($c < $width-1) $neighbors[] = $maze[$r][$c+1];
                            $open = array_filter($neighbors, fn($n) => in_array($n, [1,2,3,4,5]));
                            if (count($open) <= 1) {
                                $maze[$r][$c] = 0; $changed = true;
                            }
                        }
                    }
                }
            }
        }
        $idx = random_int(0, 2);
        $maze = $mazes[$idx];
        $width = count($maze[0]);
        $height = count($maze);
        return [
            'name' => 'Demo Maze ' . ($idx+1),
            'description' => 'Imported from demo-mazedata' . ($idx+1) . '.js',
            'width' => $width,
            'height' => $height,
            'design' => collect($maze)->map(fn($row)=> implode(',', $row))->implode("\n"),
            'difficulty_level' => 1,
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    public function difficulty(int $level): static
    {
        return $this->state(fn (array $attributes) => [
            'difficulty_level' => $level,
        ]);
    }

    public function withCustomSize(int $width, int $height): static
    {
        return $this->state(fn (array $attributes) => [
            'width' => $width,
            'height' => $height,
            'design' => $this->generateMapDesign($width, $height),
        ]);
    }

    private function ensureConnectivity(&$grid, $w, $h) {
        // BFS flood fill from first open (2 or 4) to mark
        $start = null;
        for ($r=0;$r<$h;$r++){
            for ($c=0;$c<$w;$c++){
                if (in_array($grid[$r][$c], [2,4])) {
                    $start = [$r,$c]; break 2;
                }
            }
        }
        if (!$start) return;
        $visited = [];
        $queue = [$start];
        while ($queue) {
            list($r,$c) = array_shift($queue);
            $key = "$r,$c";
            if (isset($visited[$key])) continue;
            $visited[$key] = true;
            foreach ([[-1,0],[1,0],[0,-1],[0,1]] as [$dr,$dc]) {
                $nr=$r+$dr; $nc=$c+$dc;
                if ($nr>=0 && $nr<$h && $nc>=0 && $nc<$w
                    && in_array($grid[$nr][$nc],[2,4])
                    && !isset($visited["$nr,$nc"])) {
                    $queue[] = [$nr,$nc];
                }
            }
        }
        // fill unreachable opens back to walls then try carving minimal connectors
        foreach ($grid as $r => $row) {
            foreach ($row as $c => $val) {
                if (in_array($val,[2,4]) && !isset($visited["$r,$c"])) {
                    $grid[$r][$c] = 1;
                }
            }
        }
        // For simplicity, assume resulting remains connected.
    }
}