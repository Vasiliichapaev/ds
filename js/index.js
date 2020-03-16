let main = new Main(players_data);

main.load_data()
    .then(() => {
        main.calculation();
        main.display();
    })
    .catch(err => {
        main.error_load_data();
        console.log(err);
    });
