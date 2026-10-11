#!/bin/dash

set -e

# Lighttpd config.
LIGHTTPD_CERT_DIR="/etc/lighttpd/certs"
LIGHTTPD_HOST="$(hostname --short)"
LIGHTTPD_CONFFILE="/etc/lighttpd/conf-available/10-ssl-local.conf"
lighttpd_config() {
    cat <<-EOF
	server.modules += ("mod_openssl")
	\$SERVER["socket"] == ":443" {
	    ssl.engine  = "enable"
	    ssl.pemfile = "$LIGHTTPD_CERT_DIR/$LIGHTTPD_HOST.pem"
	    ssl.privkey = "$LIGHTTPD_CERT_DIR/$LIGHTTPD_HOST-key.pem"
	}
	\$SERVER["socket"] == "[::]:443" {
	    ssl.engine  = "enable"
	    ssl.pemfile = "$LIGHTTPD_CERT_DIR/$LIGHTTPD_HOST.pem"
	    ssl.privkey = "$LIGHTTPD_CERT_DIR/$LIGHTTPD_HOST-key.pem"
	}

	server.modules += ("mod_redirect")
	\$HTTP["scheme"] == "http" {
	    \$HTTP["host"] =~ ".*" {
	        url.redirect = (".*" => "https://%0\$0")
	    }
	}
	EOF
}

########################################
## Utility functions.

echo() { printf '%s\n' "$@"; }
warn() { echo "$@" >&2; }
die() { set -- "${0##*/}: $@"; warn "$@"; exit 5; }
show() {
    local INDENT="${1:-}"
    while IFS='' read -r LINE; do
        echo "$INDENT$LINE"
    done
}

########################################

uniq() { LC_ALL=C sort --unique; }

# Ask user yes/no question. Return true if user answers nothing, or anything
# beginning with 'y', false otherwise.
confirm() {
    echo
    printf '> %s' "${@:-Continue?} [Y/n] "
    read -r answer
    case "$answer" in [Yy]*|'') return 0; esac
    return 1
}

# Given the name of a Debian package, install it after confirming that the user
# wants this.
prompt_and_install() {
    local DEB="$1"
    # Return if already installed.
    printf '>> %-50s' "$DEB"
    if dpkg -s "$DEB" >/dev/null 2>&1; then
        echo '[ installed ]'
        return 0
    else
        echo '[  missing  ]'
    fi

    # Prompt user.
    if ! confirm "\`$DEB\` is not installed your system. Install it?"; then
        echo "Skipping..."
        return 1
    fi

    # Install.
    echo "Running: sudo apt install \"$DEB\""
    sudo apt install "$DEB"
}

# Read & output file. Strip '#' comment & blank lines.
strip_comments() {
    while read -r LINE; do
        LINE="${LINE%%#*}"
        [ -n "$LINE" ] && printf '%s\n' "$LINE"
    done
}

# Given a list of IP numbers or domain names, find all matching lines in
# /etc/hosts and output all the IP numbers & domain names in them.
find_hosts() {
    local ETC_HOSTS="$1"; shift
    local KNOWN=" $* " HOSTS HOST
    while read -r HOSTS; do                    # read /etc/hosts line
        for HOST in $HOSTS; do                 #   intentionally unquoted
            case "$KNOWN" in                   #     if $HOST found in $KNOWN
                *" $HOST "*) echo $HOSTS       #       output all HOSTS
            esac
        done
    done <<-EOF
	$ETC_HOSTS
	EOF
}

# Look up config dir name of any runing Firefox instace. (Looks at any open
# files of running Firefox instance, to determine the path of sqlite databases
# for places, cookies or formhistory.)
get_running_firefox_confdir() {
    local PID
    PID="$(pgrep -o -x firefox)" || { warn 'Firefox not running'; return 1; }
    DIR=$(readlink /proc/"$PID"/fd/* 2>/dev/null \
           | grep -E '/(places|cookies|formhistory)\.sqlite' \
           | sed 's|/[^/]*$||' \
           | sort -u | head -n 1)
    [ -n "$DIR" ] || { warn "No Firefox profile found"; return 1; }
    echo "$DIR"
}

###############################################################################
## Main

show <<'EOF'
Make Sure Certification Tools Are Installed
-------------------------------------------
EOF
prompt_and_install mkcert          ||:
prompt_and_install libnss3-tools   ||:

show <<'EOF'

======================================================================

Set Up Local Certificate Authority (CA)
---------------------------------------
Runs `mkcert -install` to create a local Certificate Authority (CA) and add it
to all relevant system/browser trust stores. (This command can be safely re-run
many times, and will not affect any existing certificates.)

This creates a local CA, and installs a root certificat which is used for any
certificates you may create. (Run `mkcert -CAROOT` to get the CA root
directory.)

  1) `~/.local/share/mkcert/` (or `mkcert -CAROOT`)

  2) `/usr/local/share/ca-certificates/mkcert_development_CA_<serial>.crt`
     and runs `update-ca-certificates`. That adds a symlink in
     `/etc/ssl/certs/` and appends the CA to
     `/etc/ssl/certs/ca-certificates.crt`. Tools like `curl` and `wget` read
     this store.

  3) `~/.pki/nssdb/` (Chrome/Chromium) and/or
     `/.mozilla/firefox/<profile>/cert9.db` (Firefox). (This needs `certutil`
     from `libnss3-tools`)
EOF
if confirm "Run \`mkcert -install\`?"; then mkcert -install; fi

show <<'EOF'

======================================================================

Issue a Certificate for Localhost
---------------------------------
Finds all IP numbers and domain names specified in `/etc/hosts` for the local
machine, and generate one certificate that covers it all.

We don't really attempt find any fancy stuff like inserting domain globs
(`*.x.y`) higherlevel subdomains (no point in using glob with only top domain
`*.com`, and browsers tend to ignore that).
EOF
if confirm "Create certificate?"; then
    ETC_HOSTS="$(strip_comments </etc/hosts)"
    HOSTS="$(find_hosts "$ETC_HOSTS" ::1 127.0.0.1 | uniq)" # find localhost
    HOSTS="$(find_hosts "$ETC_HOSTS" $HOSTS        | uniq)" # find 2ndary IP
    mkcert \
        -cert-file "$LIGHTTPD_HOST.pem" \
        -key-file  "$LIGHTTPD_HOST-key.pem" \
        $HOSTS                                 # intentionally unquoted
fi

# Configure any Lighttpd web server to use new Certificates.
if command -v lighttpd >/dev/null; then
    # Put certs in good spot.
    show <<-EOF

	======================================================================

	Copy Certificate to \`/etc/lighttpd/\`
	------------------------------------
	Create directory \`$LIGHTTPD_CERT_DIR\` and copy the certificate files there,
	for use by the web server. Also makes sure file owner and permissions are set.
	EOF
    if confirm "Copy certificates to \`$LIGHTTPD_CERT_DIR/\`?"; then
        echo '' "Creating directory \`$LIGHTTPD_CERT_DIR/\`"
        sudo mkdir -p "$LIGHTTPD_CERT_DIR"
        echo '' "Copying files to \`$LIGHTTPD_CERT_DIR/\`"
        sudo cp -av "$LIGHTTPD_HOST.pem" "$LIGHTTPD_HOST-key.pem" \
             "$LIGHTTPD_CERT_DIR"
        echo '' 'Changing file ownership'
        sudo chown -v root:root \
             "$LIGHTTPD_CERT_DIR/$LIGHTTPD_HOST.pem" \
             "$LIGHTTPD_CERT_DIR/$LIGHTTPD_HOST-key.pem"
        echo '' 'Changing file permissios'
        sudo chmod -v 644 "$LIGHTTPD_CERT_DIR/$LIGHTTPD_HOST.pem"
        sudo chmod -v 600 "$LIGHTTPD_CERT_DIR/$LIGHTTPD_HOST-key.pem"
    fi

    show <<-EOF

	======================================================================

	Create Web Server Config for Lighttpd
	-------------------------------------

	Creates a separate Lighttpd config file, in
	\`/etc/lighttpd/conf-available/\` and enables it.

	    $LIGHTTPD_CONFFILE
	    ----------------------------------------
	$(lighttpd_config | show '    ')
	    ----------------------------------------

	To enable/disable this config yourself, use commands:

	    sudo lighttpd-enable-mod ssl-local
	    sudo lighttpd-disable-mod ssl-local

	Lighttpd is restarted to load the new config. Use:

	    sudo systemctl restart lighttpd
	EOF
    if confirm "Create config?"; then
        lighttpd_config | sudo tee "$LIGHTTPD_CONFFILE"

        # Enable the config
        [ -e '/etc/lighttpd/conf-enabled/10-ssl-local.conf' ] ||
            sudo lighttpd-enable-mod ssl-local

        # Test the created config.
        sudo lighttpd -tt -f /etc/lighttpd/lighttpd.conf

        # FIXME: If test fails, disabe the newly installed config
        # (It must be enabled for `lighttpd -tt` to work.)

        # Restart Lighttpd to load the config.
        sudo systemctl restart lighttpd
    fi
fi

# Add Cert to Running Firefox instance?
show <<'EOF'

======================================================================

Certificate in Running Firefox
------------------------------
Firefox uses its own certificate trust store by default, but can be made to use
the system trust store (drawback of this is that Firefox does its own auditing
of the certificates in their own trust store, and are faster to revoke trust
when an issuer go rogue).

  1) Open `about:config` in Firefox and accept the warning.
  2) Search for `security.enterprise_roots.enabled`.
  3) Set it to `true` and restart Firefox.

Another way is to simply add the trust to the Firefox's internal store. `mkcert
-install` (above) DOES add stuff to Firefox's default store, but with a custom
config directory `mkcert` won't be able to find the config dir.

Firefox keeps it trust store in its config dir. The file itself (an SQLite
database file) is called `cert9.db`, and resides in a directory like this:

    ~/.mozilla/firefox/wg2abxw6.default-release/cert9.db

EOF

if FIREFOX_CONFDIR="$(get_running_firefox_confdir "$PID")"; then

    # Test if Fifox has this cert already.
    printf '>> %-50s' "$FIREFOX_CONFDIR"
    if certutil -Ld "sql:$FIREFOX_CONFDIR" | grep -iq mkcert; then
        echo '[ installed ]'
    else
        echo '[  missing  ]'

        # Add Cert to Firefox?
        if confirm "Add certificate to \`$FIREFOX_CONFDIR\`?"; then
            certutil \
                -d "sql:$FIREFOX_CONFDIR" -A \
                -n "mkcert development CA" \
                -t "C,," \
                -i "$(mkcert -CAROOT)/rootCA.pem"
        fi
    fi
else
    warn 'Firefox not running'
fi

# Tell user that they'll have to configure web server themselves.
if ! command -v lighttpd >/dev/null; then
    show <<-'EOF'

	Lighttpd Not Installed
	----------------------
	You don't have Lighttpd installed, so you'll have to configure whatever
	web server you are using to use the new certificates yourself.

	EOF
fi

#EOF
