// Central config for entity art assets and metadata
// Use PNG or SVG paths (relative to public/vendor/laraconman/images/)

export default {
    player: {
        name: 'Player',
        image: '/vendor/laraconman/images/player.svg',
        size: 32
    },
    ghosts: [
        { name: 'NullPointer',    image: '/vendor/laraconman/images/ghost-blinky.svg', size: 32 },
        { name: 'PushProduction',       image: '/vendor/laraconman/images/ghost-pinky.svg',  size: 32 },
        { name: 'Glitchy',        image: '/vendor/laraconman/images/ghost-inky.svg',   size: 32 },
        { name: 'Regexorcist',    image: '/vendor/laraconman/images/ghost-clyde.svg',  size: 32 },
        { name: 'RaceCondition',  image: '/vendor/laraconman/images/ghost-blinky.svg', size: 32 },
        { name: 'HeapReaper',     image: '/vendor/laraconman/images/ghost-pinky.svg',  size: 32 },
        { name: 'GhostException', image: '/vendor/laraconman/images/ghost-inky.svg',   size: 32 },
        { name: 'StackOverghost', image: '/vendor/laraconman/images/ghost-clyde.svg',  size: 32 },
        { name: 'SyntaxTerror',   image: '/vendor/laraconman/images/ghost-blinky.svg', size: 32 }
    ],
    dot: {
        image: '/vendor/laraconman/images/dot.svg',
        size: 8
    },
    powerPellets: [
        { name: 'Classic', image: '/vendor/laraconman/images/power-pellet-classic.svg', size: 16 },
        { name: 'Star',    image: '/vendor/laraconman/images/power-pellet-star.svg',    size: 16 }
    ],
    fruit: [
        { name: 'Cherry',  image: '/vendor/laraconman/images/fruit-cherry.svg',  size: 20 },
        { name: 'Strawberry', image: '/vendor/laraconman/images/fruit-strawberry.svg', size: 20 }
    ]
};
