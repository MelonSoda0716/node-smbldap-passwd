FROM rockylinux/rockylinux

RUN yum update -y && dnf module -y reset nodejs && dnf module -y enable nodejs:14 && dnf module -y install nodejs:14/common && dnf install openssl && rm -rf /var/cache/yum/* && yum clean all

RUN mkdir -p /opt/{application,keys}

RUN openssl req -new -newkey rsa:2048 -sha256 -days 3650 -nodes -x509 -extensions v3_ca -keyout /opt/keys/cert.pem -out /opt/keys/cert.cer -subj "/C=/ST=/L=/O=/OU=/CN=/"

COPY entrypoint.sh /entrypoint.sh
RUN chmod 500 /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
