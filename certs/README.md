Configuring Lighttpd for Use with CGI and HTTPS
===============================================

I created this config file. (`nomi` is the name for my machine on my home
network, so it can be used on any machine while I'm at home.)

File: `/etc/lighttpd/conf-available/50-baremarknote-localhost.conf`

```
# Virtual host for local development site 'dedyn.nomi'/'dedyn.localhost'.
# (This also allows for CGI in `/api/FILE`.)

$HTTP["host"] =~ "^baremarknote\.(localhost|nomi)$" {
    server.document-root        = "/home/zrajm/Web/lal.dedyn.io"
    server.errorlog             = "/var/log/lighttpd/error-baremarknote-localhost.log"
    #accesslog.filename          = "/var/log/lighttpd/access-baremarknote-localhost.log"
    #server.error-handler-404    = "/e404.php"
    index-file.names            = ("index.html", "index.txt")

    # CGI only for executable files inside any /api/ directory.
    $HTTP["url"] =~ "/api/[^/]*$" {
        cgi.assign = ( "" => "" )          # no interpreter: run the file itself
        cgi.execute-x-only = "enable"      # only files with the +x bit
    }
}

#EOF
```

Then enable the above using the command.

```
# sudo lighttpd-enable-mod baremarknote-localhost
Enabling baremarknote-localhost: ok
Run "service lighttpd force-reload" to enable changes
sudo service lighttpd force-reload
```

Now, to test the result, run the following command.

```
# curl -v 'https://baremarknote.localhost/baremarknote/api/list'
```

And if the following command ends in a JSON, you know you've succeeded. (If it
outputs a shell script, then the script isn't really.


File: `/etc/hosts`

```
127.0.0.1  baremarknote.localhost baremarknote.nomi
```

<!--EOF-->
