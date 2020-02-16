class Main {
    constructor(players_data) {
        this.players = [];
        for (let player_data of players_data) {
            this.players.push(new Player(player_data));
        }

        this.heroes = [];

        this.now = new Date();
        this.now_year = this.now.getFullYear();
        this.now_month = this.now.getMonth();
        this.now_day = this.now.getDate();

        this.table = new Table(this);
        this.date_selector = new DateSelector(this.table);

        this.plots_div = document.querySelector(".plots");
        this.plots = [];
        for (let player of this.players) {
            this.plots.push(new Plot(this.plots_div, player));
        }
    }

    async load_data() {
        let promise_list = [];

        let heroes = fetch(`https://api.opendota.com/api/heroStats`)
            .then(response => response.json())
            .then(result => {
                this.heroes = {};
                for (let hero of result) {
                    this.heroes[hero.id] = hero;
                }
            });
        promise_list.push(heroes);

        for (let player of this.players) {
            promise_list = promise_list.concat(player.load_games());
        }
        let all_promise = await Promise.all(promise_list);
        return all_promise;
    }

    calculation() {
        for (let player of this.players) {
            player.sort_games();
        }

        this.table.calculation();

        for (let plot of this.plots) {
            plot.drawing();
        }
    }
}

class Player {
    constructor(player_data) {
        this.name = player_data.name;
        this.accounts = player_data.accounts;
        this.games = [];
    }

    load_games() {
        let promise_list = [];
        for (let account of this.accounts) {
            let response_string = `https://api.opendota.com/api/players/${account.id}/matches`;
            if (account.start_date) {
                let year = account.start_date[2];
                let month = account.start_date[1] - 1;
                let day = account.start_date[0];
                let days_to_start = (new Date() - new Date(year, month, day)) / (1000 * 3600 * 24);
                response_string += `?date=${days_to_start.toFixed()}`;
            }

            let response = fetch(response_string)
                .then(response => response.json())
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

        this.year = main.now_year;
        this.month = main.now_month;
        this.days = new Date(this.year, this.month + 1, 0).getDate();
        this.rows = [];

        this.head_row = new HeadRow(this);
        this.div.append(this.head_row.div);

        for (let player of this.main.players) {
            this.add_row(player);
        }
    }

    add_row(player) {
        const row = new Row(this, player);
        this.rows.push(row);
        this.div.append(row.div);
    }

    calculation() {
        this.days = new Date(this.year, this.month + 1, 0).getDate();
        this.start = new Date(this.year, this.month) / 1000;
        this.end = this.start + this.days * 24 * 3600;

        this.head_row.calculation();

        for (let row of this.rows) {
            row.calculation();
        }
    }
}

class Div {
    constructor(...classes) {
        this.div = this.create_div("", ...classes);
    }

    create_div(text, ...classes) {
        let div = document.createElement("div");
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
        this.cells = [];

        let cell = this.create_div("", "player-name");
        cell.append(this.create_div("Игроки", "margin-auto"));
        this.div.append(cell);

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
        this.cells = [];

        let cell = this.create_div("", "player-name");
        cell.append(this.create_div(this.player.name, "player-name-container"));
        this.div.append(cell);

        for (let day = 1; day <= 31; day++) {
            this.add_cell(day);
        }

        cell = this.create_div("", "cell");
        this.wins_cell = this.create_div("");
        cell.append(this.wins_cell);
        this.div.append(cell);

        cell = this.create_div("", "cell");
        this.loose_cell = this.create_div("");
        cell.append(this.loose_cell);
        this.div.append(cell);

        cell = this.create_div("", "winrate-cell");
        this.winrate_cell = this.create_div("");
        cell.append(this.winrate_cell);
        this.div.append(cell);
    }

    add_cell(day) {
        const cell = new Cell(this, day);
        this.cells.push(cell);
        this.div.append(cell.div);
    }

    calculation() {
        this.games = this.player.games.filter(
            elem => elem.start_time >= this.table.start && elem.start_time < this.table.end
        );

        this.wins_cell.innerHTML = "";
        this.loose_cell.innerHTML = "";
        this.winrate_cell.innerHTML = "";

        this.wins_cell.classList.remove("win", "loose");
        this.loose_cell.classList.remove("win", "loose");
        this.winrate_cell.classList.remove("win", "loose");

        this.month_wins = 0;
        this.month_looses = 0;

        for (let cell of this.cells) {
            cell.calculation();
            this.month_wins += cell.wins;
            this.month_looses += cell.looses;
        }

        if (this.month_wins > 0) {
            this.wins_cell.classList.add("win");
            this.wins_cell.innerHTML = this.month_wins;
        }

        if (this.month_looses > 0) {
            this.loose_cell.classList.add("loose");
            this.loose_cell.innerHTML = this.month_looses;
        }

        if (this.month_looses + this.month_wins > 0) {
            let winrate = (this.month_wins / (this.month_looses + this.month_wins)).toFixed(2);
            this.winrate_cell.innerHTML = winrate;
            if (winrate >= 0.5) {
                this.winrate_cell.classList.add("win");
            } else {
                this.winrate_cell.classList.add("loose");
            }
        }
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
        this.win_div = this.create_div("", "win");
        this.loose_div = this.create_div("", "loose");
        this.pop_up = new PopUp(this);
        this.div.append(this.win_div, this.loose_div);
        this.not_display();
    }

    not_display() {
        if (this.day > 27) {
            this.div.classList.remove("not-display");
        }
        if (this.day > this.table.days) {
            this.div.classList.add("not-display");
        }
    }

    calculation() {
        this.not_display();

        this.start = this.table.start + (this.day - 1) * 3600 * 24;
        this.end = this.start + 3600 * 24;

        this.games = this.row.games.filter(
            elem => elem.start_time >= this.start && elem.start_time < this.end
        );

        this.games.sort((a, b) => b.start_time - a.start_time);

        this.win_games = this.games.filter(game => this.win_game(game));
        this.loose_games = this.games.filter(game => !this.win_game(game));

        this.wins = this.win_games.length;
        this.looses = this.loose_games.length;

        this.win_div.innerHTML = "";
        this.loose_div.innerHTML = "";

        if (this.wins > 0) {
            this.win_div.innerHTML = this.wins;
        }

        if (this.looses > 0) {
            this.loose_div.innerHTML = this.looses;
        }
        this.pop_up.create();
    }
}

class PopUp extends Div {
    constructor(cell) {
        super("pop-up");
        this.cell = cell;

        let pop_up_head = this.create_div("", "pop-up-head");
        pop_up_head.append(this.create_div("", "pop-up-hero"));
        pop_up_head.append(this.create_div("У", "pop-up-cell"));
        pop_up_head.append(this.create_div("С", "pop-up-cell"));
        pop_up_head.append(this.create_div("П", "pop-up-cell"));

        this.pop_up_body = this.create_div("", "pop-up-body");
        this.div.append(pop_up_head);
        this.div.append(this.pop_up_body);
    }

    create() {
        this.heroes = this.cell.table.main.heroes;

        this.cell.div.classList.remove("select-cell");
        if (this.cell.div.children[2]) this.cell.div.children[2].remove();

        for (let row = this.pop_up_body.children.length - 1; row >= 0; row--) {
            this.pop_up_body.children[row].remove();
        }

        if (this.cell.games.length == 0) return;

        for (let game of this.cell.games) {
            let img_url = this.heroes[game.hero_id].img;
            let pop_up_row = this.create_div("", "pop-up-row");

            let game_link = document.createElement("a");
            game_link.href = `https://www.opendota.com/matches/${game.match_id}`;
            pop_up_row.append(game_link);

            if (this.win_game(game)) {
                pop_up_row.classList.add("green");
            } else {
                pop_up_row.classList.add("red");
            }

            let pop_up_hero = this.create_div("", "pop-up-hero");
            let pop_up_hero_img = document.createElement("img");
            pop_up_hero_img.src = `https://api.opendota.com${img_url}`;
            pop_up_hero.append(pop_up_hero_img);
            pop_up_row.append(pop_up_hero);
            this.div.append(pop_up_row);

            pop_up_row.append(this.create_div(game.kills, "pop-up-cell"));
            pop_up_row.append(this.create_div(game.deaths, "pop-up-cell"));
            pop_up_row.append(this.create_div(game.assists, "pop-up-cell"));
            this.pop_up_body.append(pop_up_row);
        }

        this.cell.div.classList.add("select-cell");
        this.cell.div.append(this.div);
    }
}

class MonthPopUp extends Div {
    constructor(row) {
        super("month-pop-up");
        this.row = row;
        this.cell = row.div.children[34];
        this.games = row.games;

        let pop_up_head = this.create_div("", "pop-up-head");
        pop_up_head.append(this.create_div("", "pop-up-hero"));
        pop_up_head.append(this.create_div("W", "pop-up-cell", "green"));
        pop_up_head.append(this.create_div("L", "pop-up-cell", "red"));
        pop_up_head.append(this.create_div("W/(W+L)", "pop-up-winrate-cell"));

        this.pop_up_body = this.create_div("", "pop-up-body");
        this.div.append(pop_up_head);
        this.div.append(this.pop_up_body);
    }

    create() {
        this.heroes = this.row.table.main.heroes;

        this.cell.classList.remove("select-cell");
        if (this.cell.children[1]) this.cell.children[1].remove();

        for (let row = this.pop_up_body.children.length - 1; row >= 0; row--) {
            this.pop_up_body.children[row].remove();
        }

        if (this.games.length == 0) return;

        let month_heroes_id = new Set();
        let hero_games = [];

        for (let game of this.games) {
            month_heroes_id.add(game.hero_id);
        }

        for (let id of month_heroes_id) {
            let games = this.games.filter(game => game.hero_id == id);
            let win_games_count = games.filter(game => this.win_game(game)).length;
            let loose_games_count = games.filter(game => !this.win_game(game)).length;
            hero_games.push([
                id,
                [win_games_count, loose_games_count, win_games_count + loose_games_count]
            ]);
        }

        hero_games.sort((a, b) => b[1][2] - a[1][2]);

        for (let hero of hero_games) {
            let img_url = this.heroes[hero[0]].img;
            let pop_up_row = this.create_div("", "month-pop-up-row");
            let pop_up_hero = this.create_div("", "pop-up-hero");
            let pop_up_hero_img = document.createElement("img");

            pop_up_hero_img.src = `https://api.opendota.com${img_url}`;
            pop_up_hero.append(pop_up_hero_img);
            pop_up_row.append(pop_up_hero);
            this.div.append(pop_up_row);

            let winrate = hero[1][0] / hero[1][2];

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

        this.cell.classList.add("select-cell");
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
        const r = 2.5;
        const delta = r * 1.2 * 2 ** 0.5;
        const width = (this.player.games.length + 2) * delta;
        let x = 0;
        let y = 0;
        let current_height = 0;
        let max_height = 0;
        let min_height = 0;
        this.canvas.width = width + 50;
        this.plot_container.style.width = `${width + 50}px`;

        // this.pop_up = this.create_div("", "pop-up");
        // this.canvas.append(this.pop_up);

        // this.plot_container.addEventListener("mouseover", e => {
        //     this.pop_up.style.display = "flex";
        //     this.pop_up.style.width = "100px";
        //     this.pop_up.style.height = "100px";
        //     this.pop_up.style.backgroundColor = "red";
        //     let x = e.pageX - e.target.offsetLeft;
        //     let y = e.pageY - e.target.offsetTop;

        //     this.pop_up.innerHTML = x;
        //     this.pop_up.style.top = `100px`;
        //     this.pop_up.style.left = `${x}px`;
        // });

        for (let game of this.player.games) {
            if (this.win_game(game)) {
                current_height++;
            } else {
                current_height--;
            }
            if (max_height < current_height) max_height = current_height;
            if (min_height > current_height) min_height = current_height;
        }

        if (max_height < 10) {
            max_height = 10;
        } else {
            max_height = parseInt((max_height / 10).toFixed()) * 10;
        }

        if (min_height > -10) {
            min_height = -10;
        } else {
            min_height = parseInt((min_height / 10).toFixed()) * 10;
        }

        const height = Math.abs((max_height - min_height + 4) * delta);

        this.canvas.height = height;
        this.plot_container.style.height = `${height}px`;

        for (let current_height = min_height; current_height <= max_height; current_height += 10) {
            x = 0;
            y = -1 * (current_height - max_height - 2) * delta;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            x = width;
            this.ctx.lineTo(x, y);
            this.ctx.lineWidth = 0.3;
            if (current_height == 0) this.ctx.lineWidth = 1.2;
            this.ctx.stroke();

            this.ctx.font = "italic 12px Arial";
            this.ctx.textBaseline = "middle";
            this.ctx.textAlign = "start";
            this.ctx.fillText(current_height, width + 10, y);
        }

        x = width;
        y = -1 * (min_height - max_height - 2) * delta;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        y = -1 * -2 * delta;
        this.ctx.lineTo(x, y);
        this.ctx.lineWidth = 0.3;
        this.ctx.stroke();

        x = 0;
        y = -1 * (-max_height - 2) * delta;

        for (let game of this.player.games) {
            let color = "red";
            let delta_y = delta;
            if (this.win_game(game)) {
                color = "green";
                delta_y = -delta;
            }
            x += delta;
            y += delta_y;

            this.ctx.beginPath();
            this.ctx.fillStyle = color;
            this.ctx.arc(x, y, r, 0, 2 * Math.PI);
            this.ctx.fill();
        }

        this.plot_body.scrollLeft = width;
        this.plot_body.scrollTop = -1 * (current_height - max_height + 5) * delta;
    }
}
