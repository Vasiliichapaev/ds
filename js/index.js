const players_dict = {
    VChapaev: [117990545, 254920273],
    Neeeeeerf: [102756891],
    JohnGalt: [41528404],
    Megabit: [84502939],
    Alexfov: [313885294],
    Alexfov2: [153901833],
    BloOdTerrOr: [120491980]
};

let main = new Main(players_dict);

main.load_data().then(a => {
    main.calculation();
});
