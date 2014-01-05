#!/usr/bin/perl

package ralph_timer;
require Exporter;

use strict;
#use warnings FATAL => qw( all );

use lib '../';
use evergreen_config;

# Example code:
#
#sub test
#{
#    my $var = shift @_;
#
#    dprint(1, "works: $var\n");
#}
#
#addtimer(\&test, 10, "one");
#
#addtimer(\&test, 11, "two");
#
#addtimer(\&test, 15, "three");
#
#

our @ISA = qw(Exporter);
our @EXPORT = qw(checktimers addtimer deletetimer);

our $VERSION = 1.00;

use ralph_log;

my %ralph_timeouts;

my $next_timer_id = 0;

sub addtimer # function, timeoutime (seconds in future), cookie, cookie 2
{
    my $func_ref = shift @_;
    my $timeouttime = shift @_;
    my $cookie1 = shift @_;
    my $cookie2 = shift @_;
    my $timeout_id;

    $timeouttime = time() + $timeouttime;
    $timeout_id = $next_timer_id++;

    $ralph_timeouts{$timeout_id} = [ $timeouttime, $func_ref, $cookie1, $cookie2 ];

    #dprint(1, 0, "added timer: $timeout_id");

    return $timeout_id;
}

sub deletetimer
{
    my $timeout_id = shift @_;

    #dprint(1, 0, "deleted timer: $timeout_id");

    if (exists($ralph_timeouts{$timeout_id}))
    {
        delete($ralph_timeouts{$timeout_id});
    }
    else
    {
        dprint(1, 0, "tried to delete unknown timer!");
    }
}

sub checktimers
{
    foreach my $timeout (keys %ralph_timeouts)
    {
        #TODO: First test is mystery, why it is needed? Without it server dies
        #add dprint to see what id is!! dprint id also when timer is created

        if (!defined($ralph_timeouts{$timeout}[0]))
        {
            dprint(2, 0, "Invalid timer id: $timeout");
        }

        if (defined($ralph_timeouts{$timeout}[0]) && $ralph_timeouts{$timeout}[0] < time())
        {
            my $cref = $ralph_timeouts{$timeout}[1];
            &$cref($ralph_timeouts{$timeout}[2], $ralph_timeouts{$timeout}[3]);

            delete($ralph_timeouts{$timeout});
            #dprint(1, 0, "exired timer: $timeout");
        }
    }
}

1;
