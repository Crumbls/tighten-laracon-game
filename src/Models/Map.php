<?php

namespace Crumbls\Laraconman\Models;

use Crumbls\Laraconman\Database\Factories\MapFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Map extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'design',
        'width',
        'height',
        'difficulty_level',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'width' => 'integer',
        'height' => 'integer',
        'difficulty_level' => 'integer',
    ];

    public function getDesignAsArray(): array
    {
        return array_map('str_getcsv', explode("\n", trim($this->design)));
    }

    public function setDesignFromArray(array $design): void
    {
        $csvRows = array_map(fn($row) => implode(',', $row), $design);
        $this->design = implode("\n", $csvRows);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByDifficulty($query, int $level)
    {
        return $query->where('difficulty_level', $level);
    }

    protected static function newFactory()
    {
		return MapFactory::new();
    }
}