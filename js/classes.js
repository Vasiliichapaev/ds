class Main {
    constructor(players_data) {
        this.get_date();
        this.add_players(players_data);
        this.add_table();
        this.add_plots();
    }

    get_date() {
        this.now = new Date();
        this.now_year = this.now.getFullYear();
        this.now_month = this.now.getMonth();
        this.now_day = this.now.getDate();
    }

    add_players(players_data) {
        this.players = players_data.map(player_data => new Player(player_data));
    }

    add_table() {
        this.table = new Table(this);
        this.date_selector = new DateSelector(this.table);
    }

    add_plots() {
        this.plots_div = document.querySelector(".plots");
        this.plots = this.players.map(player => new Plot(this.plots_div, player));
    }

    load_data() {
        this.heroes = {};
        let heroes_promise = fetch(`https://api.opendota.com/api/heroStats`)
            .then(response => {
                if (!response.ok) throw Error("Ошибка сервера opendota");
                return response.json();
            })
            .then(result => {
                result.forEach(hero => {
                    this.heroes[hero.id] = hero;
                });
            });

        let promise_list = [heroes_promise];

        this.players.forEach(player => {
            promise_list = promise_list.concat(player.load_games());
        });

        return Promise.all(promise_list);
    }

    calculation() {
        this.players.forEach(player => player.sort_games());
        this.table.calculation();
        this.plots.forEach(plot => plot.drawing());
    }

    display() {
        document.querySelector(".loading").style.display = "none";
        document.querySelector(".content").style.visibility = "visible";
    }

    error_load_data() {
        const loading = document.querySelector(".loading");
        loading.innerHTML = "Нет связи с opendota.";
        loading.classList.remove("loading");
        loading.classList.add("dont-load");
    }
}

class Player {
    constructor(player_data) {
        this.name = player_data.name;
        this.accounts = player_data.accounts;
    }

    load_games() {
        this.games = [];
        let promise_list = [];
        for (let account of this.accounts) {
            let response_string = `https://api.opendota.com/api/players/${account.id}/matches?significant=0`;
            if (account.start_date) {
                const year = account.start_date[2];
                const month = account.start_date[1] - 1;
                const day = account.start_date[0];
                const days_to_start = Math.ceil(
                    (new Date() - new Date(year, month, day)) / (1000 * 3600 * 24)
                );
                response_string += `&date=${days_to_start}`;
            }
            let response = fetch(response_string)
                .then(response => {
                    if (!response.ok) throw Error("Ошибка сервера opendota");
                    return response.json();
                })
                .then(result => {
                    this.games = this.games.concat(result);
                });

            promise_list.push(response);
        }
        return promise_list;
    }

    sort_games() {
        this.games = this.games.filter(elem => elem.hero_id != 0);
        this.games.sort((a, b) => a.start_time - b.start_time);
    }
}

class Table {
    constructor(main) {
        this.main = main;
        this.div = document.querySelector(".table");
        this.get_date();
        this.add_head_row();
        this.add_rows();
    }

    get_date() {
        this.year = this.main.now_year;
        this.month = this.main.now_month;
        this.days = new Date(this.year, this.month + 1, 0).getDate();
    }

    add_head_row() {
        this.head_row = new HeadRow(this);
        this.div.append(this.head_row.div);
    }

    add_rows() {
        this.rows = this.main.players.map(player => {
            const row = new Row(this, player);
            this.div.append(row.div);
            return row;
        });
    }

    calculation() {
        this.days = new Date(this.year, this.month + 1, 0).getDate();
        this.start = new Date(this.year, this.month) / 1000;
        this.end = this.start + this.days * 24 * 3600;
        this.head_row.calculation();
        this.rows.forEach(row => row.calculation());
    }
}

class Div {
    constructor(...classes) {
        this.div = this.create_div("", ...classes);
    }

    create_div(text, ...classes) {
        const div = document.createElement("div");
        div.innerHTML = text;
        div.classList.add(...classes);
        return div;
    }

    win_game(game) {
        if (game.radiant_win && game.player_slot < 6) return true;
        if (!game.radiant_win && game.player_slot > 6) return true;
        return false;
    }
}

class HeadRow extends Div {
    constructor(table) {
        super("row");
        this.table = table;

        let cell = this.create_div("", "player-name");
        cell.append(this.create_div("Игроки", "margin-auto"));
        this.div.append(cell);

        this.cells = [];
        for (let day = 1; day <= 31; day++) {
            cell = this.create_div("", "cell");
            cell.append(this.create_div(day, "margin-auto"));
            this.div.append(cell);
            this.cells.push(cell);
        }

        cell = this.create_div("", "cell");
        cell.append(this.create_div("W", "margin-auto"));
        this.div.append(cell);

        cell = this.create_div("", "cell");
        cell.append(this.create_div("L", "margin-auto"));
        this.div.append(cell);

        cell = this.create_div("", "winrate-cell");
        cell.append(this.create_div("W/(W+L)", "margin-auto"));
        this.div.append(cell);

        this.calculation();
    }

    calculation() {
        for (let day = 31; day > 28; day--) {
            this.cells[day - 1].classList.remove("not-display");
        }

        for (let day = 31; day > this.table.days; day--) {
            this.cells[day - 1].classList.add("not-display");
        }

        for (let day = 0; day < this.cells.length; day++) {
            this.cells[day].classList.remove("current-day");
            if (
                this.table.year == this.table.main.now_year &&
                this.table.month == this.table.main.now_month &&
                day + 1 == this.table.main.now_day
            ) {
                this.cells[day].classList.add("current-day");
            }
        }
    }
}

class Row extends Div {
    constructor(table, player) {
        super("row");
        this.table = table;
        this.player = player;

        let cell = this.create_div("", "player-name");
        cell.append(this.create_div(this.player.name, "player-name-container"));
        this.div.append(cell);

        this.add_cells();

        cell = this.create_div("", "cell");
        this.wins_cell = this.create_div("", "win");
        cell.append(this.wins_cell);
        this.div.append(cell);

        cell = this.create_div("", "cell");
        this.loose_cell = this.create_div("", "loose");
        cell.append(this.loose_cell);
        this.div.append(cell);

        cell = this.create_div("", "winrate-cell");
        this.winrate_cell = this.create_div("");
        cell.append(this.winrate_cell);
        this.div.append(cell);
    }

    add_cells() {
        this.cells = [];
        for (let day = 1; day <= 31; day++) {
            let cell = new Cell(this, day);
            this.cells.push(cell);
            this.div.append(cell.div);
        }
    }

    calculation() {
        this.games = this.player.games.filter(
            game => game.start_time >= this.table.start && game.start_time < this.table.end
        );

        this.wins_cell.innerHTML = "";
        this.loose_cell.innerHTML = "";
        this.winrate_cell.innerHTML = "";
        this.winrate_cell.classList.remove("win", "loose");

        this.month_wins = 0;
        this.month_looses = 0;

        for (let cell of this.cells) {
            cell.calculation();
            this.month_wins += cell.wins;
            this.month_looses += cell.looses;
        }

        if (this.month_wins > 0) this.wins_cell.innerHTML = this.month_wins;
        if (this.month_looses > 0) this.loose_cell.innerHTML = this.month_looses;

        if (this.month_looses + this.month_wins > 0) {
            const winrate = (this.month_wins / (this.month_looses + this.month_wins)).toFixed(2);
            this.winrate_cell.innerHTML = winrate;
            if (winrate >= 0.5) {
                this.winrate_cell.classList.add("win");
            } else {
                this.winrate_cell.classList.add("loose");
            }
        }
        this.add_pop_up();
    }

    add_pop_up() {
        this.month_pop_up = new MonthPopUp(this);
        this.month_pop_up.create();
    }
}

class Cell extends Div {
    constructor(row, day) {
        super("cell");
        this.row = row;
        this.table = row.table;
        this.day = day;
        this.add_win_loose_cells();
        this.not_display_cell_in_current_month();
        this.pop_up = new PopUp(this);
    }

    add_win_loose_cells() {
        this.win_div = this.create_div("", "win");
        this.loose_div = this.create_div("", "loose");
        this.div.append(this.win_div, this.loose_div);
    }

    not_display_cell_in_current_month() {
        if (this.day > 27) {
            this.div.classList.remove("not-display");
        }
        if (this.day > this.table.days) {
            this.div.classList.add("not-display");
        }
    }

    calculation() {
        this.not_display_cell_in_current_month();

        const start = this.table.start + (this.day - 1) * 3600 * 24;
        const end = start + 3600 * 24;

        this.games = this.row.games.filter(
            game => game.start_time >= start && game.start_time < end
        );
        this.games.sort((a, b) => b.start_time - a.start_time);

        this.win_games = this.games.filter(game => this.win_game(game));
        this.loose_games = this.games.filter(game => !this.win_game(game));

        this.wins = this.win_games.length;
        this.looses = this.loose_games.length;

        this.win_div.innerHTML = "";
        this.loose_div.innerHTML = "";

        if (this.wins > 0) this.win_div.innerHTML = this.wins;
        if (this.looses > 0) this.loose_div.innerHTML = this.looses;

        this.pop_up.create();
    }
}

class PopUp extends Div {
    constructor(cell) {
        super("pop-up");
        this.cell = cell;

        const pop_up_head = this.create_div("", "pop-up-head");
        pop_up_head.append(this.create_div("", "pop-up-hero"));
        pop_up_head.append(this.create_div("У", "pop-up-cell"));
        pop_up_head.append(this.create_div("С", "pop-up-cell"));
        pop_up_head.append(this.create_div("П", "pop-up-cell"));

        this.pop_up_body = this.create_div("", "pop-up-body");
        this.div.append(pop_up_head, this.pop_up_body);
    }

    create() {
        this.heroes = this.cell.table.main.heroes;

        this.cell.div.classList.remove("selectable-cell");
        if (this.cell.div.children[2]) this.cell.div.children[2].remove();

        for (let row = this.pop_up_body.children.length - 1; row >= 0; row--) {
            this.pop_up_body.children[row].remove();
        }

        if (this.cell.games.length == 0) return;

        for (let game of this.cell.games) {
            const img_url = this.heroes[game.hero_id].img;
            const pop_up_row = this.create_div("", "pop-up-row");

            const game_link = document.createElement("a");
            game_link.href = `https://www.opendota.com/matches/${game.match_id}`;
            pop_up_row.append(game_link);

            if (this.win_game(game)) {
                pop_up_row.classList.add("green");
            } else {
                pop_up_row.classList.add("red");
            }

            const pop_up_hero = this.create_div("", "pop-up-hero");
            const pop_up_hero_img = document.createElement("img");
            pop_up_hero_img.src = `https://api.opendota.com${img_url}`;
            pop_up_hero.append(pop_up_hero_img);
            pop_up_row.append(pop_up_hero);
            this.div.append(pop_up_row);

            pop_up_row.append(this.create_div(game.kills, "pop-up-cell"));
            pop_up_row.append(this.create_div(game.deaths, "pop-up-cell"));
            pop_up_row.append(this.create_div(game.assists, "pop-up-cell"));
            this.pop_up_body.append(pop_up_row);
        }

        this.cell.div.classList.add("selectable-cell");
        this.cell.div.append(this.div);
    }
}

class MonthPopUp extends Div {
    constructor(row) {
        super("month-pop-up");
        this.row = row;
        this.cell = row.div.children[34];
        this.games = row.games;

        const pop_up_head = this.create_div("", "pop-up-head");
        pop_up_head.append(this.create_div("", "pop-up-hero"));
        pop_up_head.append(this.create_div("W", "pop-up-cell", "green"));
        pop_up_head.append(this.create_div("L", "pop-up-cell", "red"));
        pop_up_head.append(this.create_div("W/(W+L)", "pop-up-winrate-cell"));

        this.pop_up_body = this.create_div("", "pop-up-body");
        this.div.append(pop_up_head, this.pop_up_body);
    }

    create() {
        this.heroes = this.row.table.main.heroes;

        this.cell.classList.remove("selectable-cell");
        if (this.cell.children[1]) this.cell.children[1].remove();

        for (let row = this.pop_up_body.children.length - 1; row >= 0; row--) {
            this.pop_up_body.children[row].remove();
        }

        if (this.games.length == 0) return;

        const month_heroes_id = new Set();
        const hero_games = [];

        for (let game of this.games) {
            month_heroes_id.add(game.hero_id);
        }

        for (let id of month_heroes_id) {
            const games = this.games.filter(game => game.hero_id == id);
            const win_count = games.filter(game => this.win_game(game)).length;
            const loose_count = games.filter(game => !this.win_game(game)).length;
            hero_games.push([id, [win_count, loose_count, win_count + loose_count]]);
        }

        hero_games.sort((a, b) => b[1][2] - a[1][2]);

        for (let hero of hero_games) {
            const img_url = this.heroes[hero[0]].img;
            const pop_up_row = this.create_div("", "month-pop-up-row");
            const pop_up_hero = this.create_div("", "pop-up-hero");
            const pop_up_hero_img = document.createElement("img");

            pop_up_hero_img.src = `https://api.opendota.com${img_url}`;
            pop_up_hero.append(pop_up_hero_img);
            pop_up_row.append(pop_up_hero);
            this.div.append(pop_up_row);

            const winrate = hero[1][0] / hero[1][2];

            pop_up_row.append(this.create_div(hero[1][0], "pop-up-cell", "green"));
            pop_up_row.append(this.create_div(hero[1][1], "pop-up-cell", "red"));
            if (winrate >= 0.5) {
                pop_up_row.append(
                    this.create_div(winrate.toFixed(2), "pop-up-winrate-cell", "green")
                );
            } else {
                pop_up_row.append(
                    this.create_div(winrate.toFixed(2), "pop-up-winrate-cell", "red")
                );
            }

            this.pop_up_body.append(pop_up_row);
        }

        this.cell.classList.add("selectable-cell");
        this.cell.append(this.div);
    }
}

class DateSelector {
    constructor(table) {
        this.main = table.main;
        this.table = table;
        this.year = table.year;
        this.month = table.month;

        this.div = document.querySelector(".date-selector");

        let previous_month = this.div.children[0];
        let date_box = this.div.children[1];
        let next_month = this.div.children[2];

        previous_month.addEventListener("click", () => this.previous_month());
        next_month.addEventListener("click", () => this.next_month());

        document.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft") this.previous_month();
            if (e.key === "ArrowRight") this.next_month();
        });

        let current_date = date_box.children[0];
        let date_list = date_box.children[1];
        date_list.addEventListener("mouseleave", () => this.calculation());

        this.year_div = current_date.children[0];
        this.month_div = current_date.children[1];

        this.year_div.innerHTML = this.year;
        this.month_div.innerHTML = this.month_name(this.month);

        this.year_list = date_list.children[0];
        this.month_list = date_list.children[1];

        for (let month of this.month_list.children) {
            month.addEventListener("click", e => this.month_select(e));
            if (month.id == this.month) {
                month.classList.add("selected");
                this.selected_month = month;
            }
        }

        for (let year = this.year; year >= 2012; year--) {
            let year_number = document.createElement("div");
            year_number.innerHTML = year;
            year_number.addEventListener("click", e => this.year_select(e));
            if (year == this.year) {
                year_number.classList.add("selected");
                this.selected_year = year_number;
            }
            this.year_list.append(year_number);
        }
    }

    previous_month() {
        let date = new Date(this.year, this.month - 1);
        if (date.getFullYear() < 2012) return;
        this.year = date.getFullYear();
        this.month = date.getMonth();
        this.change_date_in_list();
        this.calculation();
    }

    next_month() {
        let date = new Date(this.year, this.month + 1);
        if (date.getFullYear() > this.main.now_year) return;
        this.year = date.getFullYear();
        this.month = date.getMonth();
        this.change_date_in_list();
        this.calculation();
    }

    change_date_in_list() {
        this.selected_month.classList.remove("selected");
        this.selected_month = this.month_list.children[this.month];
        this.selected_month.classList.add("selected");
        this.selected_year.classList.remove("selected");
        this.selected_year = this.year_list.children[
            this.year_list.children.length - (this.year - 2012 + 1)
        ];
        this.selected_year.classList.add("selected");
    }

    calculation() {
        if (this.year == this.table.year && this.month == this.table.month) return;
        this.year_div.innerHTML = this.year;
        this.month_div.innerHTML = this.month_name(this.month);
        this.table.year = this.year;
        this.table.month = this.month;
        this.table.calculation();
    }

    month_select(e) {
        let selected_month = e.target;
        this.selected_month.classList.remove("selected");
        this.selected_month = selected_month;
        selected_month.classList.add("selected");
        this.month = Number(selected_month.id);
    }

    year_select(e) {
        let selected_year = e.target;
        this.selected_year.classList.remove("selected");
        this.selected_year = selected_year;
        selected_year.classList.add("selected");
        this.year = selected_year.innerHTML;
    }

    month_name(id) {
        const months = [
            "Январь",
            "Февраль",
            "Март",
            "Апрель",
            "Май",
            "Июнь",
            "Июль",
            "Август",
            "Сентябрь",
            "Октябрь",
            "Ноябрь",
            "Декабрь"
        ];
        return months[id];
    }
}

class Plot extends Div {
    constructor(plots_div, player) {
        super("plot");

        this.plots_div = plots_div;
        this.player = player;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.plot_body = this.create_div("", "plot-body");
        this.plot_container = this.create_div("", "plot-container");
        this.plot_container.append(this.canvas);
        this.plot_body.append(this.plot_container);

        this.div.append(this.create_div(player.name, "plot-head"));
        this.div.append(this.plot_body);
        this.plots_div.append(this.div);
    }

    async drawing() {
        this.games = this.player.games;
        const r = 2.5;
        this.delta = r * 1.2 * 2 ** 0.5;
        const width = (this.games.length + 2) * this.delta;
        let x = 0;
        let y = 0;
        let current_y = 0;
        let max_y = 10;
        let min_y = -10;
        this.canvas.width = width + 50;
        this.plot_container.style.width = `${width + 50}px`;

        for (let game of this.games) {
            if (this.win_game(game)) {
                current_y++;
            } else {
                current_y--;
            }
            game.current_y = current_y;
            if (max_y < current_y) max_y = current_y;
            if (min_y > current_y) min_y = current_y;
        }

        max_y = Math.ceil(max_y / 10) * 10;
        min_y = Math.floor(min_y / 10) * 10;

        const height = (max_y - min_y + 4) * this.delta;

        this.canvas.height = height;
        this.plot_container.style.height = `${height}px`;

        for (let current_y = min_y; current_y <= max_y; current_y += 10) {
            x = 0;
            y = -1 * (current_y - max_y - 2) * this.delta;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            x = width;
            this.ctx.lineTo(x, y);
            this.ctx.lineWidth = 0.3;
            if (current_y == 0) this.ctx.lineWidth = 1.2;
            this.ctx.stroke();

            this.ctx.font = "italic 12px Arial";
            this.ctx.textBaseline = "middle";
            this.ctx.textAlign = "start";
            this.ctx.fillText(current_y, width + 10, y);
        }

        x = width;
        y = -1 * (min_y - max_y - 2) * this.delta;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        y = -1 * -2 * this.delta;
        this.ctx.lineTo(x, y);
        this.ctx.lineWidth = 0.3;
        this.ctx.stroke();

        x = 0;
        y = -1 * (-max_y - 2) * this.delta;

        for (let game of this.games) {
            let color = "red";
            let delta_y = this.delta;
            if (this.win_game(game)) {
                color = "green";
                delta_y = -this.delta;
            }
            x += this.delta;
            y += delta_y;

            this.ctx.beginPath();
            this.ctx.fillStyle = color;
            this.ctx.arc(x, y, r, 0, 2 * Math.PI);
            this.ctx.fill();
        }

        this.plot_body.scrollLeft = width;
        this.plot_body.scrollTop = -1 * (current_y - max_y + 5) * this.delta;

        this.add_pop_up();

        this.mousedown = false;

        this.canvas.addEventListener("mousedown", e => {
            this.mousedown = true;
        });
        document.addEventListener("mouseup", e => {
            this.mousedown = false;
        });
    }

    add_pop_up() {
        this.pop_up = new PlotPopUP(this);
        this.plot_container.append(this.pop_up.div);
        this.canvas.addEventListener("mousemove", e => {
            if (this.mousedown) {
                this.plot_body.scrollLeft -= e.movementX;
                this.plot_body.scrollTop -= e.movementY;
            } else {
                this.pop_up.calculation(e.offsetX, e.offsetY);
            }
        });
    }
}

class PlotPopUP extends Div {
    constructor(plot) {
        super("plot-pop-up");
        this.plot = plot;
        this.games = plot.games;
        this.div.style.height = plot.plot_container.style.height;
        this.plot_pop_up_details = this.create_div("", "plot-pop-up-details");
        this.div.append(this.plot_pop_up_details);
    }

    calculation(x, y) {
        let game_number = Math.ceil(x / this.plot.delta);
        if (game_number > this.games.length) game_number = this.games.length;
        if (game_number < 1) game_number = 1;

        const game = this.games[game_number - 1];

        let offset = -50;
        if (game_number < 12) offset = 20;
        x = game_number * this.plot.delta - 1;

        let h = this.plot.canvas.height;
        if (y > h - 32) y = h - 32;

        this.plot_pop_up_details.innerHTML = `<p>${game_number}</p><p>${game.current_y}</p>`;
        this.plot_pop_up_details.style.top = `${y}px`;
        this.plot_pop_up_details.style.left = `${offset}px`;
        this.div.style.left = `${x}px`;
        this.div.style.display = "flex";

        this.div.style.background = "red";
        if (this.win_game(game)) {
            this.div.style.background = "green";
        }
    }
}
