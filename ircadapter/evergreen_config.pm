#!/usr/bin/perl

package evergreen_config;
require Exporter;

use strict;

our @ISA = qw(Exporter);

our $VERSION = 1.00;

#################################################################

# Define the installation root direcotry
our $basedir = "./";

#################################################################

# The IRC servers to use
#
# THIS MUST BE IN SYNC with the list in InfoDialog.js!
#
# Name:hostname:port:limit
#
# UPDATE also reconnect count in my_sql_import_user if you add
# new server

our @serverlist = ( ["MeetAndSpeak", "localhost", 6667, 9999],
                    ["IRCNet", "ircnet.eversible.com", 6666, 100 ],
                    ["FreeNode", "irc.freenode.net", 6667, 5],
                    ["W3C", "irc.w3.org", 6665, 5]
    );

#################################################################

our $production_version = 0;

1;
