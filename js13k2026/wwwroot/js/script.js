/* eslint-disable func-style, new-cap, no-extra-parens, no-mixed-operators */
/* global window */

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
    COLORS_STROKE = [
        '#F00',
        '#FA0',
        '#FF0',
        '#080',
        '#00F',
        '#408',
        '#93E'
    ],
    CONE = '#E3D0BF',
    COUNTER_BASE_H = 30,
    COUNTER_MID_H = 30,
    COUNTER_TOP_H = 21,
    COUNTER_TOP_Y = canvas.height - (COUNTER_BASE_H + COUNTER_MID_H + COUNTER_TOP_H),
    COUNTER_Y = canvas.height - 21,
    DELIVER_R = 42,
    INSPECTOR_CATCH_R = 24,
    INSPECTOR_COOLDOWN = 20,
    PICKUP_R = 42,
    PLAYER_MAX_Y = COUNTER_TOP_Y + 24,
    PLAYER_REACH_Y = 28,
    PLAYER_SPEED = 260,
    TAIL_SWING_DURATION = 0.5,
    UNICORNS = COLORS.map((color, i) => ({
        color,
        tailSwingTimer: 0,
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

// Draws a rounded speech balloon with a pointer at the bottom, centered at (x, y)
function drawBalloon (ctx, x, y, w, h) {
    const r = 8;

    ctx.beginPath();
    ctx.moveTo(x - w / 2 + r, y - h / 2);
    ctx.lineTo(x + w / 2 - r, y - h / 2);
    ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + r);
    ctx.lineTo(x + w / 2, y + h / 2 - r);
    ctx.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - r, y + h / 2);
    ctx.lineTo(6, y + h / 2);
    ctx.lineTo(x, y + h / 2 + 10);
    ctx.lineTo(-6, y + h / 2);
    ctx.lineTo(x - w / 2 + r, y + h / 2);
    ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - r);
    ctx.lineTo(x - w / 2, y - h / 2 + r);
    ctx.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + r, y - h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

// Draws a circle at (x, y) with radius r on the given context, optionally stroking it
function drawCircle (ctx, x, y, r, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    if (stroke) {
        ctx.stroke();
    }
}

// Draws a person shape (oval body + circle head) sized to fit within width/height, returns head position for further drawing
function drawPerson (ctx, width, height, color) {
    const headR = 12;

    // eslint-disable-next-line one-var
    const
        bodyH = height - headR * 2,
        bodyRx = width / 2,
        bodyRy = bodyH / 2,
        headOverlap = 8;

    // eslint-disable-next-line one-var
    const
        bodyCenterY = height / 2 - bodyRy,
        headCenterY = bodyCenterY - bodyRy - headR + headOverlap;

    ctx.fillStyle = color;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.ellipse(0, bodyCenterY, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, headCenterY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    return {
        headCenterY,
        headR
    };
}

// Draws a triangle from three points on the given context, optionally stroking it
// eslint-disable-next-line max-params
function drawTriangle (ctx, x1, y1, x2, y2, x3, y3, stroke) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();

    if (stroke) {
        ctx.stroke();
    }
}

// Returns a fresh copy of the initial round/game state
function initialState () {
    return {
        breakTimer: 0,
        carrying: [],
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

// Returns the COLORS_STROKE entry that matches a given COLORS fill color
function strokeForColor(color) {
    return COLORS_STROKE[COLORS.indexOf(color)];
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

// Dumps one carried scoop at a time, charging $1 per scoop (clamped at 0)
function dumpScoop () {
    if (game.over || !game.carrying.length) {
        return;
    }

    game.carrying.pop();
    game.score = Math.max(0, game.score - 1);
    game.ui.score.text = `$${game.score}`;
    updateHighScore();
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

// Returns n unique random colors from the palette (no repeats within an order)
function pickWantColors (n) {
    const
        colors = [],
        pool = [...COLORS];

    for (let i = 0; i < n; i += 1) {
        const idx = Math.floor(Math.random() * pool.length);

        colors.push(pool.splice(idx, 1)[0]);
    }

    return colors;
}

// Determines how many scoops a new customer wants based on the current round
function rollScoopCount () {
    if (game.round === 1) {
        return 1;
    }

    if (game.round === 2) {
        return 1 + Math.floor(Math.random() * 2);
    }

    return 1 + Math.floor(Math.random() * 3);
}

// Returns true if two color arrays contain the same colors, ignoring order
function sameColors (a, b) {
    if (a.length !== b.length) {
        return false;
    }

    const sortedA = [...a].sort(),
        sortedB = [...b].sort();

    return sortedA.every((c, i) => c === sortedB[i]);
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
        multiplier = 1 + 0.1 * Math.min(game.round - 1, 9),
        speed = (35 + Math.random() * 20) * multiplier,
        wants = pickWantColors(rollScoopCount());

    game.customers.push(Sprite({
        anchor: {
            x: 0.5,
            y: 0.5
        },
        color: '#FFF',
        dx: -speed,
        height: 75,
        moveTimer: 0.5 + Number(Math.random()),
        paused: false,
        render () {
            drawPerson(this.context, this.width, this.height, this.color);

            // Draw a word balloon above the customer showing their desired flavor(s)
            const
                ballR = 6,
                balloonW = 28,
                gap = 6,
                orderColors = this.want,
                padding = 10,
                spacing = 16,
                // eslint-disable-next-line sort-vars
                balloonH = padding * 2 + (orderColors.length - 1) * spacing,
                // eslint-disable-next-line sort-vars
                balloonY = -this.height / 2 - gap - balloonH / 2;

            this.context.fillStyle = '#FFF';
            this.context.strokeStyle = '#333';
            this.context.lineWidth = 1;
            drawBalloon(this.context, 0, balloonY, balloonW, balloonH);

            orderColors.forEach((fill, i) => {
                this.context.fillStyle = fill;
                this.context.strokeStyle = strokeForColor(fill);
                this.context.lineWidth = 1;
                drawCircle(this.context, 0, balloonY + balloonH / 2 - padding - i * spacing, ballR, true);
            });
        },
        served: false,
        want: wants,
        width: 26,
        x: canvas.width + 20,
        y: COUNTER_Y
    }));
}

function tryAction () {
    if (game.over) {
        return;
    }

    if (game.carrying.length) {
        const target = game.customers.find((c) => !c.served && sameColors(c.want, game.carrying) && dist(game.player, c) < DELIVER_R);

        if (target) {
            const payout = {
                1: 3,
                2: 6,
                3: 9
            }[game.carrying.length] || 0;

            target.served = true;
            game.carrying = [];
            game.score += payout;
            game.served += 1;
            game.ui.score.text = `$${game.score}`;
            updateHighScore();

            if (game.served >= game.target) {
                advanceRound();
            }

            return;
        }
    }

    const unicorn = UNICORNS.find((u) => dist({
        x: game.player.x,
        y: game.player.y - PLAYER_REACH_Y
    }, u) < PICKUP_R);

    if (unicorn && game.carrying.length < 3) {
        game.carrying.push(unicorn.color);
        unicorn.tailSwingTimer = TAIL_SWING_DURATION;
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
            height: 60,
            moveTimer: 0.5 + Number(Math.random()),
            paused: false,
            render () {
                const {
                    headCenterY,
                    headR
                } = drawPerson(this.context, this.width, this.height, this.color);

                // Clipboard indicator
                this.context.fillStyle = '#333';
                this.context.fillRect(-6, headCenterY - headR - 10, 12, 14);
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
onKey('x', dumpScoop);
onGamepad('west', dumpScoop);

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
    height: 72,
    render () {
        const {
            headCenterY,
            headR
        } = drawPerson(this.context, this.width, this.height, this.color);

        if (game.carrying.length) {
            const
                coneGap = 10,
                coneH = 22,
                coneW = 8,
                coneY = headCenterY - headR - coneGap;

            this.context.fillStyle = CONE;
            this.context.beginPath();
            this.context.moveTo(-coneW, coneY - coneH);
            this.context.lineTo(coneW, coneY - coneH);
            this.context.lineTo(0, coneY);
            this.context.closePath();
            this.context.fill();

            game.carrying.forEach((color, i) => {
                this.context.fillStyle = color;
                this.context.strokeStyle = strokeForColor(color);
                this.context.lineWidth = 1;
                drawCircle(this.context, 0, coneY - coneH - 6 - i * 14, 8, true);
            });
        }
    },
    width: 26,
    x: canvas.width / 2,
    y: (UNICORN_Y + COUNTER_Y) / 2
});

// Start the game loop
game.loop = GameLoop({
    render () {
        context.fillStyle = '#866F9B';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the unicorns
        UNICORNS.forEach((u) => {
            const
                bodyRx = 24,
                bodyRy = 16,
                headTopY = u.y - 40,
                headBottomY = u.y - 6,
                headW1 = 14,
                headW2 = 8,
                headX = u.x,
                muzzleH = 12,
                muzzleW = 7,
                muzzleX = headX + headW1 / 2 - 2,
                muzzleY = headTopY + (headBottomY - headTopY) * 0.4,
                r = 3;

            // Muzzle (small rectangle tilted so its right edge slopes down, drawn before the head so it appears behind it)
            context.fillStyle = '#FFF';
            context.strokeStyle = '#333';
            context.lineWidth = 1;
            context.save();
            context.translate(muzzleX, muzzleY);
            context.rotate(-Math.PI / 5);
            context.beginPath();
            context.roundRect(-muzzleW / 2, 0, muzzleW, muzzleH, r);
            context.fill();
            context.stroke();
            context.restore();


            // Head (rectangle that narrows toward the top, rounded corners, centered)
            context.fillStyle = '#FFF';
            context.strokeStyle = '#333';
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(headX - headW1 / 2, headBottomY);
            context.lineTo(headX + headW1 / 2, headBottomY);
            context.lineTo(headX + headW2 / 2 + r, headTopY + r);
            context.quadraticCurveTo(headX + headW2 / 2, headTopY, headX + headW2 / 2 - r, headTopY);
            context.lineTo(headX - headW2 / 2 + r, headTopY);
            context.quadraticCurveTo(headX - headW2 / 2, headTopY, headX - headW2 / 2 - r, headTopY + r);
            context.closePath();
            context.fill();
            context.stroke();


            // Body (oval)
            context.fillStyle = '#FFF';
            context.strokeStyle = '#333';
            context.lineWidth = 1;
            context.beginPath();
            context.ellipse(u.x, u.y, bodyRx, bodyRy, 0, 0, Math.PI * 2);
            context.fill();
            context.stroke();

            // Horn (centered on top of the head, narrower and lowered slightly)
            context.fillStyle = u.color;
            context.strokeStyle = strokeForColor(u.color);
            context.lineWidth = 1;
            drawTriangle(context, headX - 3, headTopY + 4, headX + 3, headTopY + 4, headX, headTopY - 16, true);

            // Tail (curved teardrop shape, tip starting at the center of the body oval; swings out when a scoop is picked up)
            context.fillStyle = u.color;
            context.strokeStyle = strokeForColor(u.color);
            context.lineWidth = 1;
            context.save();
            context.translate(u.x, u.y);
            context.rotate(-(Math.PI / 2) * (u.tailSwingTimer / TAIL_SWING_DURATION));
            context.beginPath();
            context.moveTo(0, 0);
            context.quadraticCurveTo(10, 18, 0, 36);
            context.quadraticCurveTo(-10, 18, 0, 0);
            context.closePath();
            context.fill();
            context.stroke();
            context.restore();
        });

        game.player.render();

        // Draw the counter: a 3-layer bar along the bottom of the screen (drawn after the player so it renders in front)
        context.fillStyle = '#6C4F89';
        context.fillRect(0, canvas.height - COUNTER_BASE_H, canvas.width, COUNTER_BASE_H);

        context.fillStyle = '#D9BCF2';
        context.fillRect(0, canvas.height - COUNTER_BASE_H - COUNTER_MID_H, canvas.width, COUNTER_MID_H);

        context.fillStyle = '#F6ECFF';
        context.fillRect(0, COUNTER_TOP_Y, canvas.width, COUNTER_TOP_H);

        game.customers.forEach((c) => c.render());
        if (game.inspector) {
            game.inspector.render();
        }

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
            // Minimum time between spawns from 0.7s to 1.1s, increases the starting interval from 1.8s to 2.4s, and slows the ramp-down rate (divisor 45 → 60), so customers take longer to bunch up even in later rounds.
            spawnInterval = Math.max(1.1, 2.4 - game.elapsed / 60),
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
        game.player.y = Math.max(UNICORN_Y + PLAYER_REACH_Y, Math.min(PLAYER_MAX_Y, game.player.y));

        // Tick down each unicorn's tail swing timer (triggered on scoop pickup)
        UNICORNS.forEach((u) => {
            if (u.tailSwingTimer > 0) {
                u.tailSwingTimer = Math.max(0, u.tailSwingTimer - dt);
            }
        });

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

        // Prevent customers from overlapping the one ahead of them (queue spacing)
        game.customers.sort((a, b) => a.x - b.x);

        for (let i = 1; i < game.customers.length; i += 1) {
            const
                ahead = game.customers[i - 1],
                c = game.customers[i],
                minGap = (c.width + ahead.width) / 2 + 24;

            if (c.x - ahead.x < minGap) {
                c.x = ahead.x + minGap;
            }
        }

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
                game.carrying = [];
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
