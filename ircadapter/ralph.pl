#!/usr/bin/perl -w

#
# (c) Copyright 2009 by Ilkka Oksanen. All rights reserved.
#

use strict;
#use warnings FATAL => qw( all );

use local::lib '~/perl5';

use Socket;
use IO::Epoll;
use Getopt::Std;
use Fcntl;
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

our $server_id = $ARGV[0];

if (!defined $server_id || $server_id =~ m/\D/)
{
    print "ERROR: Server id is mandatory\n";
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

END
{
    #delete PID file
    unlink($evergreen_config::basedir . "pids/$$");
}

our @serverstats;
$serverstats[$_] = 0 foreach (0 .. @evergreen_config::serverlist - 1);

#create PID file
open PIDFILE, ">", $evergreen_config::basedir . "pids/$$" or die ("Can't write pid file\n");
print PIDFILE "$server_id\n";
close PIDFILE;

our $shutdown_in_progress = 0;

$SIG{__DIE__} = \&log_die;
$SIG{__WARN__} = \&log_warn;

&dprint_init($dstout, $dverbose, $newlogfile, $sendemail, $server_id);

our %socket_table = ();

#0: type
#1: socket
#2: inbuffer
#3: outbuffer
#4: user
#5: nw id
#6: timer id
#7: pending close

sub TYPE_IRC { 2 };
sub TYPE_IDENT { 3 };

dprint(2, 0, "--- Starting server...$ralph_ver, id: $server_id");

# Create the listen sockets
my $listenident = &start_listen_socket(36000 + $server_id, 'tcp'); #for IDENT

#epfd is global because it's needed in ralph_irc
(our $epfd = epoll_create(30000)) >= 0 || die "epoll_create failed";

epoll_ctl($epfd, EPOLL_CTL_ADD, fileno($listenident), EPOLLIN) >= 0 || die "3epoll_ctl: $!\n";

dprint(1, 0, "Redis: importing users");
&init_users();

&init_stats();

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

    # take all handles in turn, timeout 1s
    my $ret = epoll_wait($epfd, 10, 1000);

    foreach my $event (@$ret)
    {
	my ($file_desc, $mask) = @$event;

	if ($mask & EPOLLIN)
        {
	    my $data;

	    if ($file_desc == fileno($listenident))
	    {
		&handle_socket_accept($listenident, TYPE_IDENT);
	    }
	    elsif (exists($socket_table{$file_desc}))
	    {
		my $sock = $socket_table{$file_desc}[1];
		my $rv = sysread($sock, $data, 3000);

		if (!defined($rv) || $rv == 0)
     		{
		    $rv = "undef" if (!defined($rv));
		    dprint(1, 0, "Socket not readable anymore, rv = $rv");
		    &handle_socket_close($sock);
		}
		else
		{
		    #add possible partial line from the previous round
		    $socket_table{$file_desc}[2] .= $data;
		    my $request = $socket_table{$file_desc}[2];

		    if ($socket_table{$file_desc}[0] == TYPE_IDENT)
		    {
			if ($request =~ m/\r\n$/)
			{
			    &handle_ident_input($request, $sock);
			}
		    }
		    elsif ($socket_table{$file_desc}[0] == TYPE_IRC)
		    {
			my @rows = split /\r\n/, $request;

			if (!($request =~ m/\r\n$/))
			{
			    #last line is partial, store it for the next round
			    $socket_table{$file_desc}[2] = pop(@rows);
			}
			else
			{
			    $socket_table{$file_desc}[2] = "";
			}

			foreach (@rows)
			{
			    dprint(0, $socket_table{$file_desc}[4], "IRC: $_") if (!(m/372/) && !(m/PRIVMSG/));
			    &handle_irc_input($_, $sock);
			}
		    }
		}
	    }
	    else
	    {
		dprint (1, 0, "Strange FD: $file_desc ready for reading");
		POSIX::close($file_desc);
	    }
	}

	if ($mask == EPOLLHUP || $mask == EPOLLERR || $mask == (EPOLLHUP | EPOLLERR))
	{
	    #TODO: remove if this is impossible
	    dprint(2, 0, "RCVD unexpected epoll event: $file_desc, full mask: $mask, error in logic");
	}

	if ($mask & EPOLLOUT)
        {
	    if (!exists $socket_table{$file_desc})
	    {
		#should never happen
		dprint (1, 0, "Strange FD: $file_desc ready for writing");
		POSIX::close($file_desc);
		next;
	    }

	    my $sock = $socket_table{$file_desc}[1];

	    if ($socket_table{$file_desc}[7] == 1 && $socket_table{$file_desc}[3] eq "")
	    {
		dprint(0, 0, "Executing pending close");
		&handle_socket_close($sock);
	    }
	    else
	    {
		my $rv = syswrite($sock, $socket_table{$file_desc}[3]);

		if (!defined $rv || $rv == 0)
		{
		    $rv = "undef" if (!defined($rv));
		    dprint(1, 0, "Socket not writable anymore, rv = $rv");
		    &handle_socket_close($sock);
		}
		elsif ($rv == length $socket_table{$file_desc}[3])
		{
		    $socket_table{$file_desc}[3] = '';

		    #All is written
		    if ($socket_table{$file_desc}[0] == TYPE_IRC)
		    {
			#It's IRC socket, keep reading
			epoll_ctl($epfd, EPOLL_CTL_MOD, $file_desc, EPOLLIN) >= 0 ||
			    dprint(2, $socket_table{$file_desc}[4], "epoll_ctl3: $! fd: $file_desc");
		    }
		    else
		    {
			my $userid = $socket_table{$file_desc}[4];

			#IDENT sockets are closed after first complete write
			$socket_table{$file_desc}[7] = 1; #close is now pending
		    }
		}
		else
		{
		    substr($socket_table{$file_desc}[3], 0, $rv) = '';
		}
	    }
	}
    }
}

sub handle_socket_close
{
    my $sock = shift @_;
    my $file_desc = fileno($sock);

    if ($socket_table{$file_desc}[0] == TYPE_IRC)
    {
	my $nw = $socket_table{$file_desc}[5];
	my $userid = $socket_table{$file_desc}[4];

	#update stats
	### if ($users{$userid}{"connected"}[$nw] == 1)
	{
	    $serverstats[$nw]--;
	}

	#extra steps for IRC socket
	### $users{$userid}{"isocket"}[$nw] = undef;
	### $users{$userid}{"connected"}[$nw] = 0;
	&schedule_reconnect($userid, $nw);
    }

    delete $socket_table{$file_desc};
    &close_and_remove_socket($sock);
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

sub handle_socket_accept
{
    my $listensock = shift @_;
    my $type = shift @_;
    my $timer = undef;

    if (accept(my $sock, $listensock))
    {
	nonblock($sock);
	epoll_ctl($epfd, EPOLL_CTL_ADD, fileno($sock), EPOLLIN) >= 0 ||
	    die "epoll_ctl: $!\n";

	$socket_table{fileno($sock)} = [$type, $sock, "", "", undef, undef, $timer, 0];
	dprint(-1, 0, "New $type client FD: " . fileno($sock));
    }
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

# nonblock($socket) puts socket into nonblocking mode
# from Perl cookbook
sub nonblock {
    my $socket = shift;
    my $flags;

    $flags = fcntl($socket, F_GETFL, 0)
	or die "Can't get flags for socket: $!\n";
    fcntl($socket, F_SETFL, $flags | O_NONBLOCK)
	or die "Can't make socket nonblocking: $!\n";
}

sub close_and_remove_socket
{
    my $sock = shift @_;

    if (!defined($sock))
    {
	return;
    }

    epoll_ctl($::epfd, EPOLL_CTL_DEL, fileno($sock), 0) >= 0 ||
	dprint(2, 0, "Suspicious close: epoll_ctl: $!");
    close($sock);
    dprint(0, 0, "Closed socket: $sock");
}

sub kill_irc_connection
{
    my $userid = shift @_;
    my $nw = shift @_;

    my $rh = $users{$userid}{"isocket"}[$nw];

    $users{$userid}{"isocket"}[$nw] = undef;

    if (defined($rh))
    {
	delete $socket_table{fileno($rh)};
	&close_and_remove_socket($rh);
    }

    if (defined($users{$userid}{"last_ping"}{$nw}))
    {
	#delete ping information, disables ping timeout checking
        delete $users{$userid}{"last_ping"}{$nw};
    }

    #TODO: fix me, got more complicated
    #if ($shutdown_in_progress && !keys %ircinbuffer)
    #{
    #	exit(0);
    #}
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

sub handle_ident_input
{
    $_ = shift @_;
    my $sock = shift @_;
    dprint(1, 0, "IDENT: Request received $_");

    m/(\d+)\s*,\s*(\d+)/;
    my $query_local = $1;
    my $query_remote = $2;

    my $found = 0;
    my $resp;

    if (defined($query_local) && defined($query_remote))
    {
	foreach my $user (keys %users)
	{
	    for(my $i = 0; $i < @evergreen_config::serverlist; $i++)
	    {
		my $sock = $users{$user}{"isocket"}[$i];

		if (defined $sock)
		{
		    my $localsockaddr = getsockname($sock);
		    my $remotsockaddr = getpeername($sock);

		    if (defined($localsockaddr) && defined($remotsockaddr))
		    {
			my ($localport, $iaddr) = sockaddr_in($localsockaddr);
			my ($remoteport, $riaddr) = sockaddr_in($remotsockaddr);

			if ($localport == $query_local && $remoteport ==
			    $query_remote)
			{
			    $resp = "$query_local, $query_remote : USERID : UNIX : "
				. $users{$user}{"nick"} . "\r\n";
			    $found = 1;
			    last;
			}
		    }
		}
	    }
	}

	if (!$found)
	{
	    $resp = "$query_local, $query_remote : ERROR : NO-USER\r\n";
	}

	&schedule_write($sock, $resp);
	dprint(1, 0, "IDENT: Resp: $resp");
    }
    else
    {
	dprint(1, 0, "IDENT: Received malformed request. Not replying");
	&close_and_remove_socket($sock);
    }
}

sub start_listen_socket
{
    my $port = shift @_;
    my $proto = shift @_;
    my $s;

    socket($s, PF_INET, $proto eq 'udp' ? SOCK_DGRAM :SOCK_STREAM, getprotobyname($proto));

    setsockopt($s, SOL_SOCKET, SO_REUSEADDR, 1);
    bind($s, sockaddr_in($port, INADDR_ANY)) or die ("Can't bind");

    if ($proto eq 'tcp')
    {
	listen($s, 1600) or die ("Can't listen");
    }
    nonblock($s);

    return $s;
}

sub schedule_write
{
    my $socket = shift @_;
    my $data = shift @_;

    my $file_desc = fileno($socket);

    $socket_table{$file_desc}[3] .= $data;

    epoll_ctl($::epfd, EPOLL_CTL_MOD, fileno($socket), EPOLLIN | EPOLLOUT) >= 0 ||
	dprint (2, $socket_table{$file_desc}[4], "epoll_ctl: $! fd: $file_desc");
}

sub print_usage
{
    print "Ralph.pl [-svn] <serverid>, version $ralph_ver\n\n";
    print "Usage: -s, print debug data to STOUT in addition a log file (./ralph.log).\n";
    print "       -v, be verbose and print even more debug data\n";
    print "       -n, create, not append to log file\n\n";
}
