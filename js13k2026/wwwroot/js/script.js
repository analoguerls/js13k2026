/* eslint-disable func-style, new-cap, no-extra-parens, no-mixed-operators */

import {
    GameLoop,
    Sprite,
    Text,
    gamepadAxis,
    getStoreItem,
    init,
    initGamepad,
    initKeys,
    keyPressed,
    onGamepad,
    onKey,
    setStoreItem
} from 'https://unpkg.com/kontra@10.0.2/kontra.mjs';

const {
        canvas,
        context
    } = init(),
    COLORS = [
        // ROYGBIV
        '#FAA',
        '#FCA',
        '#FFA',
        '#AFA',
        '#AAF',
        '#CAF',
        '#DBF'
    ],
    COUNTER_Y = canvas.height - 110,
    DELIVER_R = 42,
    INSPECTOR_CATCH_R = 24,
    INSPECTOR_COOLDOWN = 20,
    PICKUP_R = 42,
    PLAYER_SPEED = 260,
    UNICORNS = COLORS.map((color, i) => ({
        color,
        x: 80 + i * 70,
        y: 90
    })),
    UNICORN_Y = 90,
    game = {
        loop: null,
        ui: {
            break: Text({
                anchor: {
                    x: 0.5,
                    y: 0.5
                },
                color: '#FFF',
                font: '28px monospace',
                text: 'Get ready for the next batch of hungry customers!',
                textAlign: 'center',
                width: canvas.width - 60,
                x: canvas.width / 2,
                y: canvas.height / 2
            }),
            highScore: Text({
                anchor: {
                    x: 1,
                    y: 0
                },
                color: '#FFF',
                font: '21px monospace',
                text: 'Best $0',
                x: canvas.width - 10,
                y: 10
            }),
            over: Text({
                anchor: {
                    x: 0.5,
                    y: 0.5
                },
                color: '#FFF',
                font: '30px monospace',
                text: 'GAME OVER\nPress N to play again',
                x: canvas.width / 2,
                y: canvas.height / 2
            }),
            score: Text({
                color: '#FFF',
                font: '21px monospace',
                text: '$0',
                x: 10,
                y: 10
            })
        }
    };

let
    cachedGamepadIndex = -1,
    spawnTimer = 0;

// Init gamepad and keyboard input
initKeys();
initGamepad();

// Determine if the player is using a gamepad and if so, what index it is
window.addEventListener('gamepadconnected', (evt) => {
    cachedGamepadIndex = evt.gamepad.index;
});

window.addEventListener('gamepaddisconnected', (evt) => {
    if (evt.gamepad.index === cachedGamepadIndex) {
        cachedGamepadIndex = -1;
    }
});


// Returns the current gamepad axis value, or 0 if no gamepad is connected
function axis (name) {
    return cachedGamepadIndex >= 0 ? gamepadAxis(name, cachedGamepadIndex) : 0;
}

// Draws a filled circle at (x, y) with radius r on the given context
function drawCircle (ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

// Draws a filled triangle from three points on the given context
// eslint-disable-next-line max-params
function drawTriangle (ctx, x1, y1, x2, y2, x3, y3) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
}

// Returns a fresh copy of the initial round/game state
function initialState () {
    return {
        breakTimer: 0,
        carrying: null,
        colorBag: [],
        customers: [],
        elapsed: 0,
        inspector: null,
        inspectorCooldown: 0,
        maxAtOnce: 3,
        onBreak: false,
        over: false,
        round: 1,
        score: 0,
        served: 0,
        target: 7
    };
}

// Reads the stored high score, updates it if beaten, and refreshes the UI text
function updateHighScore () {
    const stored = getStoreItem('unicorn_poop') || 0;

    if (game.score > stored) {
        setStoreItem('unicorn_poop', game.score);
    }

    game.ui.highScore.text = `Best $${Math.max(stored, game.score)}`;
}

function advanceRound () {
    game.round += 1;
    game.served = 0;
    game.target = Math.min(game.round * 7, 70);

    game.maxAtOnce = Math.min(3 + (game.round - 1) * 2, 14);

    game.customers = [];
    game.inspector = null;
    game.inspectorCooldown = INSPECTOR_COOLDOWN;
    game.onBreak = true;
    game.breakTimer = 7;
}

function dist (a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function nextColor () {
    if (!game.colorBag.length) {
        game.colorBag = [...COLORS];

        // Shuffle the color bag
        for (let i = game.colorBag.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));

            // Swap colors
            [game.colorBag[i], game.colorBag[j]] = [game.colorBag[j], game.colorBag[i]];
        }
    }

    return game.colorBag.pop();
}

// Resets the game state and starts a new game loop
function resetGame () {
    Object.assign(game, initialState());
    spawnTimer = 0;
    game.player.x = canvas.width / 2;
    game.player.y = (UNICORN_Y + COUNTER_Y) / 2;
    game.ui.score.text = '$0';
    updateHighScore();
}

// Restarts the game from the beginning, resetting all state and UI elements
function restart () {
    if (game.over) {
        resetGame();
    }
}

/*
 * Customer walking speed tuning:
 * - Base speed: random between BASE_MIN and BASE_MIN + BASE_RANGE px/sec.
 * - multiplier: grows 10% per round past round 1, capped at round 10 (max +100%).
 *   Adjust the 0.1 step to change ramp-up rate per round.
 *   Adjust Math.min(..., 9) to change the round at which speed scaling caps.
 */
function spawnCustomer () {
    const
        color = nextColor(),
        multiplier = 1 + 0.1 * Math.min(game.round - 1, 9),
        speed = (25 + Math.random() * 20) * multiplier;

    game.customers.push(Sprite({
        anchor: {
            x: 0.5,
            y: 0.5
        },
        color: '#DDD',
        dx: -speed,
        height: 36,
        moveTimer: 0.5 + Number(Math.random()),
        paused: false,
        render () {
            this.context.fillStyle = this.color;
            this.context.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

            // Draw a cone above the customer indicating their desired flavor
            this.context.fillStyle = this.want;
            drawTriangle(this.context, -8, -this.height / 2 - 2, 8, -this.height / 2 - 2, 0, -this.height / 2 - 18);
        },
        served: false,
        want: color,
        width: 26,
        x: canvas.width + 20,
        y: COUNTER_Y
    }));
}

function tryAction () {
    if (game.over) {
        return;
    }

    if (game.carrying) {
        const target = game.customers.find((c) => !c.served && c.want === game.carrying && dist(game.player, c) < DELIVER_R);

        if (target) {
            target.served = true;
            game.carrying = null;
            game.score += 10;
            game.served += 1;
            game.ui.score.text = `$${game.score}`;
            updateHighScore();

            if (game.served >= game.target) {
                advanceRound();
            }

            return;
        }
    }

    const unicorn = UNICORNS.find((u) => dist(game.player, u) < PICKUP_R);

    if (unicorn) {
        // Penalize swapping to a different color before delivering (clamped at 0)
        if (game.carrying && game.carrying !== unicorn.color) {
            game.score = Math.max(0, game.score - 2);
            game.ui.score.text = `$${game.score}`;
            updateHighScore();
        }

        game.carrying = unicorn.color;
    }
}

/*
 * Health inspector mechanic tuning:
 * - Only spawns from round 2 onward (game.round > 1).
 * - After appearing (or after the round starts), waits INSPECTOR_COOLDOWN
 *   seconds before it's allowed to appear again.
 * - Random appearance: each frame there's a small chance to trigger once
 *   cooldown has expired, so appearance timing within the round is unpredictable.
 * - Moves left-to-right across the middle of the screen (y = mid-court).
 * - Speeds up if the player is currently ahead of him (to the right),
 *   mimicking a chase; otherwise moves at base speed.
 * - Uses the same pause/resume walking pattern as customers.
 */
function trySpawnInspector (dt) {
    if (game.round <= 1 || game.inspector) {
        return;
    }

    if (game.inspectorCooldown > 0) {
        game.inspectorCooldown -= dt;

        return;
    }

    // Small per-frame chance to appear once cooldown has expired
    if (Math.random() < 0.01) {
        game.inspector = Sprite({
            anchor: {
                x: 0.5,
                y: 0.5
            },
            baseSpeed: 110,
            color: '#FF0',
            height: 34,
            moveTimer: 0.5 + Number(Math.random()),
            paused: false,
            render () {
                this.context.fillStyle = this.color;
                this.context.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

                // Clipboard indicator
                this.context.fillStyle = '#333';
                this.context.fillRect(-6, -this.height / 2 - 10, 12, 14);
            },
            waveAmplitude: 20 + Math.random() * 20,
            waveOffset: Math.random() * Math.PI * 2,
            waveSpeed: 2 + Math.random() * 2,
            width: 24,
            x: -20,
            y: (UNICORN_Y + COUNTER_Y) / 2
        });
    }
}

// Setup controls
onKey('n', restart);
onGamepad('north', restart);
onKey('space', tryAction);
onGamepad('south', tryAction);

// Resets the game state and starts a new round
Object.assign(game, initialState());
updateHighScore();

// Create the player sprite
game.player = Sprite({
    anchor: {
        x: 0.5,
        y: 0.5
    },
    color: '#FFF',
    height: 26,
    render () {
        this.context.fillStyle = this.color;
        drawCircle(this.context, 0, 0, this.width / 2);

        if (game.carrying) {
            this.context.fillStyle = game.carrying;
            drawCircle(this.context, 0, -this.width / 2 - 12, 8);
        }
    },
    width: 26,
    x: canvas.width / 2,
    y: (UNICORN_Y + COUNTER_Y) / 2
});

// Start the game loop
game.loop = GameLoop({
    render () {
        context.fillStyle = '#111';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the unicorns
        UNICORNS.forEach((u) => {
            context.fillStyle = '#FFF';
            drawCircle(context, u.x, u.y, 20);

            // Horn
            context.fillStyle = u.color;
            drawTriangle(context, u.x - 6, u.y - 16, u.x + 6, u.y - 16, u.x, u.y - 34);

            // Tail (curved teardrop shape flowing off the back)
            context.fillStyle = u.color;
            context.beginPath();
            context.moveTo(u.x + 14, u.y - 4);
            context.quadraticCurveTo(u.x + 34, u.y + 2, u.x + 26, u.y + 22);
            context.quadraticCurveTo(u.x + 20, u.y + 10, u.x + 14, u.y - 4);
            context.closePath();
            context.fill();
        });

        // Draw the counter line
        context.strokeStyle = '#444';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(0, COUNTER_Y + 24);
        context.lineTo(canvas.width, COUNTER_Y + 24);
        context.stroke();

        game.customers.forEach((c) => c.render());
        if (game.inspector) {
            game.inspector.render();
        }
        game.player.render();
        game.ui.score.render();
        game.ui.highScore.render();

        if (game.over) {
            game.ui.over.render();
        } else if (game.onBreak) {
            game.ui.break.render();
        }
    },
    update (dt) {
        if (game.over) {
            return;
        }

        if (game.onBreak) {
            game.breakTimer -= dt;

            if (game.breakTimer <= 0) {
                game.onBreak = false;
            }

            return;
        }

        // Free player movement
        let dx = 0,
            dy = 0;

        if (keyPressed('arrowleft')) {
            dx -= 1;
        }
        if (keyPressed('arrowright')) {
            dx += 1;
        }
        if (keyPressed('arrowup')) {
            dy -= 1;
        }
        if (keyPressed('arrowdown')) {
            dy += 1;
        }

        // Gamepad stick movement (with small deadzone)
        const
            DEADZONE = 0.2,
            spawnInterval = Math.max(0.7, 1.8 - game.elapsed / 45),
            stickX = axis('leftstickx'),
            stickY = axis('leftsticky');

        if (Math.abs(stickX) > DEADZONE) {
            dx += stickX;
        }
        if (Math.abs(stickY) > DEADZONE) {
            dy += stickY;
        }

        if (dx || dy) {
            const len = Math.hypot(dx, dy);

            game.player.x += (dx / len) * PLAYER_SPEED * dt;
            game.player.y += (dy / len) * PLAYER_SPEED * dt;
        }

        game.player.x = Math.max(20, Math.min(canvas.width - 20, game.player.x));
        game.player.y = Math.max(UNICORN_Y + 30, Math.min(COUNTER_Y + 10, game.player.y));

        spawnTimer += dt;
        game.elapsed += dt;

        if (game.customers.length < game.maxAtOnce && spawnTimer > spawnInterval) {
            spawnTimer = 0;
            spawnCustomer();
        }

        // Move customers, with occasional pauses
        game.customers.forEach((c) => {
            c.moveTimer -= dt;

            if (c.moveTimer <= 0) {
                c.paused = !c.paused;
                c.moveTimer = c.paused
                    ? 1.2 + Math.random() * 1.8
                    : 0.4 + Number(Math.random()) * 0.8;
            }

            if (!c.paused) {
                c.x += c.dx * dt;
            }
        });

        // Spawn and move the health inspector
        trySpawnInspector(dt);

        if (game.inspector) {
            const inspector = game.inspector;

            inspector.moveTimer -= dt;

            if (inspector.moveTimer <= 0) {
                inspector.paused = !inspector.paused;
                inspector.moveTimer = inspector.paused
                    ? 1 + Math.random() * 1.5
                    : 0.6 + Number(Math.random()) * 1;
            }

            if (!inspector.paused) {
                // Speed up if the player is ahead of (to the right of) the inspector
                const chaseSpeed = game.player.x > inspector.x ? inspector.baseSpeed * 1.8 : inspector.baseSpeed;

                inspector.x += chaseSpeed * dt;
                inspector.waveOffset += inspector.waveSpeed * dt;
                inspector.y = (UNICORN_Y + COUNTER_Y) / 2 + Math.sin(inspector.waveOffset) * inspector.waveAmplitude;
            }

            // Catch the player: fine them and confiscate their carried scoop
            if (dist(game.player, inspector) < INSPECTOR_CATCH_R) {
                game.score = Math.max(0, game.score - 50);
                game.carrying = null;
                game.ui.score.text = `$${game.score}`;
                updateHighScore();

                game.inspector = null;
                game.inspectorCooldown = INSPECTOR_COOLDOWN;
            } else if (inspector.x > canvas.width + 20) {
                // Inspector walked off screen without catching anyone
                game.inspector = null;
                game.inspectorCooldown = INSPECTOR_COOLDOWN;
            }
        }


        // Losing a single customer past the counter ends the game
        if (game.customers.some((c) => !c.served && c.x <= -20)) {
            game.over = true;
        } else {
            game.customers = game.customers.filter((c) => !c.served);
        }
    }
});

game.loop.start();
