const express = require('express');
const app = express();

require('dotenv').config()

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extented: true }));

const MongoClient = require('mongodb').MongoClient;

const methodOverride = require('method-override');
app.use(methodOverride('_method'));


app.set('view engine', 'ejs');
app.use('/public', express.static('public'));

var db;

MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true }, function (error, client) {
    if (error) return console.log(error);
    db = client.db('khosdb');

    //db.collection('post').insertOne({이름 : '계호성', 나이 : '49'},function(err,rslt){
    //    console.log('저장완료');
    //});

    app.listen(process.env.PORT, function () {
        console.log('listening on 8080');
    });
})

app.get('/pet', function (req, res) {
    res.send('펫 쇼핑몰')
});

app.get('/beauty', function (req, res) {
    res.send('Beauty 쇼핑몰')
});

app.get('/', function (req, res) {
    res.render('index.ejs')
});

app.get('/write', function (req, res) {
    //console.log(req);
    res.render('write.ejs')
});

app.post('/add', function (req, res) {
    //res.send('전송완료')
    console.log(req.body);
    console.log(req.body.title);
    console.log(req.body.date);

    db.collection('counter').findOne({ name: '게시물갯수' }, function (err, rslt) {
        console.log(rslt.totalpost);
        var maxno = rslt.totalpost;

        db.collection('post').insertOne({ _id: maxno + 1, 할일: req.body.title, 일자: req.body.date }, function (err, rslt) {
            console.log('저장완료');
        });

        db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalpost: 1 } }, function (err, rslt) {
            if (err) { return console.log(err) }
        })

    })
    res.redirect('/list')
});


app.get('/list', function (req, res) {
    console.log(req.body);
    db.collection('post').find().toArray(function (err, rslt) {
        console.log(rslt);
        res.render('list.ejs', { posts: rslt });
    });

});

app.get('/search', (req, res) => {
    console.log(req.query.value);
    var srch_cond = [
        {
            $search: {
                index: 'todoSearch',
                text: {
                    query: req.query.value,
                    path: '할일'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
                }
            }
        }
    ];

    //db.collection('post').find( { $text : { $search: req.query.value }} ).toArray(function (err, rslt) {
    db.collection('post').aggregate(srch_cond).toArray(function (err, rslt) {
        console.log(rslt);
        res.render('search.ejs', { posts: rslt });
    });

})



app.delete('/delete', function (req, res) {
    console.log(req.body);
    req.body._id = parseInt(req.body._id);
    db.collection('post').deleteOne(req.body, function (err, rslt) {
        console.log('삭제완료');
        res.status(200).send({ message: '성공했습니다.' });
    });

});


app.get('/detail/:id', function (req, res) {
    //console.log(req.body);
    db.collection('post').findOne({ _id: parseInt(req.params.id) }, function (err, rslt) {
        console.log(rslt);
        res.render('detail.ejs', { data: rslt });
    });

});

app.get('/edit/:id', function (req, res) {
    db.collection('post').findOne({ _id: parseInt(req.params.id) }, function (err, rslt) {
        console.log(rslt);
        res.render('edit.ejs', { data: rslt });
    });

})

app.put('/edit', function (req, res) {
    db.collection('post').updateOne({ _id: parseInt(req.body.id) }, { $set: { 할일: req.body.title, 일자: req.body.date } }, function (err, rslt) {
        console.log('수정완료');
        //res.render('edit.ejs', { data : rslt });
        res.redirect('/list')
    });

})


const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({ secret: 'khos_secret', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());


app.get('/login', function (req, res) {
    res.render('login.ejs')
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/fail' }), function (req, res) {
    res.redirect('/');
});

app.get('/mypage', isLogin, function (req, res) {
    console.log(req.user);
    res.render('mypage.ejs', { 사용자: req.user });
})

function isLogin(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.send('로그인 후 사용할 수 있습니다.');
    }
}

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
    console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
        if (에러) return done(에러)

        if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
        if (입력한비번 == 결과.pw) {
            return done(null, 결과)
        } else {
            return done(null, false, { message: '비번틀렸어요' })
        }
    })
}));

passport.serializeUser(function (user, done) {
    done(null, user.id)
});

passport.deserializeUser(function (아이디, done) {
    db.collection('login').findOne({ id: 아이디 }, function (err, rslt) {
        done(null, rslt);
    })

});

app.post('/register', function (req, res) {
    db.collection('login').insertOne({ id: req.body.id, pw: req.body.pw }, function (에러, 결과) {
        res.redirect('/')
    })
})
