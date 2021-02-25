module.exports = function(app) {
    app.get('/', (req, res) => {
        res.render('index', {
            title: "WVCP"
        });
    });

    app.post('/popup', (req, res) => {
        if(!req.body || !req.body.id) return;

        if(req.body.title)
            res.render('popup', { title: req.body.title, id: req.body.id });
        else
            res.render('popup', { title: "WVCP FORM", id: req.body.id });
    });

    app.get('/result', (req, res) => {
        res.render('voteresult', { title: "WVCP" });
    });
}