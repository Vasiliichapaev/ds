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
}

class Table {
    constructor(main) {
        this.main = main;
        this.div = document.querySelector(".table");

        this.year = main.now_year;
        this.month = main.now_month;
        this.days = new Date(this.year, this.month + 1, 0).getDate();

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

        this.calculation();
    }

    calculation() {
        for (let day = 31; day > 28; day--) {
            this.days[day - 1].classList.remove("not-display");
        }

        for (let day = 31; day > this.table.days; day--) {
            this.days[day - 1].classList.add("not-display");
        }

        for (let day = 0; day < this.days.length; day++) {
            this.days[day].classList.remove("current-day");
            if (
                this.table.year == this.table.main.now_year &&
                this.table.month == this.table.main.now_month &&
                day + 1 == this.table.main.now_day
            ) {
                this.days[day].classList.add("current-day");
            }
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
        cell.append(this.create_div(this.player.name, "player-name-container"));
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

        this.win_games = this.games.filter(game => this.win_loose(game));
        this.loose_games = this.games.filter(game => !this.win_loose(game));

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
    }

    win_loose(game) {
        if (game.radiant_win && game.player_slot < 6) return true;
        if (!game.radiant_win && game.player_slot > 6) return true;
        return false;
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
        this.month = selected_month.id;
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
