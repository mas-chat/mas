#!/usr/bin/perl

use CGI qw(:standard);
use CGI::Cookie;
use DBI;
use strict;

use FindBin;
use lib "$FindBin::Bin/../";
use evergreen_config;

my $url = param("u");
my $message;

print "Content-type: text/html; charset=ISO-8859-1\n\n";

{
    local $/ = undef;
    open FILE, "$evergreen_config::basedir/html/register_openid.html" or die "Couldn't open file: $!";
    $message = <FILE>;
    close FILE;
}

my $title = "Complete your OpenID registration.";
my $data1 = "This is the first time you are using OpenID URL <b>$url</b> with MeetAndSpeak. Please fill in the form below to complete your registration.";

if ($url =~ m/^https:\/\/me\.yahoo\.com/)
{
    $title = "Yahoo just confirmed that you have an Yahoo! account.";
    $data1 = "This is the first you are using Yahoo! account to log into MeetAndSpeak. Please fill in the form below to complete your registration. You have to complete this step only once.<p>(URL: <i>$url</i>)";
}
elsif ($url =~ m/^https:\/\/www\.google\.com\/accounts\/o8/)
{
    $title = "Google just confirmed that you have a Google account.";
    $data1 = "This is the first you are using Google account to log into MeetAndSpeak. Please fill in the form below to complete your registration. You have to complete this step only once.<p>(URL: <i>$url</i>)";
}

$message =~ s/<register_title>/$title/;
$message =~ s/<data1>/$data1/;
$message =~ s/<url>/$url/g;

print $message;

