#!/usr/bin/perl

package ralph_misc;
require Exporter;

use strict;
#use warnings FATAL => qw( all );

use Symbol qw(qualify_to_ref);

our @ISA = qw(Exporter);
our @EXPORT = qw(get_ts);

our $VERSION = 1.00;

sub get_ts
{
    
    my ($sec,$min,$hour,$mday,$mon,$year,$wday,
	$yday,$isdst)=localtime(time);
    
    my $res_time = $hour * 60 + $min;

    return "<" . $res_time . ">";

}
