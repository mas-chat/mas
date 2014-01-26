#!/usr/bin/perl -w

#
# (c) Copyright 2009 by Ilkka Oksanen. All rights reserved.
#

use strict;
#use warnings FATAL => qw( all );

#use local::lib '~/perl5';

use Getopt::Std;
use Mail::Sendmail;
use Proc::Daemon;
use Redis;

use FindBin;
use lib "$FindBin::Bin/../";
use evergreen_config;
use lib "$FindBin::Bin/";
use ralph_messages;
use ralph_irc;
use ralph_init;
use ralph_log;
use ralph_timer;
use ralph_ver;

#initialise debug module
my $dverbose = 0;
my $dstout = 0;
my $newlogfile = 0;
my $sendemail = 1;

our($opt_s, $opt_v, $opt_h, $opt_n, $opt_e);
getopts('svhne');

if (defined($opt_h))
{
    &print_usage();
    exit;
}

$dverbose = 1 if (defined($opt_v));
$dstout = 1 if (defined($opt_s));
$newlogfile = 1 if (defined($opt_n));
$sendemail = 0 if (defined($opt_e));

print "Server with ID: $server_id started.\n";

our $redis = Redis->new(
    server => 'localhost:6379',
    reconnect => 120, #(in seconds)
    every => 100, #(in ms)
    cnx_timeout => 60,
    read_timeout => 0.5,
    write_timeout => 1.2);

if ($dstout == 0)
{
    Proc::Daemon::Init;
}

$SIG{__DIE__} = \&log_die;
$SIG{__WARN__} = \&log_warn;

&dprint_init($dstout, $dverbose, $newlogfile, $sendemail, $server_id);

dprint(2, 0, "--- Starting server...$ralph_ver, id: $server_id");

dprint(1, 0, "Redis: importing users");

&init_users();

my $prev_min = (localtime(time))[1];
dprint(1, 0, "Main: starting for(1) loop");

while (1)
{
    #timeouts guarantees that this is executed at least once in a 2 seconds.
    &checktimers();

    my $min = (localtime(time))[1];

    if (($prev_min == 29 && $min == 30) || ($prev_min == 59 && $min == 0))
    {
        my $hour = (localtime(time))[2];
        &inform_day_change($hour, $min);
    }

    $prev_min = $min;

    &handle_irc_input($_, $sock);
}

sub log_die
{
    my $text = shift @_;
    dprint(1, 0, "PERL ERROR: " . $text);

    &create_mail($text, 'Ralph perl error detected', 1);
}

sub log_warn
{
    my $text = shift @_;
    dprint(1, 0, "PERL WARN: " . $text);

    &create_mail($text, 'Ralph perl warning detected', 0);
}

sub report_error
{
    my $text = shift @_;
    &create_mail($text, 'Ralph perl warning detected', 0);
}

sub create_mail
{
    my $text = shift @_;
    my $subject = shift @_;
    my $send_sms = shift @_;

    $text = $text . "\n\nBacktrace: \n\n";
    my $i = 1;

    while (defined((caller($i))[3]) &&
           defined((caller($i))[2]))
    {
        $text = $text . (caller($i))[3] . ", line: " . (caller($i))[2] . "\n";
        $i++;
    }

    my $version = "DEVEL:";

    if ($evergreen_config::production_version == 1)
    {
        $version = "PROD:";
    }

    my %mail = ( "To"      => 'iao@iki.fi',
                 "From"    => 'Evergreen admin <admin@meetandspeak.com>',
                 "Subject" => $version . " " . $subject,
                 "Message" => "Warning/error was \n\n $text \n\n -ilkka",
                 "Content-type" => 'text/plain; charset="utf8"'
        );
    sendmail(%mail);

    # TODO: remove password
    if($send_sms && $evergreen_config::production_version == 1)
    {
        %mail = ( "To"      => 'sms@messaging.clickatell.com',
                  "From"    => 'Evergreen admin <admin@meetandspeak.com>',
                  "Subject" => "Foobar",
                  "Message" => "user:ilkkao\npassword:-{removed}---\napi_id:3222033\nto:+-{removed-\ntext:Server crashed!",
                  "Content-type" => 'text/plain; charset="utf8"'
            );
        sendmail(%mail);
    }
}

sub ralph_connect_irc_user
{
    # TODO: horror
    my $id = shift @_;
    my $nw = shift @_;

    &connect_irc_user($id, $nw);
}


sub schedule_reconnect
{
    my $userid = shift @_;
    my $nw = shift @_;

    dprint(1, $userid, "IRC: lost connection to network $nw");

    if ($::shutdown_in_progress == 1)
    {
        return;
    }

    if (defined $users{$userid}{"reconnect_count"}{$nw})
    {
        $users{$userid}{"reconnect_count"}{$nw} =
            $users{$userid}{"reconnect_count"}{$nw} + 1;
    }
    else
    {
        $users{$userid}{"reconnect_count"}{$nw} = 1;
    }

    if ($users{$userid}{"reconnect_count"}{$nw} > 1)
    {
        &queue_and_send_addline_nw($userid, $nw, "<br>",0, 1, 0, 0);
    }

    if ($users{$userid}{"reconnect_count"}{$nw} > 4)
    {
        &queue_and_send_addline_nw($userid, $nw,
                                   " *** Error in connection to $evergreen_config::serverlist[$nw][0] after multiple attempts. Waiting " .
                                   " one hour before making another connection attempt. Close this window if you do not wish to retry.<br>",
                                   1, 1, 0, 0);
        $users{$userid}{"reconnect_count"}{$nw} = 0;
        &addtimer(\&connect_irc_user, 60 * 60, $userid, $nw);
    }
    elsif ($users{$userid}{"reconnect_count"}{$nw} == 4)
    {
        &queue_and_send_addline_nw($userid, $nw,
                                   " *** Lost connection to $evergreen_config::serverlist[$nw][0] server. Will try to" .
                                   " reconnect in 3 minutes.<br>", 1, 1, 0, 0);

        &addtimer(\&connect_irc_user, 60 * 3, $userid, $nw);
    }
    else
    {
        &queue_and_send_addline_nw($userid, $nw,
                                   " *** Lost connection to $evergreen_config::serverlist[$nw][0] server. Will try to" .
                                   " reconnect in 30 seconds.<br>", 1, 1, 0, 0);

        &addtimer(\&connect_irc_user, 30, $userid, $nw);
    }
}

sub print_usage
{
    print "Ralph.pl [-svn] , version $ralph_ver\n\n";
    print "Usage: -s, print debug data to STOUT in addition a log file (./ralph.log).\n";
    print "       -v, be verbose and print even more debug data\n";
    print "       -n, create, not append to log file\n\n";
}
