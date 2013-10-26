#!/usr/bin/perl

use CGI qw(:standard);
use CGI::Cookie;
use DBI;
use strict;

use FindBin;
use lib "$FindBin::Bin/../";
use evergreen_config;

my $channel = param("i");
my $message;

$channel =~ s/^\///;
my $uchannel = ucfirst($channel);

#my $cookie = new CGI::Cookie(-name=>'ProjectEvergreenJoin',-value => $channel);

#print "Set-Cookie: ",$cookie->as_string,"\n";
print "Content-type: text/html; charset=ISO-8859-1\n\n";

{
    local $/ = undef;
    open FILE, "$evergreen_config::basedir/html/join.html" or die "Couldn't open file: $!";
    $message = <FILE>;
    close FILE;
}

my $dbh = DBI->connect("DBI:mysql:milhouse", "ircuser", "zeppelin",
		       {
			   mysql_enable_utf8 => 1,
			   on_connect_do => [ "SET NAMES 'utf8'", "SET CHARACTER SET +'utf8'" ],
		       });

$dbh->{'mysql_enable_utf8'} = 1;

my $sth = $dbh->prepare("SELECT password FROM groups WHERE name = \'$channel\'");
$sth->execute;

if($sth->rows != 0)
{    
    $message =~ s/<grp>/$uchannel/g;

    my @ret = $sth->fetchrow_array();
    
    if (!($ret[0] =~ m/^\s*$/))
    {
	$message =~ s/var pw_needed = false/var pw_needed = true/;
    }

    print $message;
}
else
{
    print "Group doesn't exist";
}
