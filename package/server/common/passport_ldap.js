'use strict'
require('log-timestamp');
const config = require('config');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const ldap = require('ldapjs');
const flash = require('connect-flash');
const e = require('connect-flash');

const ldap_server_host = config.get('ldap_server_host');
const ldap_server_port = config.get('ldap_server_port');
const ldap_base_dn = config.get('ldap_base_dn');


passport.use(new LocalStrategy({

    usernameField: 'uid',
    passwordField: 'password',
    passReqToCallback: true
    
    },
    function(req, uid, password, done) {
        
        const ldap_options = {
            'rejectUnauthorized': false, 
        };
        
        const client = ldap.createClient({
        
            url: ldap_server_host+':'+ldap_server_port,
            //reconnect: true,
            tlsOptions: ldap_options
        
        });
                
        function promiseBind() {
            return new Promise(function(resolve, reject) {
                const dn = "uid=" + uid + "," + ldap_base_dn;
                //console.log(dn);
                client.bind(dn, password, function(err) {
                    if(err){
                        console.log(uid + ":" + err);
                        client.destroy();
                        reject('ユーザー名もしくはパスワードが無効です');
                    }
                    else{
                        console.log(uid + ":Login successful.");
                        client.destroy();
                        resolve();
                    }
                });
            });
        }
        
        async function execution() {
            try {
                await promiseBind();
            }
            catch(error) {
                throw error;
            }
        }

        execution()
        .then(function() {
            done(null, uid);
        })
        .catch(function(error) {
            req.flash('error', error);
            done(null, false);
        });
        
    }

));

passport.serializeUser((user, done) => {

    done(null, user);
  
});

passport.deserializeUser((user, done) => {
  
    done(null, user);
  
});

module.exports = passport;