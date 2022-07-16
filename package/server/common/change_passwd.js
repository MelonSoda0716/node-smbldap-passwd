'use strict'
require('log-timestamp');
const config = require('config');
const ldap = require('ldapjs');
const ssha = require("ssha");
const nthash = require('smbhash').nthash;

const ldap_server_host = config.get('ldap_server_host');
const ldap_server_port = config.get('ldap_server_port');
const ldap_base_dn = config.get('ldap_base_dn');

function changePassword(userName, passWordNow, passWordNew, callback){

    const ldap_options = {
        'rejectUnauthorized': false, 
    };
    
    const client = ldap.createClient({
    
        url: ldap_server_host+':'+ldap_server_port,
        reconnect: true,
        tlsOptions: ldap_options
    
    });

    const dn = "uid=" + userName + "," + ldap_base_dn;

    client.bind(dn, passWordNow, function (err, res) {
        
        if(err){
            
            console.log(userName + ":Error Reason:" + err);
            client.destroy();
            callback({ code: -1, message: '現在のパスワードが一致しません'});

        }
        else{

            const ssha_hash = ssha.create(passWordNew);
            const nt_hash = nthash(passWordNew);
            const unix_time = Math.round((new Date()).getTime() / 1000);
            
            //console.log('SSHA Hash: ' + ssha_hash);
            //console.log('NT Hash: ' + nt_hash);
            //console.log('UNIX Time: ' + unix_time);
        
            const change = {
                operation: 'replace',
                modification: {
                    userPassword: ssha_hash,
		            //shadowLastChange: unix_time,
                    sambaNTPassword: nt_hash,
                    sambaPwdLastSet: unix_time
                }
            };

            client.modify(dn, change, function (err) {

                if(err){
                    console.log(userName + ":Error Reason:" + err);
                    client.destroy();
                    callback({ code: -1, message: 'パスワードの変更に失敗しました 管理者にお問い合わせください' + err});

                }
                else{
                    console.log(userName + ":Password Changed.");
                    client.destroy();
                    callback({ code: 0, message: 'パスワードの変更が完了しました'});
                }
        
            });

        }

    });

}

exports.changePassword = changePassword;
