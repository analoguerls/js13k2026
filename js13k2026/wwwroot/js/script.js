/* eslint-disable func-style */
/* eslint-disable new-cap */
/* eslint-disable max-lines */
/* eslint-disable max-params */
/* eslint-disable no-extra-parens */
/* eslint-disable no-mixed-operators */
/* eslint-disable sort-vars */
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
import audio from './zzFx.js';

const
    {
        random: rnd,
        max, min,
        hypot, sin,
        ceil,
        floor,
        abs,
        PI
    } = Math,
    {
        canvas,
        context
    } = init(),
    BOUNCE_AMPLITUDE = 3,
    BOUNCE_SPEED = 10,
    BREAK_MESSAGES = ['Your next batch of customers are waiting\nfor their magical treat!', 'More hungry customers incoming.\nGet ready to scoop that poop!', 'Fresh poop. Hungry customers.\nTaste the Rainbow.', 'Business is booming. Unicorns are pooping.\nTime to get scooping!'],
    // Indices: 0 BACKGROUND, 1 CLIPBOARD, 2 CONE, 3 COUNTER_BASE, 4 COUNTER_TOP, 5 FLOOR, 6 GREY, 7 WHITE
    COLORS = [
        '#866F9B',
        '#ad9f85',
        '#E3D0BF',
        '#D9BCF2',
        '#F6ECFF',
        '#6C4F89',
        '#333',
        '#FFF'
    ],
    COUNTER_BASE_H = 30,
    COUNTER_MID_H = 30,
    COUNTER_TOP_H = 21,
    COUNTER_TOP_Y = canvas.height - (COUNTER_BASE_H + COUNTER_MID_H + COUNTER_TOP_H),
    COUNTER_Y = canvas.height - 21,
    DELIVER_R = 42,
    // Path builders for each facial expression, keyed by expression name; 'neutral' is the default fallback
    FACES = {
        annoyed (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r) {
            ctx.moveTo(-eyeOffsetX - eyeR, eyeY - eyeR);
            ctx.lineTo(-eyeOffsetX + eyeR, eyeY - eyeR * 0.2);
            ctx.moveTo(eyeOffsetX + eyeR, eyeY - eyeR);
            ctx.lineTo(eyeOffsetX - eyeR, eyeY - eyeR * 0.2);
            ctx.moveTo(-mouthW * 0.6, mouthY);
            ctx.lineTo(mouthW * 0.6, mouthY + r * 0.25);
        },
        content (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r) {
            ctx.moveTo(-mouthW * 0.7, mouthY - r * 0.1);
            ctx.quadraticCurveTo(0, mouthY + r * 0.15, mouthW * 0.7, mouthY - r * 0.1);
        },
        delighted (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r) {
            ctx.arc(0, mouthY - r * 0.15, mouthW, 0.1 * PI, 0.9 * PI);
            ctx.closePath();
        },
        happy (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r) {
            ctx.arc(0, mouthY - r * 0.25, mouthW * 0.8, 0.15 * PI, 0.85 * PI);
        },
        neutral (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY) {
            ctx.moveTo(-mouthW * 0.6, mouthY);
            ctx.lineTo(mouthW * 0.6, mouthY);
        },
        unhappy (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r) {
            ctx.arc(0, mouthY + r * 0.35, mouthW * 0.7, 1.15 * PI, 1.85 * PI);
        }
    },
    INSPECTOR_CATCH_R = 24,
    INSPECTOR_COOLDOWN = 20,
    PICKUP_R = 42,
    PLAYER_MAX_Y = COUNTER_TOP_Y + 24,
    PLAYER_REACH_Y = 60,
    PLAYER_SPEED = 260,
    RAINBOW = [
        // [fill, stroke]
        ['#FAA', '#F00'],
        ['#FCA', '#FA0'],
        ['#FFA', '#FF0'],
        ['#AFA', '#080'],
        ['#AAF', '#00F'],
        ['#CAF', '#408'],
        ['#DBF', '#93E']
    ],
    SQUISH_LERP = 0.2,
    TAIL_SWING_DURATION = 0.5,
    UNICORNS = RAINBOW.map((color, i) => ({
        color,
        idleTimer: rnd() * 10,
        speedMult: 0.7 + rnd() * 0.6,
        squishX: 1,
        squishY: 1,
        tailSwingTimer: 0,
        x: 80 + i * 70,
        y: 90
    })),
    UNICORN_Y = 90,
    // Shared factory for UI text entries: defaults to white fill + centered anchor
    uiText = (opts) => Text({
        anchor: {
            x: 0.5,
            y: 0.5
        },
        color: COLORS[7],
        ...opts
    }),
    game = {
        loop: null,
        muted: false,
        started: false,
        ui: {
            break: uiText({
                font: '28px monospace',
                text: BREAK_MESSAGES[0],
                textAlign: 'center',
                width: canvas.width - 60,
                x: canvas.width / 2,
                y: canvas.height / 2
            }),
            highScore: uiText({
                anchor: {
                    x: 1,
                    y: 0
                },
                font: '21px monospace',
                text: 'Best $0',
                x: canvas.width - 10,
                y: 10
            }),
            over: uiText({
                font: '30px monospace',
                text: 'That\'s one way to flush a career\nPress N to scoop again',
                x: canvas.width / 2,
                y: canvas.height / 2
            }),
            score: uiText({
                anchor: {
                    x: 0,
                    y: 0
                },
                font: '21px monospace',
                text: '$0',
                x: 10,
                y: 10
            }),
            splash: uiText({
                font: '30px monospace',
                text: 'Grab a cone and get ready to scoop\nPress N to start',
                textAlign: 'center',
                x: canvas.width / 2,
                y: canvas.height / 2
            })
        }
    },
    // Music controller to manage background music playback
    music = (function () {
        let player = null;

        return {
            start () {
                if (player) {
                    player.start();
                } else {
                    player = audio.zzfxP(...audio.song);
                    player.loop = true;
                }
            },
            stop () {
                player.stop();
                player = null;
            }
        };
    }()),
    soundFx = (effect) => {
        if (audio[effect]) {
            audio.zzfxP(audio[effect]);
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

// Clamps a value between min and max
function clamp (v, lo, hi) {
    return max(lo, min(hi, v));
}

// Decrements entity[key] by dt, clamped at 0
function tickDown (entity, key, dt) {
    entity[key] = max(0, entity[key] - dt);
}

// Fills then strokes the current path
function fillStroke (ctx) {
    ctx.fill();
    ctx.stroke();
}

// Returns the current gamepad axis value, or 0 if no gamepad is connected
function axis (name) {
    return cachedGamepadIndex >= 0 ? gamepadAxis(name, cachedGamepadIndex) : 0;
}

// Returns the rainbow color pair [fill, stroke] for the current round
function roundColor () {
    return RAINBOW[(game.round - 1) % RAINBOW.length];
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
    fillStroke(ctx);
}

// Draws a circle at (x, y) with radius r on the given context, optionally stroking it
function drawCircle (ctx, x, y, r, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, PI * 2);
    ctx.fill();

    if (stroke) {
        ctx.stroke();
    }
}

// Draws a simple poop-emoji shape: three stacked tapering lobes with a swirl tip, filled with a single outer-border stroke (no seams between lobes)
function drawPoop (ctx, x, y, r) {
    const
        {
            beginPath,
            moveTo,
            ellipse,
            quadraticCurveTo,
            stroke,
            fill
        } = ctx,
        drawLobes = () => {
            moveTo.call(ctx, x + r * 1.1, y + r * 0.9);
            ellipse.call(ctx, x, y + r * 0.9, r * 1.1, r * 0.55, 0, 0, PI * 2);
            moveTo.call(ctx, x + r * 0.85, y + r * 0.1);
            ellipse.call(ctx, x, y + r * 0.1, r * 0.85, r * 0.5, 0, 0, PI * 2);
            moveTo.call(ctx, x + r * 0.55, y - r * 0.6);
            ellipse.call(ctx, x, y - r * 0.6, r * 0.55, r * 0.4, 0, 0, PI * 2);
            moveTo.call(ctx, x + r * 0.15, y - r * 1.1);
            quadraticCurveTo.call(ctx, x + r * 0.5, y - r * 1.3, x, y - r * 1.5);
        };

    // Wide stroke first (color's stroke, drawn thick) so only the outermost edge remains visible once the fill covers the seams
    ctx.save();
    ctx.lineWidth = 2;
    beginPath.call(ctx);
    drawLobes();
    stroke.call(ctx);
    ctx.restore();

    // Fill on top hides the internal seam strokes, leaving only the outer border visible
    beginPath.call(ctx);
    drawLobes();
    fill.call(ctx);
}

// Strokes an arm path (shoulder -> elbow -> hand) using the current strokeStyle/lineWidth
function strokeArmPath (ctx, armX, armY, elbowX, elbowY) {
    ctx.beginPath();
    ctx.moveTo(armX, armY - 7);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(armX, armY + 9);
    ctx.stroke();
}

// Sets fill/stroke/lineWidth
function setColorStyle (ctx, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
}

// Draws a vertical stack of colored, stroked dots starting at yBase and moving up by step per entry
function drawIceCreamScoops (ctx, colors, yBase, step, r, xBase = 0) {
    colors.forEach(([fill, stroke], i) => {
        setColorStyle(ctx, fill, stroke);
        drawCircle(ctx, xBase, yBase - i * step, r, true);
    });
}

// Draws simple eyes and a mouth matching an emoticon-style expression (":)", ":D", ":}", ":|", ":(")
function drawFace (ctx, y, r, expression) {
    const
        {
            beginPath,
            arc,
            fill,
            stroke
        } = ctx,
        eyeOffsetX = r * 0.4,
        eyeR = max(1, r * 0.12),
        eyeY = y - r * 0.15,
        mouthW = r * 0.45,
        mouthY = y + r * 0.25;

    ctx.fillStyle = COLORS[6];
    beginPath.call(ctx);
    arc.call(ctx, -eyeOffsetX, eyeY, eyeR, 0, PI * 2);
    arc.call(ctx, eyeOffsetX, eyeY, eyeR, 0, PI * 2);
    fill.call(ctx);

    ctx.strokeStyle = COLORS[6];
    ctx.lineWidth = 1.5;
    beginPath.call(ctx);

    (FACES[expression] || FACES.neutral)(ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r);

    stroke.call(ctx);
}

// Computes shared body/head layout metrics for a person shape sized to fit within width/height
function personLayout (width, height) {
    const headR = 12,
        bodyH = height - headR * 2,
        bodyRx = width / 2,
        bodyRy = bodyH / 2,
        headOverlap = 8,
        bodyCenterY = height / 2 - bodyRy,
        headCenterY = bodyCenterY - bodyRy - headR + headOverlap;

    return {
        bodyCenterY,
        bodyRx,
        bodyRy,
        headCenterY,
        headR
    };
}

// Draws a person shape (oval body + circle head) sized to fit within width/height, returns head position for further drawing
function drawPerson (ctx, width, height, color, stroke, expression) {
    const
        {
            bodyCenterY,
            bodyRx,
            bodyRy,
            headCenterY,
            headR
        } = personLayout(width, height),
        {
            beginPath,
            ellipse,
            arc
        } = ctx;

    setColorStyle(ctx, color, stroke || COLORS[6]);

    beginPath.call(ctx);
    ellipse.call(ctx, 0, bodyCenterY, bodyRx, bodyRy, 0, 0, PI * 2);
    fillStroke(ctx);

    beginPath.call(ctx);
    arc.call(ctx, 0, headCenterY, headR, 0, PI * 2);
    fillStroke(ctx);

    drawFace(ctx, headCenterY, headR, expression);

    return {
        headCenterY,
        headR
    };
}

// Draws a triangle from three points on the given context, optionally stroking it
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

// Draws a simple fez (wide at the base, narrower at the top, flat top, with a tassel)
function drawSodaJerkHat (ctx, headCenterY, headR) {
    const
        baseW = headR * 1.6,
        hatH = headR * 0.9,
        hatTopY = headCenterY - headR - hatH,
        hatY = headCenterY - headR,
        topW = headR * 1.1,
        {
            beginPath,
            moveTo,
            lineTo,
            quadraticCurveTo,
            stroke
        } = ctx;

    setColorStyle(ctx, COLORS[7], COLORS[6]);

    beginPath.call(ctx);
    moveTo.call(ctx, -baseW / 2, hatY);
    lineTo.call(ctx, -topW / 2, hatTopY);
    lineTo.call(ctx, topW / 2, hatTopY);
    lineTo.call(ctx, baseW / 2, hatY);
    ctx.closePath();
    fillStroke(ctx);

    ctx.strokeStyle = roundColor()[1];
    ctx.lineWidth = 1;

    beginPath.call(ctx);
    moveTo.call(ctx, -baseW / 2, hatY);
    quadraticCurveTo.call(ctx, 0, (hatY + hatTopY) / 2, 0, hatTopY);
    stroke.call(ctx);

    beginPath.call(ctx);
    moveTo.call(ctx, baseW / 2, hatY);
    quadraticCurveTo.call(ctx, 0, (hatY + hatTopY) / 2, 0, hatTopY);
    stroke.call(ctx);
}

// Draws a bow tie (two triangles + a center knot) just below the head
function drawBowTie (ctx, headCenterY, headR) {
    const
        color = roundColor(),
        knotR = headR * 0.15 + 1,
        tieH = headR * 0.75,
        tieW = headR * 0.6,
        tieY = headCenterY + headR * 1.1,
        {
            beginPath,
            arc,
            fill
        } = ctx;

    setColorStyle(ctx, color[0], color[1]);

    drawTriangle(ctx, -knotR, tieY, -knotR - tieW, tieY - tieH / 2, -knotR - tieW, tieY + tieH / 2, true);
    drawTriangle(ctx, knotR, tieY, knotR + tieW, tieY - tieH / 2, knotR + tieW, tieY + tieH / 2, true);

    ctx.fillStyle = color[1];
    beginPath.call(ctx);
    arc.call(ctx, 0, tieY, knotR, 0, PI * 2);
    fill.call(ctx);
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
        roundColor: RAINBOW[0],
        score: 0,
        served: 0,
        spills: [],
        target: 7
    };
}

// Reads the stored high score, updates it if beaten, and refreshes the UI text
function updateHighScore () {
    const stored = getStoreItem('unicorn_poop') || 0;

    if (game.score > stored) {
        setStoreItem('unicorn_poop', game.score);
    }

    game.ui.highScore.text = `Best $${max(stored, game.score)}`;
}

// Clamps score to a minimum of 0, updates the score UI text, and refreshes the high score
function setScore (value) {
    game.score = max(0, value);
    game.ui.score.text = `$${game.score}`;
    updateHighScore();
}

// Advances/decays a paused-vs-moving timer on an entity, toggling `paused` and picking a new random duration
function tickPauseTimer (entity, dt, pausedMin, pausedRange, moveMin, moveRange) {
    entity.moveTimer -= dt;

    if (entity.moveTimer <= 0) {
        entity.paused = !entity.paused;
        entity.moveTimer = entity.paused
            ? pausedMin + rnd() * pausedRange
            : moveMin + Number(rnd()) * moveRange;
    }
}

// Advances an entity's idle timer and lerps its squishX/squishY toward a sinusoidal jiggle
function updateSquish (entity, dt, amp, speedMult = 1) {
    entity.idleTimer += dt;

    const jiggle = sin(entity.idleTimer * BOUNCE_SPEED * speedMult) * amp;

    entity.squishX += (1 - jiggle - entity.squishX) * SQUISH_LERP;
    entity.squishY += (1 + jiggle - entity.squishY) * SQUISH_LERP;
}

function advanceRound () {
    game.round += 1;
    game.served = 0;
    game.target = min(game.round * 7, 70);

    game.maxAtOnce = min(3 + (game.round - 1) * 2, 14);

    game.customers = [];
    game.inspector = null;
    game.inspectorCooldown = INSPECTOR_COOLDOWN;
    game.onBreak = true;
    game.breakTimer = 7;
    game.roundColor = roundColor();
    game.ui.break.text = BREAK_MESSAGES[floor(rnd() * BREAK_MESSAGES.length)];
}

function dist (a, b) {
    return hypot(a.x - b.x, a.y - b.y);
}

// Dumps one carried scoop at a time, charging $1 per scoop (clamped at 0)
function dumpScoop () {
    if (game.over || !game.carrying.length) {
        return;
    }

    game.spills.push({
        color: game.carrying.pop(),
        x: game.player.x,
        y: game.player.y
    });
    setScore(game.score - 1);
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

// Starts the game on first press, or restarts it from the beginning after game over
function restart () {
    if (!game.started) {
        game.started = true;
        if (!game.muted) {
            music.start();
        }
    } else if (game.over) {
        resetGame();
    }
}

// Returns n unique random colors from the palette (no repeats within an order)
function pickWantColors (n) {
    const
        colors = [],
        pool = [...RAINBOW];

    for (let i = 0; i < n; i += 1) {
        const idx = floor(rnd() * pool.length);

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
        return 1 + floor(rnd() * 2);
    }

    return 1 + floor(rnd() * 3);
}

// Returns true if two color arrays match exactly, including order
function sameColors (a, b) {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((c, i) => c === b[i]);
}

/*
 * Customer walking speed tuning:
 * - Base speed: random between BASE_MIN and BASE_MIN + BASE_RANGE px/sec.
 * - multiplier: grows 10% per round past round 1, capped at round 10 (max +100%).
 *   Adjust the 0.1 step to change ramp-up rate per round.
 *   Adjust min(..., 9) to change the round at which speed scaling caps.
 */
function spawnCustomer () {
    const
        height = 60 + rnd() * 18,
        multiplier = 1 + 0.1 * min(game.round - 1, 9),
        speed = (35 + rnd() * 20) * multiplier,
        wants = pickWantColors(rollScoopCount());

    game.customers.push(Sprite({
        anchor: {
            x: 0.5,
            y: 0.5
        },
        annoyedTimer: 0,
        bouncePhase: 0,
        color: COLORS[7],
        dx: -speed,
        height,
        moveTimer: 0.5 + Number(rnd()),
        paused: false,
        render () {
            const progress = ((canvas.width + 20) - this.x) / (canvas.width + 40);

            this.context.save();
            this.context.translate(0, -abs(sin(this.bouncePhase)) * BOUNCE_AMPLITUDE);
            // eslint-disable-next-line no-nested-ternary
            drawPerson(this.context, this.width, this.height, this.color, COLORS[6], this.annoyedTimer > 0 ? 'annoyed' : progress < 0.33 ? 'content' : progress < 0.66 ? 'neutral' : 'unhappy');

            // Draw a word balloon above the customer showing their desired flavor(s)
            // eslint-disable-next-line one-var
            const
                ballR = 6,
                balloonW = 28,
                gap = 6,
                orderColors = this.want,
                padding = 10,
                spacing = 16,
                balloonH = padding * 2 + (orderColors.length - 1) * spacing,
                balloonY = -this.height / 2 - gap - balloonH / 2;

            setColorStyle(this.context, COLORS[7], COLORS[6]);
            drawBalloon(this.context, 0, balloonY, balloonW, balloonH);

            drawIceCreamScoops(this.context, orderColors, balloonY + balloonH / 2 - padding, spacing, ballR);
            this.context.restore();
        },
        served: false,
        want: wants,
        width: 26,
        x: canvas.width + 20,
        y: COUNTER_Y
    }));
}

// Toggles background music on/off, preserving playback position when unmuted later
function toggleMute () {
    game.muted = !game.muted;

    if (game.muted) {
        music.stop();
    } else if (game.started) {
        music.start();
    }
}

function tryAction () {
    if (game.over) {
        return;
    }

    if (game.carrying.length) {
        const
            target = game.customers.find((c) => !c.served && sameColors(c.want, game.carrying) && dist(game.player, c) < DELIVER_R),
            wrongTarget = game.customers.find((c) => !c.served && dist(game.player, c) < DELIVER_R);

        if (target) {
            const payout = {
                1: 3,
                2: 6,
                3: 9
            }[game.carrying.length] || 0;

            target.served = true;
            game.carrying = [];
            game.player.deliverTimer = 2.5;
            game.served += 1;
            setScore(game.score + payout);

            if (game.served >= game.target) {
                advanceRound();
            }

            return;
        }

        if (wrongTarget) {
            wrongTarget.annoyedTimer = 2.5;
        }
    }

    const unicorn = UNICORNS.find((u) => dist({
        x: game.player.x,
        y: game.player.y - PLAYER_REACH_Y
    }, u) < PICKUP_R);

    if (unicorn && game.carrying.length < 3) {
        game.carrying.push(unicorn.color);
        unicorn.tailSwingTimer = TAIL_SWING_DURATION;
        soundFx('scoop');
    }
}

/*
 * Health inspector mechanic tuning:
 * - Only spawns from round 2 onward (game.round > 1).
 * - After appearing (or after the round starts), waits INSPECTOR_COOLDOWN
 *   seconds before it's allowed to appear again.
 * - Random appearance: each frame there's a small chance to trigger once
 *   cooldown has expired, so appearance timing within the round is unpredictable.
 * - Zig-zags top-to-bottom across the screen, bouncing between the same
 *   y bounds the player is clamped to, reversing horizontal direction once
 *   it reaches the far side and exiting only after the return trip.
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

    // Small per-frame chance to appear once cooldown has expired; more likely if scoops are on the floor
    if (rnd() < 0.01 + game.spills.length * 0.01) {
        game.inspector = Sprite({
            anchor: {
                x: 0.5,
                y: 0.5
            },
            annoyedTimer: 0,
            baseSpeed: 110,
            dirX: 1,
            height: 72,
            moveTimer: 0.5 + Number(rnd()),
            paused: false,
            render () {
                const {
                        headCenterY,
                        headR
                    } = drawPerson(this.context, this.width, this.height, COLORS[7], COLORS[6], this.annoyedTimer > 0 ? 'annoyed' : 'neutral'),
                    ctx = this.context,
                    {
                        bodyRx,
                        bodyRy
                    } = personLayout(this.width, this.height),
                    bodyCenterY = headCenterY + headR + bodyRy - 8,
                    armX = -bodyRx * 0.7 * this.dirX,
                    armY = bodyCenterY - bodyRy * 0.15 - 4,
                    elbowX = armX - 11 * this.dirX,
                    elbowY = armY + 10;

                // Clipboard drawn on its side and centered on the elbow, mirrored to face the direction of travel
                ctx.save();
                ctx.translate(elbowX + 4 * this.dirX, elbowY - 4);
                ctx.rotate(0.15 * this.dirX);
                setColorStyle(ctx, COLORS[1], COLORS[6]);
                ctx.fillRect(-9, -5, 18, 10);
                ctx.strokeRect(-9, -5, 18, 10);
                ctx.restore();

                // Arm drawn last so the clipboard can appear tucked over it
                ctx.lineJoin = 'round';
                ctx.strokeStyle = COLORS[6];
                ctx.lineWidth = 5;
                strokeArmPath(ctx, armX, armY, elbowX, elbowY);

                ctx.strokeStyle = COLORS[7];
                ctx.lineWidth = 3;
                strokeArmPath(ctx, armX, armY, elbowX, elbowY);
            },
            vSpeed: 80 + rnd() * 60,
            width: 26,
            x: -20,
            y: rnd() < 0.5 ? UNICORN_Y + PLAYER_REACH_Y : PLAYER_MAX_Y,
            yDir: rnd() < 0.5 ? 1 : -1
        });
    }
}

// Setup controls: pairs of [key, gamepad button, handler]
[['n', 'start', restart], ['space', 'south', tryAction], ['x', 'west', dumpScoop], ['m', 'north', toggleMute]].forEach(([key, pad, fn]) => {
    onKey(key, fn);
    onGamepad(pad, fn);
});

// Resets the game state and starts a new round
Object.assign(game, initialState());
updateHighScore();

// Create the player sprite
game.player = Sprite({
    anchor: {
        x: 0.5,
        y: 0.5
    },
    color: COLORS[7],
    deliverTimer: 0,
    height: 72,
    idleTimer: 0,
    render () {
        const bounceY = this.idleTimer ? sin(this.idleTimer * BOUNCE_SPEED) * BOUNCE_AMPLITUDE : 0;

        this.context.save();
        this.context.translate(0, bounceY);
        this.context.scale(this.squishX, this.squishY);

        // eslint-disable-next-line one-var
        const {
            headCenterY,
            headR
        } = drawPerson(this.context, this.width, this.height, this.color, COLORS[6], this.deliverTimer > 0 ? 'delighted' : 'happy');

        drawSodaJerkHat(this.context, headCenterY, headR);
        drawBowTie(this.context, headCenterY, headR);

        if (game.carrying.length) {
            const
                coneGap = 10,
                coneH = 22,
                coneW = 8,
                coneX = this.width / 2 + 12,
                coneY = headCenterY + headR + coneGap + coneH - 6;

            this.context.fillStyle = COLORS[2];
            this.context.beginPath();
            this.context.moveTo(coneX - coneW, coneY - coneH);
            this.context.lineTo(coneX + coneW, coneY - coneH);
            this.context.lineTo(coneX, coneY);
            this.context.closePath();
            this.context.fill();

            drawIceCreamScoops(this.context, game.carrying, coneY - coneH - 6, 14, 8, coneX);
        }

        this.context.restore();
    },
    squishX: 1,
    squishY: 1,
    width: 26,
    x: canvas.width / 2,
    y: (UNICORN_Y + COUNTER_Y) / 2
});

// Start the game loop
game.loop = GameLoop({
    render () {
        if (!game.started) {
            context.fillStyle = COLORS[0];
            context.fillRect(0, 0, canvas.width, canvas.height);
            game.ui.splash.render();

            return;
        }
        context.fillStyle = COLORS[0];
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw dumped scoops left behind on the floor
        game.spills.forEach((s) => {
            setColorStyle(context, ...s.color);
            drawPoop(context, s.x, s.y, 6);
        });

        // Draw the unicorns
        UNICORNS.forEach((u) => {
            const
                bodyRx = 24,
                bodyRy = 16,
                headBottomY = u.y - 6,
                headTopY = u.y - 40,
                headW1 = 14,
                headW2 = 8,
                headX = u.x,
                eyeR = 2,
                eyeX = headX + 3.3,
                eyeY = headTopY + (headBottomY - headTopY) * 0.3,
                muzzleBaseW = 12,
                muzzleTipW = 9,
                muzzleH = 21,
                muzzleX = headX + headW1 / 2 - 6,
                muzzleY = headTopY + (headBottomY - headTopY) * 0.18,
                r = 3;

            context.save();
            context.translate(u.x, u.y);
            context.scale(u.squishX, u.squishY);
            context.translate(-u.x, -u.y);

            // Head (rectangle that narrows toward the top, rounded corners, centered) - drawn first so muzzle can overlay its edge seamlessly
            setColorStyle(context, COLORS[7], COLORS[6]);
            context.beginPath();
            context.moveTo(headX - headW1 / 2, headBottomY);
            context.lineTo(headX + headW1 / 2, headBottomY);
            context.lineTo(headX + headW2 / 2 + r, headTopY + r);
            context.quadraticCurveTo(headX + headW2 / 2, headTopY, headX + headW2 / 2 - r, headTopY);
            context.lineTo(headX - headW2 / 2 + r, headTopY);
            context.quadraticCurveTo(headX - headW2 / 2, headTopY, headX - headW2 / 2 - r, headTopY + r);
            context.closePath();
            fillStroke(context);

            // Muzzle (small rectangle tilted so its right edge slopes down, drawn on top of the head with no stroke so it merges seamlessly)
            context.fillStyle = COLORS[7];
            context.save();
            context.translate(muzzleX, muzzleY);
            context.rotate(-PI / 4);
            context.beginPath();
            context.moveTo(-muzzleBaseW / 2 + r, 0);
            context.lineTo(muzzleBaseW / 2 - r, 0);
            context.quadraticCurveTo(muzzleBaseW / 2, 0, muzzleBaseW / 2, r);
            context.lineTo(muzzleTipW / 2, muzzleH - r);
            context.quadraticCurveTo(muzzleTipW / 2, muzzleH, muzzleTipW / 2 - r, muzzleH);
            context.lineTo(-muzzleTipW / 2 + r, muzzleH);
            context.quadraticCurveTo(-muzzleTipW / 2, muzzleH, -muzzleTipW / 2, muzzleH - r);
            context.lineTo(-muzzleBaseW / 2, r);
            context.quadraticCurveTo(-muzzleBaseW / 2, 0, -muzzleBaseW / 2 + r, 0);
            context.closePath();
            context.fill();
            context.fill();
            context.restore();

            // Eye (simple filled circle normally; squints to an X while the tail swing animation is active, i.e. when carrying a scoop)
            if (u.tailSwingTimer > 0) {
                context.strokeStyle = COLORS[6];
                context.lineWidth = 1;
                context.beginPath();
                context.moveTo(eyeX - eyeR, eyeY - eyeR);
                context.lineTo(eyeX + eyeR, eyeY);
                context.lineTo(eyeX - eyeR, eyeY + eyeR);
                context.stroke();
            } else {
                context.fillStyle = COLORS[6];
                context.beginPath();
                context.arc(eyeX, eyeY, eyeR, 0, PI * 2);
                context.fill();
            }

            // Body (oval)
            setColorStyle(context, COLORS[7], COLORS[6]);
            context.beginPath();
            context.ellipse(u.x, u.y, bodyRx, bodyRy, 0, 0, PI * 2);
            fillStroke(context);

            // Horn (centered on top of the head, narrower and lowered slightly)
            setColorStyle(context, ...u.color);
            drawTriangle(context, headX - 3, headTopY + 4, headX + 3, headTopY + 4, headX, headTopY - 16, true);

            // Tail (curved teardrop shape, tip starting at the center of the body oval; swings out when a scoop is picked up)
            setColorStyle(context, ...u.color);
            context.save();
            context.translate(u.x, u.y);
            context.rotate(-(PI / 2) * (u.tailSwingTimer / TAIL_SWING_DURATION));
            context.beginPath();
            context.moveTo(0, 0);
            context.quadraticCurveTo(15, 15, 0, 42);
            context.quadraticCurveTo(-15, 15, 0, 0);
            context.closePath();
            fillStroke(context);
            context.restore();
            context.restore();
        });

        game.player.render();
        if (game.inspector) {
            game.inspector.render();
        }

        // Draw the counter: a 3-layer bar along the bottom of the screen (drawn after the player so it renders in front)
        context.fillStyle = COLORS[5];
        context.fillRect(0, canvas.height - COUNTER_BASE_H, canvas.width, COUNTER_BASE_H);

        context.fillStyle = COLORS[3];
        context.fillRect(0, canvas.height - COUNTER_BASE_H - COUNTER_MID_H, canvas.width, COUNTER_MID_H);

        context.fillStyle = COLORS[4];
        context.fillRect(0, COUNTER_TOP_Y, canvas.width, COUNTER_TOP_H);

        game.customers.forEach((c) => c.render());

        game.ui.score.render();
        game.ui.highScore.render();

        if (game.over) {
            game.ui.over.render();
        } else if (game.onBreak) {
            game.ui.break.render();
        }
    },
    update (dt) {
        if (!game.started || game.over) {
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
            spawnInterval = max(1.1, 2.4 - game.elapsed / 60),
            stickX = axis('leftstickx'),
            stickY = axis('leftsticky');

        if (abs(stickX) > DEADZONE) {
            dx += stickX;
        }
        if (abs(stickY) > DEADZONE) {
            dy += stickY;
        }

        if (dx || dy) {
            const len = hypot(dx, dy);

            game.player.x += (dx / len) * PLAYER_SPEED * dt;
            game.player.y += (dy / len) * PLAYER_SPEED * dt;
        }

        game.player.x = clamp(game.player.x, 20, canvas.width - 20);
        game.player.y = clamp(game.player.y, UNICORN_Y + PLAYER_REACH_Y, PLAYER_MAX_Y);

        // Jiggle physics: continuous sinusoidal squish, amplified while moving
        updateSquish(game.player, dt, dx || dy ? 0.1 : 0.04);

        if (game.player.deliverTimer > 0) {
            tickDown(game.player, 'deliverTimer', dt);
        }

        // Tick down each unicorn's tail swing timer (triggered on scoop pickup) and update its idle squish/wiggle
        UNICORNS.forEach((u) => {
            if (u.tailSwingTimer > 0) {
                tickDown(u, 'tailSwingTimer', dt);
            }

            updateSquish(u, dt, 0.04, u.speedMult);
        });

        spawnTimer += dt;
        game.elapsed += dt;

        if (game.customers.length < game.maxAtOnce && spawnTimer > spawnInterval) {
            spawnTimer = 0;
            spawnCustomer();
        }

        // Move customers, with occasional pauses
        game.customers.forEach((c) => {
            tickPauseTimer(c, dt, 1.2, 1.8, 0.4, 0.8);

            if (c.annoyedTimer > 0) {
                tickDown(c, 'annoyedTimer', dt);
            }

            if (c.paused) {
                c.bouncePhase = 0;
            } else {
                c.x += c.dx * dt;
                c.bouncePhase += dt * BOUNCE_SPEED;
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

            tickPauseTimer(inspector, dt, 1, 1.5, 0.6, 1);

            if (inspector.annoyedTimer > 0) {
                tickDown(inspector, 'annoyedTimer', dt);
            }

            if (!inspector.paused) {
                // Speed up if the player is ahead of the inspector in its direction of travel
                const
                    aheadInTravelDir = inspector.dirX === 1 ? game.player.x > inspector.x : game.player.x < inspector.x,
                    chaseSpeed = aheadInTravelDir ? inspector.baseSpeed * 1.8 : inspector.baseSpeed;

                inspector.x += chaseSpeed * inspector.dirX * dt;
                inspector.y += inspector.vSpeed * inspector.yDir * dt;

                if (inspector.y <= UNICORN_Y + PLAYER_REACH_Y) {
                    inspector.y = UNICORN_Y + PLAYER_REACH_Y;
                    inspector.yDir = 1;
                } else if (inspector.y >= PLAYER_MAX_Y) {
                    inspector.y = PLAYER_MAX_Y;
                    inspector.yDir = -1;
                }
            }

            // Fine the player $3 if the inspector steps on a dumped scoop, and confiscate it
            game.spills = game.spills.filter((s) => {
                if (dist(inspector, s) >= INSPECTOR_CATCH_R) {
                    return true;
                }

                setScore(game.score - 3);
                inspector.annoyedTimer = 2 + rnd();

                return false;
            });

            // Catch the player: fine them 10% and confiscate their carried scoop
            if (dist(game.player, inspector) < INSPECTOR_CATCH_R) {
                game.carrying = [];
                setScore(ceil(game.score * 0.9));

                game.inspector = null;
                game.inspectorCooldown = INSPECTOR_COOLDOWN;
            } else if (inspector.dirX === 1 && inspector.x > canvas.width + 20) {
                // Reached the far side: turn around and head back
                inspector.dirX = -1;
            } else if (inspector.dirX === -1 && inspector.x < -20) {
                // Completed the return trip without catching anyone
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
