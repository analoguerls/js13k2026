/* eslint-disable func-style, new-cap, no-extra-parens, no-mixed-operators */

import {
    GameLoop,
    Sprite,
    Text,
    init,
    initKeys,
    onKey
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
    PLAYER_X = 40,
    ROWS = 7,
    ROW_H = canvas.height / ROWS,
    game = {
        breakTimer: 0,
        customers: [],
        elapsed: 0,
        loop: null,
        onBreak: false,
        over: false,
        pints: [],
        round: 1,
        row: 3,
        rowBag: [],
        rowMax: 4,
        rowMin: 2,
        score: 0,
        served: 0,
        spawned: 0,
        target: 7,
        ui: {
            break: Text({
                anchor: {
                    x: 0.5,
                    y: 0.5
                },
                color: '#FFF',
                font: '27px monospace',
                text: 'Good job, get ready for the next batch of hungry customers!',
                textAlign: 'center',
                width: canvas.width - 40,
                x: canvas.width / 2,
                y: canvas.height / 2
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
                text: 'Score: 0',
                x: 10,
                y: 10
            })
        }
    };

let
    spawnTimer = 0;

initKeys();

game.player = Sprite({
    anchor: {
        x: 0.5,
        y: 0.5
    },
    color: '#FFF',
    height: 30,
    render () {
        this.context.fillStyle = this.color;
        this.context.beginPath();
        this.context.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        this.context.fill();
    },
    width: 30,
    x: PLAYER_X,
    y: game.row * ROW_H + ROW_H / 2
});

function advanceRound () {
    game.round += 1;
    game.served = 0;
    game.rowBag = [];

    if (game.round === 2) {
        game.rowMin = 1;
        game.rowMax = 5;
    } else if (game.round === 3) {
        game.rowMin = 0;
        game.rowMax = 6;
    }

    game.target = Math.min(game.round * 7, 70);
    game.spawned = 0;
    game.customers = [];
    game.pints = [];
    game.onBreak = true;
    game.breakTimer = 6;
}

function nextRow () {
    if (!game.rowBag.length) {
        game.rowBag = [];

        for (let i = game.rowMin; i <= game.rowMax; i += 1) {
            game.rowBag.push(i);
        }

        // Shuffle the row bag
        for (let i = game.rowBag.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));

            // Swap rows
            [game.rowBag[i], game.rowBag[j]] = [game.rowBag[j], game.rowBag[i]];
        }
    }

    return game.rowBag.pop();
}

function resetGame () {
    game.breakTimer = 0;
    game.customers = [];
    game.elapsed = 0;
    game.onBreak = false;
    game.over = false;
    game.pints = [];
    game.round = 1;
    game.row = 3;
    game.rowBag = [];
    game.rowMax = 4;
    game.rowMin = 2;
    game.score = 0;
    game.served = 0;
    game.spawned = 0;
    game.target = 7;

    spawnTimer = 0;
    game.player.y = game.row * ROW_H + ROW_H / 2;
    game.ui.score.text = 'Score: 0';
}

function spawnCustomer () {
    const
        boost = Math.min(game.elapsed / 20, 3),
        r = nextRow(),
        speed = 60 + Math.random() * 40 + boost * 30;

    game.customers.push(Sprite({
        anchor: {
            x: 0.5,
            y: 0.5
        },
        color: COLORS[r],
        dx: -speed,
        height: 40,
        moveTimer: 0.5 + Number(Math.random()),
        paused: false,
        render () {
            this.context.fillStyle = this.color;
            this.context.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        },
        row: r,
        width: 30,
        x: canvas.width + 20,
        y: r * ROW_H + ROW_H / 2
    }));
}

function throwPint () {
    game.pints.push(Sprite({
        anchor: {
            x: 0.5,
            y: 0.5
        },
        color: '#BFF',
        dx: 300,
        radius: 6,
        render () {
            this.context.fillStyle = this.color;
            this.context.beginPath();
            this.context.arc(0, 0, this.radius, 0, Math.PI * 2);
            this.context.fill();
        },
        row: game.row,
        x: game.player.x + 20,
        y: game.player.y
    }));
}

// Controls
onKey('arrowup', () => {
    if (!game.over && !game.onBreak && game.row > game.rowMin) {
        game.row -= 1;
        game.player.y = game.row * ROW_H + ROW_H / 2;
    }
});

onKey('arrowdown', () => {
    if (!game.over && !game.onBreak && game.row < game.rowMax) {
        game.row += 1;
        game.player.y = game.row * ROW_H + ROW_H / 2;
    }
});

onKey('n', () => {
    if (game.over) {
        resetGame();
    }
});

onKey('space', () => {
    if (!game.over && !game.onBreak) {
        throwPint();
    }
});

game.loop = GameLoop({
    render () {
        context.fillStyle = '#111';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the row guides, dimming rows that aren't active yet
        for (let i = 0; i < ROWS; i += 1) {
            const active = i >= game.rowMin && i <= game.rowMax;

            context.strokeStyle = active ? COLORS[i] : '#333';
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(0, i * ROW_H + ROW_H / 2);
            context.lineTo(canvas.width, i * ROW_H + ROW_H / 2);
            context.stroke();
        }

        // Draw the customers
        game.player.render();
        game.pints.forEach((p) => p.render());
        game.customers.forEach((c) => c.render());
        game.ui.score.render();

        // Draw the game over or break screen
        if (game.over) {
            game.ui.over.render();
        } else if (game.onBreak) {
            game.ui.break.render();
        }
    },
    // Update gam
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

        /*
         * Update game state
         * Floor: 0.7s (was 0.4s) — caps max difficulty at a more manageable rate.
         * Starting interval: 1.8s (was 1.2s) — more breathing room early on.
         * Ramp divisor: 45 (was 30) — difficulty increases more gradually.
         */
        const spawnInterval = Math.max(0.7, 1.8 - game.elapsed / 45);

        spawnTimer += dt;
        game.elapsed += dt;

        // Spawn a new customer if under the round limit and the spawn timer exceeds the spawn interval
        if (game.spawned < game.target && spawnTimer > spawnInterval) {
            spawnTimer = 0;
            spawnCustomer();
            game.spawned += 1;
        }

        // Throw pints
        game.pints.forEach((p) => (p.x += p.dx * dt));
        if (game.pints.some((p) => !p.hit && p.x >= canvas.width)) {
            game.over = true;
        }
        game.pints = game.pints.filter((p) => p.x < canvas.width + 20);

        // Move customers
        game.customers.forEach((c) => {
            c.moveTimer -= dt;

            if (c.moveTimer <= 0) {
                c.paused = !c.paused;
                c.moveTimer = c.paused
                    ? 0.8 + Math.random() * 1.4
                    : 0.5 + Number(Math.random());
            }

            if (!c.paused) {
                c.x += c.dx * dt;
            }
        });

        // Check for collisions between customers and the player
        for (const c of game.customers) {
            if (c.x - c.width / 2 <= PLAYER_X + game.player.width / 2) {
                game.over = true;
            }
        }

        // Check for collisions between pints and customers
        let roundComplete = false;

        for (const p of game.pints) {
            for (const c of game.customers) {
                if (!c.hit && p.row === c.row && Math.abs(p.x - c.x) < c.width / 2) {
                    c.hit = true;
                    p.hit = true;
                    game.score += 10;
                    game.served += 1;
                    game.ui.score.text = `Score: ${game.score}`;

                    if (game.served >= game.target) {
                        roundComplete = true;
                    }
                }
            }
        }

        // Remove hit pints and customers that have been hit or have moved off-screen
        game.pints = game.pints.filter((p) => !p.hit);
        game.customers = game.customers.filter((c) => !c.hit && c.x > -30);

        if (roundComplete) {
            advanceRound();
        }
    }
});

game.loop.start();
