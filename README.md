# node-smbldap-passwd
LDAPユーザのLDAPパスワードとSambaパスワードをブラウザから変更&同期できるNode.js製Webアプリケーションです。  
オプションでSSH公開鍵登録も可能です。  
個人、研究室、小規模計算クラスタでの利用を想定しています。  
ローカルネットワークでの利用を強く推奨します。  

# Requirement
OpenLDAPサーバに下記のSchemaを登録する必要があります。
- samba
- openssh-lpk-openldap (Option)

各ユーザに下記の属性を登録する必要があります(SambaSID等の設定も実施してください)。  
- userPassword
- sambaNTPassword
- sambaPwdLastSet
- sshPublicKey (Option)

LDAPユーザがmodifyできるようにACLを設定する必要があります。
```
olcAccess: to attrs=userPassword,sambaNTPassword,sambaPwdLastSet,sshPublicKey
  by self write
```

# How to setup
**package/config/default.json**を環境に合わせて書き換えてください。  
```
{
    "web_server_host": "localhost",
    "web_server_port": 3000,
    "web_server_key": "/opt/keys/cert.pem",
    "web_server_cert": "/opt/keys/cert.cer",
    "ldap_server_host": "ldaps://127.0.0.1",
    "ldap_server_port": 636,
    "ldap_base_dn": "ou=People,dc=ldap,dc=example,dc=com"
}
```

LDAPパスワード及びSambaパスワードのクオリティはプログラム側でチェックしています。  
defaultでは下記の設定ですが**package/server/app.js**を書き換えることで変更可能です。  
- 10文字以上32文字以下であること
- 最低1文字以上の数字が含まれていること
- 最低1文字以上の記号(#?!@$%^&*-)が含まれていること

ビルドして起動します。
```
# docker-compose build
# docker-compose up -d
```

Webブラウザでアクセスできることを確認してください。  
```
https://localhost:3000/
```
