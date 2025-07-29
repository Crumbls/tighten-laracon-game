// Modern ES6 settings module for laraconman Pac-Man clone
// Export a plain object with all settings, no globals or sessionStorage side-effects

const settings = {
  score: 0,
  lives: 3,
  level: 1,
  moveInc: 2, // must divide 10 evenly: 1,2,5,10
  speed: 10, // see comments in legacy for tuning
  gameTime: 10000, // ms
  mazeSource: 'designed',
  basicVision: false,
  resetModeOnResetGame: true,
  excludeReverseDirectionInRandomMode: true,
  fx: true,
  extras: false,
  ghostPenTimeout: 2, // seconds ghosts wait in pen before forced exit (change as needed)
  megaPelletDuration: 5, // seconds Pac-Man stays enhanced after mega pellet
  maxGhosts: 6, // maximum number of ghosts in play
  playerSpeed: 2, // normal speed
  playerSize: 24, // normal size (px)
  playerSuperSpeed: 4, // speed during super state
  playerSuperSize: 32, // size during super state (px)
  dotPoints: 10,
  superDotPoints: 50,
  fruitTypes: [
    { type: 'cherry', points: 100, image: '/vendor/laraconman/images/fruit-cherry.svg' },
    { type: 'strawberry', points: 300, image: '/vendor/laraconman/images/fruit-strawberry.svg' },
    { type: 'orange', points: 500, image: '/vendor/laraconman/images/fruit-orange.svg' },
    { type: 'apple', points: 700, image: '/vendor/laraconman/images/fruit-apple.svg' },
    // Add more as desired
  ],
};

export default settings;