#!/usr/bin/perl

package ralph_ver;
require Exporter;

use strict;
#use warnings FATAL => qw( all );

our @ISA = qw(Exporter);
our @EXPORT = qw($ralph_ver);

our $VERSION = 1.00;

our $ralph_ver = "0.1";

1;
