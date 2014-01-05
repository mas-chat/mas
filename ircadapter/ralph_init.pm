#!/usr/bin/perl

package ralph_init;
require Exporter;

use strict;
#use warnings FATAL => qw( all );

use ralph_timer;
use ralph_log;

our @ISA = qw(Exporter);
our @EXPORT = qw(%users init_users init_stats);

our $VERSION = 1.00;

our %users;
our %stats;

sub init_users
{
    my @users = $::redis->smembers("userlist");

    foreach my $id (@users)
    {
	dprint(1, 0, " Creating user: $id, " . $::redis->hget("user:$id", "email"));

	if (!exists($users{$id}))
        {
	    my $connectdelay = int(rand(120)) + 2;
            my @windows = $::redis->smembers("windowlist:$id");

            $users{$id}{"disabled"} = 0;

            # Make sure that we connect to Evergreen network
            foreach my $window (@windows)
            {
                # Format in Redis is "id:network:name"
                my $network = (split(":", $window))[1];

                if ($network != 0)
                {
                    # TODO: Uncomment! In development, dont' use remote servers.
                    #&addtimer(\&::ralph_connect_irc_user, $connectdelay, $id, $network);
                }
            }

            #MeetAndSpeak network, always, no delay
            &::ralph_connect_irc_user($id, 0);

            #Timeout is randomized to balance load
            my $offset = int(rand(60)) + 1;
            &addtimer(\&check_user, 60 + $offset, $id, 0);
        }

        # TODO: if restart
	#&queue_and_send_addline($userid, $winid, "<font color=\"red\">The MeetAndSpeak server has been restarted. You may have lost a line or two. $waittext</font><br>", 1, 2);
    }
}

#TODO: create ralph_stats.pm
sub init_stats
{
    $stats{"users"} = 0;
    $stats{"guests"} = 0;
}

sub check_user
{

}

1;
