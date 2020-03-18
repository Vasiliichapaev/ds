class Main {
    constructor(players_data) {
        this.filter = new Filter(this);
        this.players = players_data.map(player_data => new Player(this, player_data));
        this.table = new Table(this);
        this.plot = new Plot(this);
    }

    load_data() {
        const heroes_promise = this.filter.hero_selector.load_data();
        let promise_list = [heroes_promise];
        this.players.forEach(player => {
             promise_list.push(player.load_games());
        });
        return Promise.all(promise_list);
    }

    calculation() {
        this.table.calculation();
        this.plot.drawing();
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
    
    filter_games() {
        this.players.forEach(player => player.filter_games());
    }

    add_new_player(player_data) {
        const player = new Player(this, player_data);
        this.players.push(player); 
        player.load_games().then(() => {
            const row = this.table.add_row(player);
            row.calculation();
        });
    }

}


class Div {
    constructor(...classes) {
        if (classes){
            this.div = this.create_div("", ...classes);
        }
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


class Player extends Div {
    constructor(main, player_data) {
        super();
        this.main = main;
        this.filter = main.filter;
        this.name = player_data.name;
        this.accounts = player_data.accounts;
        this.games = [];
    }

    load_games() {
        const promise_list = [];
        this.accounts.forEach(account => promise_list.push(this.load_account(account)));
        const promises = Promise.all(promise_list);
        return promises.then(() => this.sort_games());
    }

    load_account(account) {
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
        return response;
    }

    async sort_games() {
        this.games = this.games.filter(elem => elem.hero_id != 0);
        this.games.sort((a, b) => a.start_time - b.start_time);
        this.start_games = this.games;
    }

    filter_games() {
        const team = this.filter.team_selector.id;
        const result = this.filter.result_selector.id;
        const duration = this.filter.duration_selector.id;
        const hero = this.filter.hero_selector.id;
        const game_mode = this.filter.game_mod_selector.id;
        const lobby_type = this.filter.lobby_type_selector.id;
        const team_count = this.filter.team_count_selector.id;

        this.games = this.start_games;

        if (team == "0") {
            this.games = this.games.filter(game => game.player_slot < 6);
        } else if (team == "1") {
            this.games = this.games.filter(game => game.player_slot > 6);
        }
        if (result == "0") {
            this.games = this.games.filter(game => this.win_game(game));
        } else if (result == "1") {
            this.games = this.games.filter(game => !this.win_game(game));
        }
        if (duration != "") {
            this.games = this.games.filter(game => game.duration <= +duration * 60);
        }
        if (hero != "") {
            this.games = this.games.filter(game => game.hero_id == hero);
        }
        if (game_mode != "") {
            this.games = this.games.filter(game => game.game_mode == game_mode);
        }
        if (lobby_type != "") {
            this.games = this.games.filter(game => game.lobby_type == lobby_type);
        }
        if (team_count != "") {
            this.games = this.games.filter(game => game.party_size == team_count);
        }
    }

}


class Selector extends Div {
    constructor(filter, selector_number) {
        super();
        this.filter = filter;
        this.div = filter.div.children[1].children[selector_number];
        this.id = "";
        const head = this.div.children[0];
        const body = this.div.children[1];
        this.filter_cancel = head.children[1];
        this.current_select = body.children[0];
        this.select_list = body.children[1];
        this.current_select.addEventListener("click", () => this.show_select_list());
        this.filter_cancel.addEventListener("click", () => this.cancel());
        this.hide_select_list();
        this.add_select_to_list();
        this.hide_filter_cancel();
    }

    add_select_to_list() {
        for (let elem of this.select_list.children){
            elem.addEventListener("click", e => this.select(e));
        }
    }

    select(e) {
        this.hide_select_list();
        this.show_filter_cancel();
        this.id = e.target.id;
        this.current_select.innerHTML = e.target.innerHTML;
        this.filter.main.filter_games();
        this.filter.main.calculation();
        this.current_select.classList.remove("not-filtered");
    }

    hide_select_list() {
        this.select_list.classList.add("hide");
    }

    show_select_list() {
        this.filter.hide_selectors();
        this.select_list.classList.remove("hide");
    }

    hide_filter_cancel() {
        this.filter_cancel.classList.add("hide");
    }

    show_filter_cancel() {
        this.filter_cancel.classList.remove("hide");
    }

    cancel() {
        this.filter.hide_selectors();
        this.hide_filter_cancel();
        this.current_select.innerHTML = this.default_value;
        this.id  = "";
        this.filter.main.filter_games();
        this.filter.main.calculation();
        this.current_select.classList.add("not-filtered");
    }
}


class Filter {
    constructor(main) {
        this.main = main;
        this.div = document.querySelector(".filter");
        this.team_selector = new TeamSelector(this);
        this.result_selector = new ResultSelector(this);
        this.hero_selector = new HeroSelector(this);
        this.duration_selector = new DurationSelector(this);
        this.game_mod_selector = new GameModeSelector(this);
        this.lobby_type_selector = new LobbyTypeSelector(this);
        this.team_count_selector = new TeamCountSelector(this);

        document.addEventListener("click", e => {
            if (!this.div.contains(e.target)){
                this.hide_selectors();
            }
        })
    }

    hide_selectors() {
        this.team_selector.hide_select_list();
        this.result_selector.hide_select_list();
        this.hero_selector.hide_select_list();
        this.duration_selector.hide_select_list();
        this.game_mod_selector.hide_select_list();
        this.lobby_type_selector.hide_select_list();
        this.team_count_selector.hide_select_list();

    }
}


class TeamSelector extends Selector {
    constructor (filter) {
        super(filter, 0)
        this.default_value = "Обе команды"
    }

}


class ResultSelector extends Selector {
    constructor (filter) {
        super(filter, 1)
        this.default_value = "Любой"
    }

}



class DurationSelector extends Selector {
    constructor (filter){
        super(filter, 2)
        this.default_value = "Любая"
    }

}


class HeroSelector extends Selector {
    constructor (filter) {
        super(filter, 3)
        this.default_value = "Все герои"
        this.heroes_img = [];
        this.open_selector = true;
        this.hero_name = "";
        this.hero_id = "";
        document.addEventListener("keydown", e => this.key_check(e));
    }

    key_check(e) {
        if (this.open_selector) {
            if (e.key.search(/^[a-zA-Z]$/) == 0 || e.key == " ") {
                this.hero_name += e.key;
                e.preventDefault();
                this.select_hero_for_letters();
            } else if (e.key == "Backspace") {
                this.hero_name = this.hero_name.slice(0, this.hero_name.length - 1);
                this.select_hero_for_letters();
            } else if (e.key == "Enter" || e.key == "Escape") {
                this.select_hero_for_letters();
                this.enter_select();
            }
        }
    }

    load_data() {
        this.heroes = {};
        const heroes_promise = fetch(`https://api.opendota.com/api/heroStats`)
            .then(response => {
                if (!response.ok) throw Error("Ошибка сервера opendota");
                return response.json();
            })
            .then(result => {
                result.forEach(hero => {
                    this.heroes[hero.id] = hero;
                });
            });
        heroes_promise.then(() => this.add_heroes_in_list());
        return heroes_promise;
    }

    add_heroes_in_list() {
        for (let id in this.heroes) {
            let img_url = this.heroes[id].img;
            let hero_img = document.createElement("img");
            hero_img.addEventListener("click", e => this.select(e));
            hero_img.src = `https://api.opendota.com${img_url}`;
            hero_img.id = id;
            hero_img.title = this.heroes[id].localized_name;
            this.select_list.append(hero_img);
            this.heroes_img.push(hero_img);
        }
    }


    select(e) {
        this.id = e.target.id;
        this.hide_select_list();
        this.show_filter_cancel();
        this.filter.main.filter_games();
        this.filter.main.calculation();
        this.current_select.classList.remove("not-filtered");
    }

    enter_select() {
        this.id = this.hero_id;
        this.hide_select_list();
        this.show_filter_cancel();
        this.filter.main.filter_games();
        this.filter.main.calculation();
        this.current_select.classList.remove("not-filtered");
    }

    select_hero_for_letters() {
        let one_hero = 0;
        this.current_select.innerHTML = this.hero_name;
        this.heroes_img.forEach(hero_img => {
            if (hero_img.title.toLowerCase().search(this.hero_name.toLowerCase()) != -1) {
                hero_img.style.opacity = "100%";
                one_hero++;
                this.hero_id = hero_img.id;
            } else {
                hero_img.style.opacity = "10%";
            }
            if (one_hero != 1) this.hero_id = "";
        });
    }

    show_select_list() {
        this.filter.hide_selectors();
        this.select_list.classList.remove("hide");
        this.open_selector = true;
        this.current_select.innerHTML = "";
        this.hero_name = "";
        this.hero_id = "";
        this.select_hero_for_letters();
    }

    hide_select_list() {
        this.select_list.classList.add("hide");
        this.open_selector = false;
        if (this.id == "") {
            this.hero_name = "";
            this.current_select.innerHTML = "Все герои";
        } else {
            this.current_select.innerHTML = this.heroes[this.id].localized_name; 
        }
    }

}


class GameModeSelector extends Selector{
    constructor (filter){
        super(filter, 4)
        this.default_value = "Любой"
    }

}


class LobbyTypeSelector extends Selector{
    constructor (filter){
        super(filter, 5)
        this.default_value = "Любое"
    }

}



class TeamCountSelector extends Selector{
    constructor (filter){
        super(filter, 6)
        this.default_value = "Любой"
    }

}

class Table {
    constructor(main) {
        this.main = main;
        this.div = document.querySelector(".table-body");
        this.date_selector = new DateSelector(this);
        this.add_head_row();
        this.rows = [];
        this.main.players.forEach(player => this.add_row(player));
        this.rows[0].player_name_container.classList.add("player-name-select");
    }

    add_head_row() {
        this.head_row = new HeadRow(this);
        this.div.append(this.head_row.div);
    }

    add_row(player) {
        const row = new Row(this, player);
        this.div.append(row.div);
        this.rows.push(row);
        return row;
    }

    calculation() {
        this.year = this.date_selector.year;
        this.month = this.date_selector.month;
        this.days = new Date(this.year, this.month + 1, 0).getDate();
        this.start = new Date(this.year, this.month) / 1000;
        this.end = this.start + this.days * 24 * 3600;
        this.head_row.calculation();
        this.rows.forEach(row => row.calculation());
    }

    remove_hero_select() {
        this.rows.forEach(row => {
            row.div.children[0].classList.remove("player-name-select")
        });
    }
}


class DateSelector {
    constructor(table) {
        this.table = table;
        this.div = document.querySelector(".date-selector");
        this.now = new Date();
        this.current_year = this.now.getFullYear();
        this.current_month = this.now.getMonth();
        this.current_day = this.now.getDate();
        this.year = this.current_year;
        this.month = this.current_month;

        const previous_month = this.div.children[0];
        const date_box = this.div.children[1];
        const next_month = this.div.children[2];

        previous_month.addEventListener("click", () => this.previous_month());
        next_month.addEventListener("click", () => this.next_month());

        document.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft") this.previous_month();
            if (e.key === "ArrowRight") this.next_month();
        });

        const current_date = date_box.children[0];
        const date_list = date_box.children[1];
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
        if (date.getFullYear() > this.current_year) return;
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
        const year = this.table.date_selector.year;
        const month = this.table.date_selector.month;
        const current_year = this.table.date_selector.current_year;
        const current_month = this.table.date_selector.current_month;
        const current_day = this.table.date_selector.current_day;

        for (let day = 31; day > 28; day--) {
            this.cells[day - 1].classList.remove("not-display");
        }

        for (let day = 31; day > this.table.days; day--) {
            this.cells[day - 1].classList.add("not-display");
        }

        for (let day = 0; day < this.cells.length; day++) {
            this.cells[day].classList.remove("current-day");
            if (
                year == current_year &&
                month == current_month &&
                day + 1 == current_day
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

        this.player_name_container = this.create_div("", "player-name", "pointer");
        this.player_name_container.append(this.create_div(this.player.name, "player-name-container"));
        this.player_name_container.addEventListener("click", e => {
            this.table.main.plot.player = this.player;
            this.table.main.plot.drawing();
            this.table.remove_hero_select();
            this.player_name_container.classList.add("player-name-select");
        })
        this.div.append(this.player_name_container);

        this.add_cells();

        let cell = this.create_div("", "cell");
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
        this.heroes = this.cell.table.main.filter.hero_selector.heroes;

        this.cell.div.classList.remove("selectable-cell");
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
        this.heroes = this.row.table.main.filter.hero_selector.heroes;

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
            let games = this.games.filter(game => game.hero_id == id);
            let win_count = games.filter(game => this.win_game(game)).length;
            let loose_count = games.filter(game => !this.win_game(game)).length;
            hero_games.push([id, [win_count, loose_count, win_count + loose_count]]);
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

        this.cell.classList.add("selectable-cell");
        this.cell.append(this.div);
    }
}


class Plot extends Div{
    constructor(main) {
        super();
        this.main = main;
        this.player = main.players[0];
        this.div = document.querySelector(".plot");
        this.canvas = document.createElement("canvas");
        this.plot_head = this.create_div(this.player.name, "plot-head")
        this.plot_body = this.create_div("", "plot-body");
        this.plot_container = this.create_div("", "plot-container");
        this.plot_cover = this.create_div("", "plot-cover");
        this.plot_container.append(this.canvas, this.plot_cover);
        this.plot_body.append(this.plot_container);
        this.div.append(this.plot_head, this.plot_body);
        this.ctx = this.canvas.getContext("2d");
        this.plot_cover.addEventListener("mousemove", e => this.plot_scroll(e));
        this.plot_cover.addEventListener("mousedown", () => this.mousedown = true);
        document.addEventListener("mouseup", () =>  this.mousedown = false);
    }

    drawing() {
        this.remove_pop_up();

        this.plot_head.innerHTML = this.player.name;
        this.games = this.player.games;

        const r = 2.5;
        this.delta = r * 1.2 * 2 ** 0.5;
        let width = (this.games.length + 2) * this.delta;
        if (width < 1350) width = 1350;
        let x = 0;
        let y = 0;
        let current_y = 0;
        let max_y = 10;
        let min_y = -10;
        this.canvas.width = width + 50;
        this.plot_container.style.width = `${width + 50}px`;
        this.plot_cover.style.width = `${width + 50}px`;

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

        if (max_y - min_y < 80) {
            const dy = (80 - (max_y - min_y)) / 2;
            max_y += dy;
            min_y -= dy;
        }

        max_y = Math.ceil(max_y / 10) * 10;
        min_y = Math.floor(min_y / 10) * 10;

        let height = (max_y - min_y + 4) * this.delta;

        this.canvas.height = height;
        this.plot_container.style.height = `${height}px`;
        this.plot_cover.style.height = `${height}px`;

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

        if (this.games.length == 0) return;

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
    }

    add_hero_selector() {
        this.hero_selector = new HeroSelector(this, main.heroes);
        this.div.append(this.hero_selector.div);
    }

    remove_pop_up() {
        if (this.pop_up) this.pop_up.div.remove();
    }

    add_pop_up() {
        this.pop_up = new PlotPopUP(this);
        this.plot_container.append(this.pop_up.div);
    }

    plot_scroll(e) {
        if (this.mousedown) {
            this.plot_body.scrollLeft -= e.movementX;
            this.plot_body.scrollTop -= e.movementY;
        } else {
            this.pop_up.calculation(e.offsetX, e.offsetY);
        }
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
        const date = new Date(game.start_time * 1000).toLocaleDateString("ru");

        let offset = -100;
        if (game_number < 26) offset = 20;
        x = game_number * this.plot.delta - 1;

        let h = this.plot.canvas.height;
        if (y > h - 48) y = h - 48;

        this.plot_pop_up_details.innerHTML = `<p>${game_number}</p><p>${game.current_y}</p><p>${date}</p>`;
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
