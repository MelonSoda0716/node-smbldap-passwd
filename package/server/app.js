'use strict'
require('log-timestamp');

const config = require('config');
const web_server_host = config.get('web_server_host');
const web_server_port = config.get('web_server_port');
const web_server_key = config.get('web_server_key');
const web_server_cert = config.get('web_server_cert');

const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https').createServer({ key: fs.readFileSync(web_server_key), cert: fs.readFileSync(web_server_cert),}, app);

const helmet = require('helmet');
const session = require('express-session');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });
const flash = require('connect-flash');
const { check, validationResult } = require('express-validator');
const passport = require('./common/passport_ldap');
const change_passwd = require('./common/change_passwd');
const register_publickey = require('./common/register_publickey');

app.use(helmet());
app.use(express.json());
app.use(check());
app.use(express.urlencoded({ extended: true }));

app.use(flash());
app.use(session({
  secret: 'sercret_sercret',
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

/* ログイン状態の確認 */
const authMiddleware = function (req, res, next) {
    
  if(req.isAuthenticated()) {

    next();

  }
  else{

    res.redirect(302, '/');

  }

}

/* loginにリダイレクト */
app.get('/', function (req, res) {

  res.redirect("/login");

});

/* ログインフォーム */
app.get('/login', csrfProtection, function (req, res) {

  const authErrorMessage = req.flash('error');

  //console.log(authErrorMessage);

  if(authErrorMessage == ''){
    
    return res.render("login.ejs", {

      uid: '',
      password: '',
      errorMessage: null,
      authErrorMessage: null,
      csrfToken: req.csrfToken()

    });

  }

  res.render("login.ejs", {

    uid: '',
    password: '',
    errorMessage: null,
    authErrorMessage: authErrorMessage,
    csrfToken: req.csrfToken()

  });

});

/* ログインフォームからPOSTされた内容のバリデーション */
app.post('/login', csrfProtection, [
  check('uid').not().isEmpty().withMessage('ユーザ名を入力してください')
  .not().matches(/[^A-Za-z0-9-_.]/).withMessage('ユーザ名に使用できない文字列が含まれています'),
  check('password').not().isEmpty().withMessage('パスワードを入力してください')
  ],
  function (req, res, next) {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      const errors_array = errors.array();
      //console.log(errors_array);

      return res.render('login.ejs', {

        uid: req.body.uid,
        password: '',
        errorMessage: errors_array,
        authErrorMessage: null,
        csrfToken: req.csrfToken()

      });

    }
    
    next();

  },
);

/* バリデーション通過後の処理 */
app.post('/login', passport.authenticate('local', {

  //successRedirect: '/changepasswd',
  successRedirect: '/menu',
  failureRedirect: '/login',
  failureFlash: false,
  //badRequestMessage: ''
  }),

);

/* メニュー画面 */
app.get('/menu', authMiddleware, function (req, res) {

  res.render("menu.ejs");

});

/* パスワード変更フォーム */
app.get('/changepasswd', csrfProtection, authMiddleware, function (req, res) {
  
  //console.log(req.user);
  const errorMessage = req.flash('error');

  if(errorMessage == ''){

    return res.render('changepasswd.ejs', {

      uid: req.user,
      password: '',
      errorMessage: null,
      authErrorMessage: null,
      csrfToken: req.csrfToken()

    });

  }

  res.render('changepasswd.ejs', {

    uid: req.user,
    password: '',
    errorMessage: errorMessage,
    authErrorMessage: null,
    csrfToken: req.csrfToken()

  });

});

/* パスワード変更フォームからPOSTされた内容のバリデーション */
app.post('/changepasswd', csrfProtection, authMiddleware, [
  check('passwordNow').not().isEmpty().withMessage('現在のパスワードを入力してください'),
  check('passwordNew').not().isEmpty().withMessage('新しいパスワードを入力してください'),
  check('passwordNew').isLength({ min: 10, max: 32 }).withMessage('パスワードは10文字以上、32文字以下で設定してください')
  .isAscii().withMessage('全角文字は使用できません')
  .not().matches(/^$|\s+/).withMessage('空白は使用できません')
  .matches(/(?=.*?[a-z])/).withMessage('小文字英字(a~z)を含めてください')
  //.matches(/(?=.*?[A-Z])/).withMessage('大文字英字(A~Z)を含めてください')
  .matches(/(?=.*?[0-9])/).withMessage('数字(0~9)を含めてください')
  .matches(/(?=.*?[#?!@$%^&*-])/).withMessage('記号(#?!@$%^&*-)を含めてください'),
  check('passwordNew').custom((value, { req }) => {
      if (req.body.passwordNew === req.body.passwordConfirm) {
      return true;
      }
  }).withMessage('新しいパスワードが一致しません')
  ],
  function (req, res, next) {
      
    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      const errors_array = errors.array();
      //console.log(errors_array);
      return res.render('changepasswd.ejs', {

        uid: req.user,
        password: '',
        errorMessage: errors_array,
        authErrorMessage: null,
        csrfToken: req.csrfToken()

      });
    
    }

    next();

  }

);

/* バリデーション通過後の処理 */
app.post('/changepasswd', function (req, res) {
  
  //console.log(req.user,req.body);
  change_passwd.changePassword(req.user, req.body.passwordNow, req.body.passwordNew, function(result) {
  //console.log(result.code, result.message);  
  
    if(result.code == 0){

      return res.redirect("/success");
    
    }

    res.render('changepasswd.ejs', {

      uid: req.user,
      password: '',
      errorMessage: null,
      authErrorMessage: result.message,
      csrfToken: req.csrfToken()

    });

  });

});

/* 公開鍵登録フォーム */
app.get('/registerpublickey', csrfProtection, authMiddleware, function (req, res) {
  
  //console.log(req.user);
  const errorMessage = req.flash('error');

  if(errorMessage == ''){

    return res.render('registerpublickey.ejs', {

      uid: req.user,
      password: '',
      errorMessage: null,
      authErrorMessage: null,
      csrfToken: req.csrfToken()

    });

  }

  res.render('registerpublickey.ejs', {

    uid: req.user,
    password: '',
    errorMessage: errorMessage,
    authErrorMessage: null,
    csrfToken: req.csrfToken()

  });

});

/* 公開鍵登録フォームからPOSTされた内容のバリデーション */
app.post('/registerpublickey', csrfProtection, authMiddleware, [
  check('password').not().isEmpty().withMessage('パスワードを入力してください'),
  check('publickey').not().isEmpty().withMessage('公開鍵を入力してください'),
  check('publickey').isLength({ max:2048 }).withMessage('公開鍵の文字列の長さが許容範囲を超えています')
  ],
  function (req, res, next) {
      
    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      const errors_array = errors.array();
      //console.log(errors_array);
      return res.render('registerpublickey.ejs', {

        uid: req.user,
        password: '',
        errorMessage: errors_array,
        authErrorMessage: null,
        csrfToken: req.csrfToken()
        
      });
    
    }

    next();

  }

);

/* バリデーション通過後の処理 */
app.post('/registerpublickey', function (req, res) {
  
  //console.log(req.user,req.body);
  register_publickey.registerPublickey(req.user, req.body.password, req.body.publickey, function(result) {
  //console.log(result.code, result.message);  
  
    if(result.code == 0){

      return res.redirect("/success");
    
    }

    res.render('registerpublickey.ejs', {

      uid: req.user,
      password: '',
      errorMessage: null,
      authErrorMessage: result.message,
      csrfToken: req.csrfToken()

    });

  });

});


/* 設定完了 */
app.get('/success', csrfProtection, authMiddleware, function (req, res) {

  /* 強制ログアウト */
  req.logout();
  res.render('success.ejs');

});

app.use(function(req, res, next){
  res.status(404);
  res.end('404 Not Found : ' + req.path);
});

app.use(function(err, req, res, next){
  res.status(500);
  res.end('500 Internal Server Error : ' + err);
});

/* サーバ起動 */
https.listen(web_server_port, web_server_host, () => {

  console.log('Web Server!');

});