class Main {
    constructor(players_dict) {
        this.players = [];
        for (let player_name in players_dict) {
            let player = new Player(player_name, players_dict[player_name]);
            this.players.push(player);
        }

        this.heroes = [];

        this.now = new Date();
        this.now_year = this.now.getFullYear();
        this.now_month = this.now.getMonth();
        this.now_day = this.now.getDate();

        this.table = new Table(this);
        // this.date_seector = new DateSelector(this);
    }

    async load_data() {
        let promise_list = [];

        let heroes = fetch(`https://api.opendota.com/api/heroStats`)
            .then(response => response.json())
            .then(result => {
                this.heroes = result;
            });
        promise_list.push(heroes);

        for (let player of this.players) {
            promise_list = promise_list.concat(player.load_games());
        }
        let all_promise = await Promise.all(promise_list);
        return all_promise;
    }

    calculation() {
        this.table.calculation();
    }
}

class Player {
    constructor(name, id_list) {
        this.name = name;
        this.id_list = id_list;
        this.games = [];
    }

    load_games() {
        let promise_list = [];
        for (let id of this.id_list) {
            let response = fetch(`https://api.opendota.com/api/players/${id}/matches`)
                .then(response => response.json())
                .then(result => {
                    this.games = this.games.concat(result);
                });
            promise_list.push(response);
        }
        return promise_list;
    }
}

class DateSelector {
    constructor(main) {
        this.main = main;
        this.table = table;

        this.current_year = main.now_year;
        this.current_month = main.now_month;

        this.selector_div = document.querySelector(".selector");
        this.year_selector = document.querySelector(".year-selector");
        this.month_selector = document.querySelector(".month-selector");

        this.selected_year = document.querySelector(".select-year");
        this.selected_month = document.querySelector(".select-month");

        this.selector_div.addEventListener("mouseleave", () => this.calculation_selected_month());

        for (let month_selector_div of this.month_selector.children) {
            month_selector_div.addEventListener("click", e => this.month_select(e));
        }

        this.board = document.querySelector(".board");
        this.tables = {};

        for (let year = this.current_year; year >= 2012; year--) {
            let year_number = document.createElement("div");
            year_number.classList.add("selectable-year");
            year_number.innerHTML = year;
            year_number.addEventListener("click", e => this.year_select(e));
            this.year_selector.append(year_number);

            let month_in_year = [];
            for (let month = 0; month <= 11; month++) {
                month_in_year.push(new MonthTable(this, year, month));
            }
            this.tables[year] = month_in_year;
        }
        this.substitute_current_date();
    }

    substitute_current_date() {
        this.selected_year.innerHTML = this.current_year;
        this.year_selector.children[this.now_year - this.current_year].classList.add("selected");

        this.selected_month.innerHTML = new Date(
            this.current_year,
            this.current_month
        ).toLocaleString("ru", {
            month: "long"
        });
        this.month_selector.children[this.current_month].classList.add("selected");
        this.current_month_obj = this.tables[this.current_year][this.current_month];

        this.board.append(this.current_month_obj.div);
    }

    calculation_selected_month() {
        this.board.children[0].remove();
        this.substitute_current_date();
        this.current_month_obj.calculation();
    }

    month_select(e) {
        let selected_month = e.target;
        for (let month of this.month_selector.children) {
            month.classList.remove("selected");
        }
        selected_month.classList.add("selected");
        this.current_month = selected_month.id;
    }

    year_select(e) {
        let selected_year = e.target;
        for (let year of this.year_selector.children) {
            year.classList.remove("selected");
        }
        selected_year.classList.add("selected");
        this.current_year = selected_year.innerHTML;
    }
}

class Table {
    constructor(main) {
        this.main = main;
        this.div = document.querySelector(".table");

        this.year = main.now_year;
        this.month = main.now_month;

        this.rows = [];

        let head_row = new HeadRow(this);
        this.div.append(head_row.div);
        this.rows.push(head_row);

        for (let player of this.main.players) {
            let row = new Row(this, player);
            this.div.append(row.div);
            this.rows.push(row);
        }
    }

    calculation() {
        this.days = new Date(this.year, this.month + 1, 0).getDate();
        this.start = new Date(this.year, this.month) / 1000;
        this.end = this.start + this.days * 24 * 3600;

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
}

class HeadRow extends Div {
    constructor(table) {
        super("row");
        this.table = table;
        this.days = [];

        let cell = this.create_div("", "player-name");
        cell.append(this.create_div("Игроки", "margin-auto"));
        this.div.append(cell);

        for (let day = 1; day <= 31; day++) {
            cell = this.create_div("", "cell");
            cell.append(this.create_div(day, "margin-auto"));
            this.div.append(cell);
            this.days.push(cell);
        }

        cell = this.create_div("", "cell");
        cell.append(this.create_div("W", "margin-auto"));
        this.div.append(cell);

        cell = this.create_div("", "cell");
        cell.append(this.create_div("L", "margin-auto"));
        this.div.append(cell);

        cell = this.create_div("", "wr");
        cell.append(this.create_div("W/(W+L)", "margin-auto"));
        this.div.append(cell);
    }

    calculation() {
        for (let day = 31; day > 28; day--) {
            this.days[day - 1].classList.remove("not-display");
        }

        for (let day = 31; day > this.table.days; day--) {
            this.days[day - 1].classList.add("not-display");
        }
    }
}

class Row extends Div {
    constructor(table, player) {
        super("row");
        this.table = table;
        this.player = player;
        this.days = [];

        let cell = this.create_div("", "player-name");
        cell.append(this.create_div(this.player.name, "player_name_container"));
        this.div.append(cell);

        for (let day = 1; day <= 31; day++) {
            cell = new Cell(this, day);
            this.div.append(cell.div);
            this.days.push(cell);
        }

        cell = this.create_div("", "cell");
        this.wins_cell = this.create_div("");
        cell.append(this.wins_cell);
        this.div.append(cell);

        cell = this.create_div("", "cell");
        this.loose_cell = this.create_div("");
        cell.append(this.loose_cell);
        this.div.append(cell);

        cell = this.create_div("", "wr");
        this.winrate_cell = this.create_div("");
        cell.append(this.winrate_cell);
        this.div.append(cell);
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

        for (let day of this.days) {
            day.calculation();
            this.month_wins += day.wins;
            this.month_looses += day.looses;
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
        this.div.append(this.win_div);
        this.div.append(this.loose_div);
    }

    calculation() {
        if (this.day > 27) {
            this.div.classList.remove("not-display");
        }
        if (this.day > this.table.days) {
            this.div.classList.add("not-display");
        }

        this.start = this.table.start + (this.day - 1) * 3600 * 24;
        this.end = this.start + 3600 * 24;

        this.games = this.row.games.filter(
            elem => elem.start_time >= this.start && elem.start_time < this.end
        );

        this.wins = this.games.filter(game => this.win_loose(game)).length;
        this.looses = this.games.filter(game => !this.win_loose(game)).length;

        this.win_div.innerHTML = "";
        this.loose_div.innerHTML = "";

        if (this.wins > 0) {
            this.win_div.innerHTML = this.wins;
        }

        if (this.looses > 0) {
            this.loose_div.innerHTML = this.looses;
        }
    }

    win_loose(game) {
        if (game.radiant_win && game.player_slot < 6) return true;
        if (!game.radiant_win && game.player_slot > 6) return true;
        return false;
    }

    ranked(game) {
        if (game.lobby_type == 7) return true;
        return false;
    }
}
