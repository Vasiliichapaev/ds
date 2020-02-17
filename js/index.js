let main = new Main(players_data);

main.load_data().then(a => {
    main.calculation();
    main.display();
});
