#!/usr/bin/perl -w

#
# (c) Copyright 2009 by Ilkka Oksanen. All rights reserved.
#

use strict;
use FindBin;
use lib "$FindBin::Bin/../conf";
use evergreen_config;

my $dir = $ARGV[1];

my @pages = ( "guide", "privacy_and_tou", "about", "join", "ready", "register", "register_openid", "resetpw", "features", "error", "wait", "completed", "register_description", "developers"); #"tour", 

my $header = readfile("header");
my $qooxdoo_header = $header;

$qooxdoo_header =~ s/<!--qooxdoo here-->/<script type=\"text\/javascript\" src=\"script\/login.js\"><\/script>/;	

my $footer = readfile("footer");

system("mkdir -p build");
system("rm -fr build/*");
system("mkdir -p msgsbuild");
system("rm -fr msgsbuild/*");

print "Generate.pl: processing: ";

foreach (@pages)
{
    print  "$_, ";

    my $page = readfile($_);

    if ($_ eq "wait" || $_ eq "completed")
    {
	open FILE2, ">", "msgsbuild/$_.html" or die "$!";
    }
    else
    {
	open FILE2, ">", "build/$_.html" or die "$!";
    }

    if ($_ eq "register" || $_ eq "resetpw" || $_ eq "register_openid")
    {
	print FILE2 $qooxdoo_header;
    }
    else
    {
	print FILE2 $header;
    }

    print FILE2 $page;
    print FILE2 $footer;
    close FILE2;
}

print "\n";

sub readfile
{
    my $file = shift;
    my $data = "";

    open FILE, "<", $file or die "$!: " . $file;
    binmode(FILE);
	    
    my $b;

    while (read(FILE,$b,1000)) 
    {    
	$data = $data . $b;
    }
    close FILE;

    return $data;
}


