#!/usr/bin/perl

package ralph_windows;
require Exporter;

use strict;
#use warnings FATAL => qw( all );

our @ISA = qw(Exporter);
our @EXPORT = qw(window_get_id window_create window_get_ids_for_nw remove_all_names_from_channel_list add_name_to_channel_list add_names_to_channel_list get_chan_names);

our $VERSION = 1.00;

sub window_get_id
{
    my $userid = shift @_;
    my $channel = shift @_;
    my $nw = shift @_;

    my @windows = $::redis->smembers("windowlist:$userid");

    foreach my $window (@windows)
    {
        my ($windowid, $network, $name) = split(":", $window);

        if ($channel eq $name && $nw == $network)
        {
            return $windowid;
        }
    }

    return -1;
}

sub window_create
{
    # TODO: Remember to increase next win id

    #&queue_and_send_create($userid, $channel_id, 1);
    #&set_chan_window($userid, $channel_id, 1);
}

sub window_get_ids_for_nw
{
    my $userid = shift @_;
    my $nw = shift @_;
    my @result = ();

    my @windows = $::redis->smembers("windowlist:$userid");

    foreach my $window (@windows)
    {
        my ($windowid, $network, $name) = split(":", $window);

        if ($nw == $network)
        {
            push @result, $windowid;
        }
    }

    return @result;
}

sub remove_all_names_from_channel_list
{

}

sub add_name_to_channel_list
{

}

sub add_names_to_channel_list
{

}

sub get_chan_names
{

}
