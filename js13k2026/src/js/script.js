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
} from '../../node_modules/kontra/kontra';
import audio from './zzFx.js';

const
    {
        random: rnd,
        max, min,
        hypot, sin, cos, atan2,
        floor,
        abs,
        PI
    } = Math,
    TAU = PI * 2,
    {
        canvas,
        context
    } = init(),
    BOUNCE_AMPLITUDE = 3,
    BOUNCE_SPEED = 10,
    BREAK_MESSAGES = ['HUNGRY CUSTOMERS INCOMING. GET READY TO SCOOP THAT POOP!', 'FRESH POOP. HUNGRY CUSTOMERS. TASTE THE RAINBOW.', 'BUSINESS IS BOOMIN’ UNICORNS ARE POOPIN’ TIME TO GET SCOOPIN’'],
    // Indices: 0 BACKGROUND, 1 CLIPBOARD, 2 CONE, 3 COUNTER_BASE, 4 COUNTER_TOP, 5 FLOOR, 6 GREY, 7 WHITE, 8 BLACK
    COLORS = [
        '#866F9B',
        '#ad9f85',
        '#DAB592',
        '#D9BCF2',
        '#F6ECFF',
        '#6C4F89',
        '#666',
        '#FFF',
        '#000'
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
    CONTAMINATED_COLOR = ['#8B5A2B', '#4A2E12'],
    FLY_CATCH_R = 6,
    FLY_COOLDOWN = 15,
    FLY_DOT_COUNT = 7,
    FLY_HOVER_TIME = 3,
    FLY_MIN_ROUND = 3,
    FLY_SPEED = 70,
    GAME_OVER_DURATION = 12,
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
    SPLASH_SCOOP_COLOR = RAINBOW[floor(rnd() * RAINBOW.length)],
    SQUISH_LERP = 0.2,
    STORAGE_KEY = 'js13kpoopnscoop',
    TAIL_SWING_DURATION = 0.5,
    UNICORN_Y = 110,
    UNICORNS = RAINBOW.map((color, i) => ({
        color,
        idleTimer: rnd() * 10,
        speedMult: 0.7 + rnd() * 0.6,
        squishX: 1,
        squishY: 1,
        tailSwingTimer: 0,
        x: 140 + i * 70,
        y: UNICORN_Y
    })),
    // Shared factory for UI text entries: defaults to white fill + centered anchor
    uiText = (opts) => Text({
        anchor: {
            x: 0.5,
            y: 0.5
        },
        color: COLORS[7],
        font: '15px monospace',
        textAlign: 'center',
        width: canvas.width - 20,
        x: canvas.width / 2,
        y: canvas.height - COUNTER_BASE_H / 2,
        ...opts
    }),
    game = {
        loop: null,
        muted: false,
        started: false,
        ui: {
            break: uiText({
                text: BREAK_MESSAGES[0]
            }),
            over: uiText({
                text: 'THAT’S ONE WAY TO FLUSH A CAREER! PRESS N TO SCOOP AGAIN'
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
                if (player) {
                    player.stop();
                }
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
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    if (stroke) {
        ctx.stroke();
    }
}

// Draws a simple poop-emoji shape: three stacked tapering lobes with a swirl tip, filled with a single outer-border stroke (no seams between lobes)
function drawPoop (ctx, x, y, r) {
    const drawLobes = () => {
        ctx.moveTo(x + r * 1.1, y + r * 0.9);
        ctx.ellipse(x, y + r * 0.9, r * 1.1, r * 0.55, 0, 0, TAU);
        ctx.moveTo(x + r * 0.85, y + r * 0.1);
        ctx.ellipse(x, y + r * 0.1, r * 0.85, r * 0.5, 0, 0, TAU);
        ctx.moveTo(x + r * 0.55, y - r * 0.6);
        ctx.ellipse(x, y - r * 0.6, r * 0.55, r * 0.4, 0, 0, TAU);
        ctx.moveTo(x + r * 0.15, y - r * 1.1);
        ctx.quadraticCurveTo(x + r * 0.5, y - r * 1.3, x, y - r * 1.5);
    };

    // Wide stroke first (color's stroke, drawn thick) so only the outermost edge remains visible once the fill covers the seams
    ctx.save();
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawLobes();
    ctx.stroke();
    ctx.restore();

    // Fill on top hides the internal seam strokes, leaving only the outer border visible
    ctx.beginPath();
    drawLobes();
    ctx.fill();
}

// Draws a striped red/white canopy across the top of the screen, made of alternating tabs rounded at the bottom
function drawCanopy (ctx, width, tabCount = 20, straightH = 34, roundH = 14) {
    const
        tabW = width / tabCount,
        r = tabW / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    for (let i = 0; i < tabCount; i += 1) {
        const x = i * tabW;

        ctx.fillStyle = i % 2 === 0 ? roundColor()[0] : COLORS[7];
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + tabW, 0);
        ctx.lineTo(x + tabW, straightH);
        ctx.lineTo(x + tabW, straightH + roundH - r);
        ctx.arc(x + tabW / 2, straightH + roundH - r, r, 0, PI);
        ctx.lineTo(x, straightH);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
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
        eyeOffsetX = r * 0.4,
        eyeR = max(1, r * 0.12),
        eyeY = y - r * 0.15,
        mouthW = r * 0.45,
        mouthY = y + r * 0.25;

    ctx.fillStyle = COLORS[6];
    ctx.beginPath();
    ctx.arc(-eyeOffsetX, eyeY, eyeR, 0, TAU);
    ctx.arc(eyeOffsetX, eyeY, eyeR, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = COLORS[6];
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    (FACES[expression] || FACES.neutral)(ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r);

    ctx.stroke();
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
        } = personLayout(width, height);

    setColorStyle(ctx, color, stroke || COLORS[6]);

    ctx.beginPath();
    ctx.ellipse(0, bodyCenterY, bodyRx, bodyRy, 0, 0, TAU);
    fillStroke(ctx);

    ctx.beginPath();
    ctx.arc(0, headCenterY, headR, 0, TAU);
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
        topW = headR * 1.1;

    setColorStyle(ctx, COLORS[7], COLORS[6]);

    ctx.beginPath();
    ctx.moveTo(-baseW / 2, hatY);
    ctx.lineTo(-topW / 2, hatTopY);
    ctx.lineTo(topW / 2, hatTopY);
    ctx.lineTo(baseW / 2, hatY);
    ctx.closePath();
    fillStroke(ctx);

    ctx.strokeStyle = roundColor()[1];
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-baseW / 2, hatY);
    ctx.quadraticCurveTo(0, (hatY + hatTopY) / 2, 0, hatTopY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(baseW / 2, hatY);
    ctx.quadraticCurveTo(0, (hatY + hatTopY) / 2, 0, hatTopY);
    ctx.stroke();
}

// Draws a bow tie (two triangles + a center knot) just below the head
function drawBowTie (ctx, headCenterY, headR) {
    const
        color = roundColor(),
        knotR = headR * 0.15 + 1,
        tieH = headR * 0.75,
        tieW = headR * 0.6,
        tieY = headCenterY + headR * 1.1;

    setColorStyle(ctx, color[0], color[1]);

    drawTriangle(ctx, -knotR, tieY, -knotR - tieW, tieY - tieH / 2, -knotR - tieW, tieY + tieH / 2, true);
    drawTriangle(ctx, knotR, tieY, knotR + tieW, tieY - tieH / 2, knotR + tieW, tieY + tieH / 2, true);

    ctx.fillStyle = color[1];
    ctx.beginPath();
    ctx.arc(0, tieY, knotR, 0, TAU);
    ctx.fill();
}

// Returns a fresh copy of the initial round/game state
function initialState () {
    return {
        breakTimer: 0,
        carrying: [],
        colorBag: [],
        customers: [],
        elapsed: 0,
        flies: null,
        flyCooldown: FLY_COOLDOWN,
        inspector: null,
        inspectorCooldown: 0,
        maxAtOnce: 3,
        newBest: false,
        onBreak: false,
        over: false,
        overTimer: 0,
        receipt: {
            items: [],
            scroll: 0
        },
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
    const stored = getStoreItem(STORAGE_KEY) || 0;

    if (game.score > stored) {
        setStoreItem(STORAGE_KEY, game.score);
        game.newBest = true;
    }
}

// Clamps score to a minimum of 0, updates the score UI text, and refreshes the high score
function setScore (value) {
    game.score = max(0, value);
    updateHighScore();
}

/*
 * Pushes a new charge/credit line onto the receipt; color is derived from the sign of the amount.
 * Only keeps enough history to cover the visible list (plus one for the slide-in animation), since older
 * entries scroll permanently off-screen and are never shown again.
 */
function addReceiptItem (label, amount) {
    const
        rowH = 18,
        listH = canvas.height * 0.6 - 24 - 16,
        maxItems = Math.ceil(listH / rowH) + 1;

    game.receipt.items.push({
        amount,
        color: amount >= 0 ? RAINBOW[3][1] : RAINBOW[0][1],
        label
    });

    if (game.receipt.items.length > maxItems) {
        game.receipt.items.shift();
    }

    game.receipt.scroll = rowH;
}

// Draws the scrolling receipt panel flush to the top-right of the screen
function renderReceipt (ctx) {
    const
        r = game.receipt,
        w = canvas.width / 4,
        h = canvas.height * 0.6,
        x = canvas.width - w,
        y = 0,
        pad = 8,
        rowH = 18,
        totalH = 36,
        tearCount = 10,
        tearH = 6,
        tearW = (canvas.width / 4) / tearCount,
        lineY = y + h - totalH,
        listTop = y + pad,
        listH = lineY - listTop - pad,
        listBottom = listTop + listH;

    r.scroll += (0 - r.scroll) * 0.25;

    ctx.save();
    ctx.fillStyle = COLORS[7];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - tearH);

    for (let i = 0; i < tearCount; i += 1) {
        const segX = x + w - i * tearW;

        ctx.lineTo(segX - tearW / 2, y + h);
        ctx.lineTo(segX - tearW, y + h - tearH);
    }

    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, listTop, w, listH);
    ctx.clip();

    ctx.font = '12px monospace';
    ctx.textBaseline = 'middle';

    r.items.forEach((item, i) => {
        const itemY = listBottom - (r.items.length - 1 - i) * rowH - rowH / 2 + r.scroll;

        if (itemY >= listTop - rowH && itemY <= listBottom + rowH) {
            ctx.fillStyle = item.color;
            ctx.textAlign = 'left';
            ctx.fillText(item.label, x + pad, itemY);
            ctx.textAlign = 'right';
            ctx.fillText(`${item.amount >= 0 ? '+' : '-'}$${abs(item.amount)}`, x + w - pad, itemY);
        }
    });

    ctx.restore();

    ctx.strokeStyle = COLORS[8];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + pad, lineY);
    ctx.lineTo(x + w - pad, lineY);
    ctx.stroke();

    ctx.fillStyle = COLORS[5];
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL', x + pad, lineY + pad + 6);

    if (game.newBest) {
        ctx.textAlign = 'center';
        ctx.fillText('NEW BEST', x + w / 2, lineY + pad + 6);
    }

    ctx.textAlign = 'right';
    ctx.fillText(`$${game.score}`, x + w - pad, lineY + pad + 6);
    ctx.restore();
}

// Draws the soda shop / ice cream parlor letterboard splash screen
function renderSplashBoard (ctx) {
    const
        best = max(getStoreItem(STORAGE_KEY) || 0, game.score),
        boardW = canvas.width * 0.6,
        padX = 18,
        rowH = 12,
        fontColor = RAINBOW[5][1],
        slotColor = RAINBOW[6][0],
        lines = [
            ['', ''],
            ['', ''],
            ['', ''],
            ['', ''],
            ['', ''],
            ['', ''],
            ['', ''],
            ['', ''],
            ['MENU', ''],
            ['', ''],
            ['', ''],
            ['1 SCOOP', '$3', '1'],
            ['', ''],
            ['2 SCOOPS', '$5', '2'],
            ['', ''],
            ['3 SCOOPS', '$7', '3'],
            ['', ''],
            ['', ''],
            ['BEST', `$${best}`],
            ['', ''],
            ['', ''],
            ['PRESS N TO START SCOOPIN’', '', 'N'],
            ['', ''],
            ['', '']
        ],
        HEADER_ROWS = 6,
        boardH = lines.length * rowH,
        boardX = (canvas.width - boardW) / 2,
        boardY = (canvas.height - boardH) / 2,
        headerCenterY = boardY + (rowH * HEADER_ROWS) / 2,
        titleText = 'Poop n’ Scoop',
        titleX = boardX + padX,
        titleWidth = ctx.measureText(titleText).width,
        titleGradient = ctx.createLinearGradient(titleX, 0, titleX + titleWidth, 0),
        coneOffsetY = 30,
        coneTipY = boardY + rowH * HEADER_ROWS,
        frameTopY = boardY - 3,
        coneH = (coneTipY - frameTopY) * 1.8,
        coneW = coneH * 0.28,
        coneTopY = coneTipY - coneH,
        coneX = boardX + boardW - padX - coneW,
        scoopR = coneW,
        coneCenterY = (coneTopY + coneTipY) / 2;
    let rowY = boardY + rowH / 2;

    // Shadow rectangle, offset for depth
    ctx.fillStyle = COLORS[5];
    ctx.fillRect(boardX - 3 + 6, boardY - 3 + 6, boardW + 6, boardH + 6);

    // Board frame
    ctx.fillStyle = fontColor;
    ctx.fillRect(boardX - 3, boardY - 3, boardW + 6, boardH + 6);
    ctx.fillStyle = COLORS[7];
    ctx.fillRect(boardX, boardY, boardW, boardH);

    // Header block behind the title area
    ctx.fillStyle = fontColor;
    ctx.fillRect(boardX, boardY, boardW, rowH * HEADER_ROWS);

    // Title text inside the header block, left side, opposite the cone
    ctx.font = 'small-caps bold 36px cursive';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    RAINBOW.forEach((c, idx) => {
        titleGradient.addColorStop(idx / (RAINBOW.length - 1), c[0]);
    });

    ctx.fillStyle = titleGradient;
    ctx.fillText(titleText, titleX, headerCenterY);

    // Ice cream cone with a scoop, in the top-right of the header, poking 1/3 of its length above the frame
    ctx.save();
    ctx.translate(coneX, coneCenterY + coneOffsetY);
    ctx.rotate(PI / 6);

    ctx.fillStyle = COLORS[2];
    ctx.beginPath();
    ctx.moveTo(-coneW, coneTopY - coneCenterY);
    ctx.lineTo(coneW, coneTopY - coneCenterY);
    ctx.lineTo(0, coneTipY - coneCenterY);
    ctx.closePath();
    ctx.fill();

    // Scoop sitting on top of the cone
    ctx.fillStyle = SPLASH_SCOOP_COLOR[0];
    ctx.beginPath();
    ctx.arc(0, coneTopY - coneCenterY, scoopR, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = SPLASH_SCOOP_COLOR[1];
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = fontColor;
    ctx.font = '18px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = slotColor;
    ctx.lineWidth = 1;

    lines.forEach(([label, price, highlight], i) => {
        // Slot line above this row (skip inside the header block)
        if (i >= HEADER_ROWS) {
            ctx.beginPath();
            ctx.moveTo(boardX, Math.floor(rowY - rowH / 2) + 0.5);
            ctx.lineTo(boardX + boardW, Math.floor(rowY - rowH / 2) + 0.5);
            ctx.stroke();
        }

        const labelColor = i < HEADER_ROWS ? COLORS[7] : fontColor;

        ctx.textAlign = 'left';

        if (highlight) {
            const
                idx = label.indexOf(highlight),
                before = label.slice(0, idx),
                after = label.slice(idx + 1);
            let x = boardX + padX;

            ctx.fillStyle = labelColor;
            ctx.fillText(before, x, rowY);
            x += ctx.measureText(before).width;

            ctx.fillStyle = RAINBOW[0][1];
            ctx.fillText(highlight, x, rowY);
            x += ctx.measureText(highlight).width;

            ctx.fillStyle = labelColor;
            ctx.fillText(after, x, rowY);
        } else {
            ctx.fillStyle = labelColor;
            ctx.fillText(label, boardX + padX, rowY);
        }

        if (price) {
            ctx.fillStyle = RAINBOW[0][1];
            ctx.textAlign = 'right';
            ctx.fillText(price, boardX + boardW - padX, rowY);
        }

        rowY += rowH;
    });

    // Slot line below the final row
    ctx.beginPath();
    ctx.moveTo(boardX, Math.floor(rowY - rowH / 2) + 0.5);
    ctx.lineTo(boardX + boardW, Math.floor(rowY - rowH / 2) + 0.5);
    ctx.stroke();
}

// Advances/decays a paused-vs-moving timer on an entity, toggling `paused` and picking a new random duration
function tickPauseTimer (entity, dt, pausedMin, pausedRange, moveMin, moveRange) {
    entity.moveTimer -= dt;

    if (entity.moveTimer <= 0) {
        entity.paused = !entity.paused;
        entity.moveTimer = entity.paused
            ? pausedMin + rnd() * pausedRange
            : moveMin + rnd() * moveRange;
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

// Returns true if a box of size (2*halfW x 2*halfH), swept from a to b, ever overlaps point p
function sweptBoxHitsPoint (p, a, b, halfW, halfH) {
    const
        x0 = a.x - p.x,
        y0 = a.y - p.y,
        dx = (b.x - p.x) - x0,
        dy = (b.y - p.y) - y0;

    let tMin = 0,
        tMax = 1;

    if (dx === 0) {
        if (x0 < -halfW || x0 > halfW) {
            return false;
        }
    } else {
        let tx1 = (-halfW - x0) / dx,
            tx2 = (halfW - x0) / dx;

        if (tx1 > tx2) {
            [tx1, tx2] = [tx2, tx1];
        }

        tMin = max(tMin, tx1);
        tMax = min(tMax, tx2);

        if (tMin > tMax) {
            return false;
        }
    }

    if (dy === 0) {
        if (y0 < -halfH || y0 > halfH) {
            return false;
        }
    } else {
        let ty1 = (-halfH - y0) / dy,
            ty2 = (halfH - y0) / dy;

        if (ty1 > ty2) {
            [ty1, ty2] = [ty2, ty1];
        }

        tMin = max(tMin, ty1);
        tMax = min(tMax, ty2);

        if (tMin > tMax) {
            return false;
        }
    }

    return tMin <= tMax;
}

// Dumps one carried scoop at a time, charging $1 per scoop (clamped at 0)
function dumpScoop () {
    if (game.over || !game.carrying.length) {
        return;
    }

    game.spills.push({
        color: game.carrying.pop(),
        visits: 0,
        x: game.player.x,
        y: game.player.y
    });
    setScore(game.score - 1);
    addReceiptItem('Dropped Scoop', -1);
}

// Resets the game state and starts a new game loop
function resetGame () {
    Object.assign(game, initialState());
    spawnTimer = 0;
    game.player.x = canvas.width / 2;
    game.player.y = (UNICORN_Y + COUNTER_Y) / 2;
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
        moveTimer: 0.5 + rnd(),
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
            const
                progress = ((canvas.width + 20) - target.x) / (canvas.width + 40),
                isHappy = target.annoyedTimer <= 0 && progress < 0.33,
                count = game.carrying.length,
                base = {
                    1: 3,
                    2: 6,
                    3: 9
                }[count] || 0,
                tip = isHappy ? 1 : 0,
                payout = base + tip;

            target.served = true;
            game.carrying = [];
            game.player.deliverTimer = 2.5;
            game.served += 1;
            setScore(game.score + payout);
            addReceiptItem(`${count} scoop${count > 1 ? 's' : ''}`, base);

            if (tip) {
                addReceiptItem('Tip :)', tip);
            }

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
            moveTimer: 0.5 + rnd(),
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

/*
 * Fly swarm mechanic tuning:
 * - Only spawns from round FLY_MIN_ROUND onward, and only while there are spills on the floor.
 * - Enters from the right edge and flies toward the nearest un-visited spill, hovering/buzzing
 *   over it for FLY_HOVER_TIME seconds before moving on to the next one.
 * - Movement uses layered sine/cosine jitter on top of a straight-line heading for an erratic,
 *   buzzing flight path.
 * - Touching the swarm while carrying scoops contaminates the top (last-picked) scoop.
 */
function trySpawnFlies (dt) {
    if (game.round < FLY_MIN_ROUND || game.flies || !game.spills.length) {
        return;
    }

    if (game.flyCooldown > 0) {
        game.flyCooldown -= dt;

        return;
    }

    if (rnd() < 0.005) {
        game.flies = {
            dots: Array.from({
                length: FLY_DOT_COUNT
            }, () => ({
                phase: rnd() * PI * 2,
                r: 6 + rnd() * 10,
                speed: 4 + rnd() * 4
            })),
            hoverTimer: 0,
            jitterPhase: rnd() * PI * 2,
            target: null,
            visited: [],
            x: canvas.width + 20,
            y: UNICORN_Y + PLAYER_REACH_Y + rnd() * (PLAYER_MAX_Y - (UNICORN_Y + PLAYER_REACH_Y))
        };

        game.flies.radius = max(...game.flies.dots.map((d) => d.r));
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
            renderSplashBoard(context);

            return;
        }
        context.fillStyle = COLORS[0];
        context.fillRect(0, 0, canvas.width, canvas.height);
        renderReceipt(context);
        drawCanopy(context, canvas.width);

        // Draw dumped scoops left behind on the floor
        game.spills.forEach((s) => {
            setColorStyle(context, ...s.color);
            drawPoop(context, s.x, s.y, 6);
        });

        // Draw the fly swarm as a cluster of buzzing black dots
        if (game.flies) {
            const swarm = game.flies;

            context.fillStyle = COLORS[8];
            swarm.dots.forEach((d) => {
                const angle = swarm.jitterPhase * d.speed + d.phase;

                drawCircle(context, swarm.x + cos(angle) * d.r, swarm.y + sin(angle) * d.r * 0.6, 1.6);
            });
        }

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
            setColorStyle(context, COLORS[7], COLORS[3]);
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
                context.arc(eyeX, eyeY, eyeR, 0, TAU);
                context.fill();
            }

            // Body (oval)
            setColorStyle(context, COLORS[7], COLORS[3]);
            context.beginPath();
            context.ellipse(u.x, u.y, bodyRx, bodyRy, 0, 0, TAU);
            fillStroke(context);

            // Horn (centered on top of the head, narrower and lowered slightly)
            setColorStyle(context, ...u.color);
            drawTriangle(context, headX - 3, headTopY + 4, headX + 3, headTopY + 4, headX, headTopY - 16, true);

            // Tail (curved teardrop shape, tip starting at the center of the body oval; swings out when a scoop is picked up)
            context.save();
            context.translate(u.x, u.y);
            context.rotate(-(PI / 2) * (u.tailSwingTimer / TAIL_SWING_DURATION));
            context.lineWidth = 1.12;
            context.lineCap = 'round';
            context.strokeStyle = u.color[1];
            context.fillStyle = u.color[0];
            context.beginPath();
            context.moveTo(-0.02, -1.32);
            context.bezierCurveTo(-0.02, -1.32, -0.12, -1.02, -0.12, -1.02);
            context.bezierCurveTo(-0.07, -1.57, 0.20, -2.24, 0.41, -2.60);
            context.bezierCurveTo(0.88, -3.37, 2.28, -4.99, 3.03, -5.61);
            context.bezierCurveTo(3.79, -6.22, 5.63, -7.24, 6.52, -7.52);
            context.bezierCurveTo(7.39, -7.79, 9.13, -7.97, 10.41, -7.91);
            context.bezierCurveTo(10.95, -7.88, 11.68, -7.77, 12.31, -7.61);
            context.bezierCurveTo(12.83, -7.47, 13.94, -7.04, 14.21, -6.88);
            context.bezierCurveTo(14.87, -6.50, 16.63, -5.00, 17.34, -4.17);
            context.bezierCurveTo(17.94, -3.46, 19.12, -1.62, 19.65, -0.60);
            context.bezierCurveTo(20.13, 0.35, 20.80, 2.14, 21.05, 3.30);
            context.bezierCurveTo(21.25, 4.23, 21.46, 6.28, 21.50, 7.58);
            context.bezierCurveTo(21.52, 8.55, 21.42, 10.46, 21.25, 11.75);
            context.bezierCurveTo(21.10, 12.81, 20.64, 14.73, 20.36, 15.86);
            context.bezierCurveTo(19.38, 19.64, 18.78, 22.36, 18.67, 23.85);
            context.bezierCurveTo(18.60, 24.84, 18.66, 26.90, 18.91, 27.65);
            context.bezierCurveTo(19.02, 28.00, 19.43, 28.72, 19.65, 28.98);
            context.bezierCurveTo(19.88, 29.23, 20.43, 29.61, 20.73, 29.72);
            context.bezierCurveTo(21.04, 29.82, 21.69, 29.84, 22.06, 29.76);
            context.bezierCurveTo(22.36, 29.70, 23.15, 29.42, 23.50, 29.20);
            context.bezierCurveTo(24.22, 28.76, 25.36, 27.76, 25.72, 27.49);
            context.bezierCurveTo(25.87, 27.69, 25.93, 28.68, 25.96, 29.25);
            context.bezierCurveTo(26.04, 30.73, 25.99, 32.27, 25.90, 33.01);
            context.bezierCurveTo(25.84, 33.51, 25.61, 34.44, 25.50, 34.75);
            context.bezierCurveTo(25.36, 35.15, 24.93, 35.96, 24.66, 36.33);
            context.bezierCurveTo(24.39, 36.70, 23.75, 37.35, 23.38, 37.65);
            context.bezierCurveTo(22.99, 37.95, 22.12, 38.46, 21.65, 38.66);
            context.bezierCurveTo(20.88, 38.97, 19.09, 39.34, 18.39, 39.33);
            context.bezierCurveTo(17.68, 38.95, 15.98, 38.63, 15.16, 38.63);
            context.bezierCurveTo(14.34, 38.31, 12.70, 37.28, 12.00, 36.64);
            context.bezierCurveTo(11.30, 36.01, 10.08, 34.50, 9.49, 33.57);
            context.bezierCurveTo(8.93, 32.66, 8.14, 30.94, 7.84, 29.95);
            context.bezierCurveTo(7.59, 29.10, 7.20, 27.18, 7.08, 26.28);
            context.bezierCurveTo(6.97, 25.33, 6.90, 23.69, 6.95, 22.59);
            context.bezierCurveTo(7.05, 20.86, 7.76, 16.57, 8.15, 14.35);
            context.bezierCurveTo(8.58, 11.81, 9.06, 7.86, 9.08, 6.47);
            context.bezierCurveTo(9.09, 5.41, 8.83, 3.66, 8.47, 2.59);
            context.bezierCurveTo(8.32, 2.16, 8.06, 1.70, 7.76, 1.30);
            context.bezierCurveTo(7.51, 0.97, 7.03, 0.52, 6.76, 0.34);
            context.bezierCurveTo(6.50, 0.18, 5.90, -0.07, 5.68, -0.12);
            context.bezierCurveTo(5.36, -0.18, 4.23, -0.19, 3.90, -0.13);
            context.bezierCurveTo(3.50, -0.05, 0.71, 0.94, 0.35, 0.93);
            context.bezierCurveTo(0.16, 0.92, -0.04, 0.85, -0.12, 0.74);
            context.bezierCurveTo(-0.25, 0.54, -0.29, -0.11, -0.22, -0.53);
            context.bezierCurveTo(-0.10, -1.23, -0.05, -1.39, 0.03, -1.62);
            context.fill('evenodd');
            context.stroke();
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

        if (game.over) {
            game.ui.over.render();
        } else if (game.onBreak) {
            game.ui.break.render();
        }
    },
    update (dt) {
        if (!game.started) {
            return;
        }

        if (game.over) {
            game.overTimer -= dt;

            if (game.overTimer <= 0) {
                resetGame();
                game.started = false;
            }

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
            const
                inspector = game.inspector,
                prevX = inspector.x,
                prevY = inspector.y;

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
                if (!sweptBoxHitsPoint(s, {
                    x: prevX,
                    y: prevY
                }, inspector, inspector.width / 2 + 6, inspector.height / 2 + 6)) {
                    return true;
                }

                setScore(game.score - 3);
                addReceiptItem('Cleaning Fee', -3);
                inspector.annoyedTimer = 2 + rnd();

                return false;
            });

            // Catch the player: fine them $10 and confiscate their carried scoop
            if (dist(game.player, inspector) < INSPECTOR_CATCH_R && game.carrying.length > 0) {
                game.carrying = [];
                setScore(game.score - 10);
                addReceiptItem('Notice of Violation', -10);

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

        // Move/update the fly swarm: seek the next un-visited spill, hover over it, then despawn off-screen
        trySpawnFlies(dt);

        if (game.flies) {
            const swarm = game.flies;

            swarm.jitterPhase += dt * 3;

            if (!swarm.target) {
                swarm.target = game.spills.find((s) => !swarm.visited.includes(s));
            }

            if (swarm.target && !game.spills.includes(swarm.target)) {
                swarm.target = null;
                swarm.hoverTimer = 0;
            } else if (swarm.target && dist(swarm, swarm.target) < 12) {
                swarm.hoverTimer ||= FLY_HOVER_TIME;
                tickDown(swarm, 'hoverTimer', dt);

                if (swarm.hoverTimer <= 0) {
                    swarm.visited.push(swarm.target);
                    swarm.target.visits += 1;

                    if (swarm.target.visits >= 2) {
                        game.spills = game.spills.filter((s) => s !== swarm.target);
                    }

                    swarm.target = null;
                }
            } else {
                const
                    destX = swarm.target ? swarm.target.x : -40,
                    destY = swarm.target ? swarm.target.y : swarm.y,
                    angle = atan2(destY - swarm.y, destX - swarm.x);

                swarm.x += (cos(angle) * FLY_SPEED + sin(swarm.jitterPhase * 2) * 30) * dt;
                swarm.y += (sin(angle) * FLY_SPEED + cos(swarm.jitterPhase * 1.7) * 30) * dt;
            }

            // Contaminate the top (most recently scooped) cone if any part of the player overlaps the swarm's spread
            if (game.carrying.length && dist(game.player, swarm) < FLY_CATCH_R + swarm.radius + game.player.width / 2) {
                game.carrying[game.carrying.length - 1] = CONTAMINATED_COLOR;
                soundFx('contaminate');
            }

            // Despawn once it has drifted off the left edge with nowhere left to go
            if (!swarm.target && swarm.x < -40) {
                game.flies = null;
                game.flyCooldown = FLY_COOLDOWN;
            }
        }


        // Losing a single customer past the counter ends the game
        if (game.customers.some((c) => !c.served && c.x <= -20)) {
            game.over = true;
            game.overTimer = GAME_OVER_DURATION;
            music.stop();
        } else {
            game.customers = game.customers.filter((c) => !c.served);
        }
    }
});

game.loop.start();
