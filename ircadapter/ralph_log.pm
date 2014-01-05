#!/usr/bin/perl

package ralph_log;
require Exporter;

use strict;
#use warnings FATAL => qw( all );

use evergreen_config;

our @ISA = qw(Exporter);
our @EXPORT = qw(dprint_init dprint_dispose dprint);

our $VERSION = 1.00;

my $logfile = $evergreen_config::basedir . "logs/ralph";
my $debug_stout = 0;
my $debug_verbose = 0;
my $send_email = 0;
my $log_file;
my $mails_sent = 0;

sub dprint_init
{
    $debug_stout = shift @_;
    $debug_verbose = shift @_;
    my $newfile = shift @_;
    $send_email = shift @_;
    my $id = shift @_;
    
    if ($newfile)
    {
	open $log_file, ">", $logfile . "." . $id . ".log" or die $!;
    }
    else
    {
	open $log_file, ">>", $logfile . "." . $id . ".log" or die $!;
    }

    dprint(1, 0, "Logging to: $logfile");

    my $ofh = select $log_file; # to disable buffering
    $| = 1;
    select $ofh;
    
    return;
}

sub dprint_dispose
{
    close $log_file;
    return;
}

sub dprint
{
    my $level = shift @_;
    my $userid = shift @_;
    my $msg = shift @_;

    if ($userid == 0)
    {
	$userid = "GEN";
    }

    return if ($level == 0 && !$debug_verbose);

    return if ($level == -1);

    my ($sec,$min,$hour,$mday,$mon,$year,$wday,
	$yday,$isdst)=localtime(time);
    my $times = sprintf "%02d-%02d-%02d %02d:%02d:%02d",
    $year-100,$mon+1,$mday,$hour,$min,$sec;

    print $log_file $times . " -" . $userid . "- " . $msg . "\n";
    
    if ($debug_stout)
    {
	print $times . " -" . $userid . "- " . $msg . "\n";
    }

    if ($level == 2 && $send_email == 1 && $mails_sent < 30)
    {
	&::create_mail($msg, "Serious (level 2) Ralph error");
	$mails_sent++;
    }

    return;
}

1;
