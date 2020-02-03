class Main {
    constructor(players_dict) {
        this.players = [];

        for (let player_name in players_dict) {
            let player = new Player(player_name, players_dict[player_name]);
            this.players.push(player);
        }

        this.heroes = [];
        this.selector = new Selector(this);
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
        this.selector.current_month_obj.calculation();
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

class Selector {
    constructor(mainframe) {
        this.main = mainframe;

        this.now = new Date();
        this.current_year = this.now.getFullYear();
        this.now_year = this.current_year;
        this.now_month = this.now.getMonth();
        this.current_month = this.now_month;
        this.now_day = this.now.getDate();

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

class MonthTable {
    constructor(selector, year, month) {
        this.selector = selector;
        this.main = selector.main;
        this.year = year;
        this.month = month;
        this.days = new Date(this.year, this.month + 1, 0).getDate();
        this.start = new Date(this.year, this.month) / 1000;
        this.end = this.start + this.days * 24 * 3600;
        this.calc = false;

        this.div = document.createElement("div");
        this.div.classList.add("month-table");

        this.head_row = new HeadRow(this);
        this.rows = [];

        for (let player of this.main.players) {
            this.rows.push(new Row(this, player));
        }
    }

    calculation() {
        if (!this.calc) {
            for (let row of this.rows) {
                row.calculation();
            }
            this.calc = true;
        }
    }
}

class HeadRow {
    constructor(month) {
        this.month = month;

        this.div = document.createElement("div");
        this.div.classList.add("row");
        month.div.append(this.div);

        let cell = document.createElement("div");
        cell.classList.add("player-name");
        this.div.append(cell);

        let player_name_head = document.createElement("div");
        player_name_head.classList.add("margin-auto");
        player_name_head.innerHTML = "Игроки";
        cell.append(player_name_head);

        for (let day = 1; day <= this.month.days; day++) {
            let cell = document.createElement("div");
            cell.classList.add("cell");
            var day_number = document.createElement("div");
            day_number.classList.add("margin-auto");
            day_number.innerHTML = day;
            cell.append(day_number);
            this.div.append(cell);
        }

        cell = document.createElement("div");
        cell.classList.add("cell");
        this.div.append(cell);

        day_number = document.createElement("div");
        day_number.classList.add("margin-auto");
        day_number.innerHTML = "W";
        cell.append(day_number);

        cell = document.createElement("div");
        cell.classList.add("cell");
        this.div.append(cell);

        day_number = document.createElement("div");
        day_number.classList.add("margin-auto");
        day_number.innerHTML = "L";
        cell.append(day_number);

        var wr = document.createElement("div");
        wr.classList.add("wr");
        this.div.append(wr);

        var wr_container = document.createElement("div");
        wr_container.classList.add("margin-auto");
        wr_container.innerHTML = "W/(W+L)";
        wr.append(wr_container);
    }
}

class Row {
    constructor(month, player) {
        this.month = month;
        this.player = player;
        this.days = [];

        this.div = document.createElement("div");
        this.div.classList.add("row");
        month.div.append(this.div);

        let cell = document.createElement("div");
        cell.classList.add("player-name");
        this.div.append(cell);

        let player_name_container = document.createElement("div");
        player_name_container.classList.add("player_name_container");
        player_name_container.innerHTML = this.player.name;
        cell.append(player_name_container);

        for (let day = 1; day <= this.month.days; day++) {
            this.days.push(new Cell(this, day));
        }

        this.wins_cell = document.createElement("div");
        this.wins_cell.classList.add("cell");
        this.div.append(this.wins_cell);

        this.loose_cell = document.createElement("div");
        this.loose_cell.classList.add("cell");
        this.div.append(this.loose_cell);

        this.winrate_cell = document.createElement("div");
        this.winrate_cell.classList.add("wr");
        this.div.append(this.winrate_cell);
    }

    calculation() {
        this.games = this.player.games.filter(
            elem => elem.start_time >= this.month.start && elem.start_time < this.month.end
        );

        this.month_wins = 0;
        this.month_looses = 0;

        for (let day of this.days) {
            day.calculation();
            this.month_wins += day.wins;
            this.month_looses += day.looses;
        }

        if (this.month_wins > 0) {
            let win = document.createElement("div");
            win.classList.add("win");
            win.innerHTML = this.month_wins;
            this.wins_cell.append(win);
        }

        if (this.month_looses > 0) {
            let loose = document.createElement("div");
            loose.classList.add("loose");
            loose.innerHTML = this.month_looses;
            this.loose_cell.append(loose);
        }

        if (this.month_looses + this.month_wins > 0) {
            let winrate = (this.month_wins / (this.month_looses + this.month_wins)).toFixed(2);

            if (winrate >= 0.5) {
                let win = document.createElement("div");
                win.classList.add("win");
                win.innerHTML = winrate;
                this.winrate_cell.append(win);
            } else {
                let loose = document.createElement("div");
                loose.classList.add("loose");
                loose.innerHTML = winrate;
                this.winrate_cell.append(loose);
            }
        }
    }
}

class Cell {
    constructor(row, day) {
        this.row = row;
        this.start = row.month.start + 24 * 3600 * (day - 1);
        this.end = row.month.start + 24 * 3600 * day;
        this.div = document.createElement("div");
        this.div.classList.add("cell");
        this.row.div.append(this.div);
    }

    calculation() {
        this.games = this.row.games.filter(
            elem => elem.start_time >= this.start && elem.start_time < this.end
        );

        this.wins = this.games.filter(game => this.win_loose(game)).length;
        this.looses = this.games.filter(game => !this.win_loose(game)).length;

        if (this.wins > 0) {
            let win = document.createElement("div");
            win.classList.add("win");
            win.innerHTML = this.wins;
            this.div.append(win);
        }

        if (this.looses > 0) {
            let loose = document.createElement("div");
            loose.classList.add("loose");
            loose.innerHTML = this.looses;
            this.div.append(loose);
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
