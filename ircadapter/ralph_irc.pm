#!/usr/bin/perl

package ralph_irc;
require Exporter;

use strict;
#use warnings FATAL => qw( all );

use IO::Epoll;
use Encode;
use CGI;
use Socket;

use lib '../';
use evergreen_config;
use ralph_init;
use ralph_messages;
use ralph_windows;
use ralph_log;
use ralph_misc;
use ralph_timer;

our @ISA = qw(Exporter);
our @EXPORT = qw(handle_irc_input connect_irc_user close_irc_connections);

our $VERSION = 1.00;

my %disp_table = (
    "PONG"     => \&handle_pong,
    "PRIVMSG"  => \&handle_privmsg,
    "KICK"     => \&handle_kick,
    "MODE"     => \&handle_mode,
    "NICK"     => \&handle_nick,
    "JOIN"     => \&handle_join,
    "PART"     => \&handle_part,
    "QUIT"     => \&handle_quit,
    "KILL"     => \&handle_kill,
    "TOPIC"    => \&handle_topic,
    "INVITE"   => \&handle_invite,
    "NOTICE"   => \&handle_privmsg,
    "001"      => \&handle_start_text, #RPL_WELCOME
    "002"      => \&handle_start_text, #RPL_YOURHOST
    "003"      => \&handle_start_text, #RPL_CREATED
    "004"      => \&handle_004, #RPL_MYINFO
    "005"      => \&handle_start_text, #RPL_BOUNCE
    "020"      => \&handle_start_text,
    "042"      => \&handle_start_text,
    "043"      => \&handle_043,
    "242"      => \&handle_start_text,
    "250"      => \&handle_start_text,
    "251"      => \&handle_start_text,
    "252"      => \&handle_start_text,
    "253"      => \&handle_start_text,
    "254"      => \&handle_start_text,
    "255"      => \&handle_start_text,
    "265"      => \&handle_start_text,
    "266"      => \&handle_start_text,
    "301"      => \&handle_301,
    "311"      => \&handle_311, #311 RPL_WHOISUSER "<nick> <user> <host> * :<real name>"
    "312"      => \&handle_312, #312 RPL_WHOISSERVER "<nick> <server> :<server info>"
    "313"      => \&handle_313, #313 RPL_WHOISOPERATOR "<nick> :is an IRC operator"
    "317"      => \&handle_317, #317 RPL_WHOISIDLE "<nick> <integer> :seconds idle"
    "318"      => \&handle_318, #318 RPL_ENDOFWHOIS "<nick> :End of WHOIS list"
    "319"      => \&handle_319, #319 RPL_WHOISCHANNELS "<nick> :*( ( "@" / "+" ) <channel> " " )"
    "328"      => \&handle_328, #link
    "332"      => \&handle_332,
    "333"      => \&handle_333,
    "353"      => \&handle_353,
    "366"      => \&handle_366,
    "367"      => \&handle_367, #RPL_BANLIST
    "368"      => \&handle_368, #RPL_ENDOFBANLIST
    "372"      => \&handle_start_text, #RPL_MOTD
    "375"      => \&handle_start_text, #RPL_MOTDSTART
    "376"      => \&handle_376, #RPL_ENDOFMOTD
    "401"      => \&handle_401,
    "404"      => \&handle_404, #Cannot send to channel
    "433"      => \&handle_433,
    "437"      => \&handle_437,
    "442"      => \&handle_default_num,
    "451"      => \&handle_start_text,
    "465"      => \&handle_465,
    "470"      => \&handle_470,
    "471"      => \&handle_471,
    "473"      => \&handle_47x,
    "474"      => \&handle_47x,
    "475"      => \&handle_47x,
    "482"      => \&handle_482
    );

sub handle_irc_input
{
    my $input = shift @_;
    my $socket = shift @_;

    #Get user id and network id from lookup table
    my $userid = $::socket_table{fileno($socket)}[4];
    my $nw = $::socket_table{fileno($socket)}[5];

    $input = &latin_recode($input);

    #Update "ping" heartbeat on every msg received from IRC server
    $users{$userid}{"last_ping"}{$nw} = time();

    if ($input =~ /^PING(.*)$/i)
    {
        # We must respond to PINGs to avoid being disconnected.
        &send_irc_line($socket, "PONG $1\r\n");
        dprint(-1, $userid, "Last ping: " . $users{$userid}{"last_ping"}{$nw} . "for nw: $nw, user: $userid");
    }
    elsif ($input =~ /^ERROR/)
    {
        #this connection is doomed
        dprint(1, $userid, "IRC: $input");
        $input =~ s/^ERROR ://;

        if ($input =~ /Too many host connections/)
        {
            #Hackish
            $users{$userid}{"reconnect_count"}{$nw} = 9999;
            &queue_and_send_addline_nw($userid, $nw, " *** NOTICE: The maximum number of connections allowed has been reached. This is a known issue. Please do not contact administrator of this IRC network directly.<br>", 1, 1, 0, 0);
            dprint(2, $userid, "IRC is full");
        }

        &queue_and_send_addline_nw($userid, $nw, " *** ERROR: $input.<br>", 1, 1, 0, 0);
    }
    else
    {
        $_ = $input;

        my @text = split;
        my $prefix = "";
        my $nickname = "";
        my $user_address = "";

        if ($text[0] =~ m/^:/)
        {
            $prefix = shift(@text);
            $prefix =~ m/:(.*?)!(.*)/;
            $nickname = $1;
            $user_address = $2;

            if (!defined($nickname))
            {
                $nickname = $prefix;
                $nickname =~ s/^://;
            }
        }

        my $command = shift(@text);

        if ($disp_table{$command})
        {
            $disp_table{$command}->($userid, $socket, \@text, $nickname, $user_address, $nw, $command);
        }
        else
        {
            dprint(2, $userid, "unknown command: $command " . join(" ", @text));
        }
    }
}

sub handle_401
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw, $command) = @_;
    my @text = @{$text_ref};

    #IRC: :portaali.org 401 ilkka root :No such nick/channel
    shift (@text); #myname
    my $unknown_nick = shift (@text);
    my $channel_id = &window_get_id($userid, $unknown_nick, $nw);

    if ($channel_id == -1)
    {
        return;
    }

    my $usertext = "<font color=\"#ff0000\">*** Unknown nick $unknown_nick. This person has changed nick or quit chat.</font><br>";
    &queue_and_send_addline($userid, $channel_id, $usertext, 1, 2);
}

sub handle_privmsg
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw, $command) = @_;
    my @text = @{$text_ref};

    #IRC: :ilkkaoks!i=ilkkao@iao.iki.fi PRIVMSG #evergreenproject :f
    my $channel = shift(@text);
    my $channel_id;
    my $realnick = $users{$userid}{"realnick"}[$nw];
    my $usertext = join(" ", @text);

    $usertext =~ s/^://;

    #remove all html-coding
    $usertext = CGI::escapeHTML($usertext);

    if ($channel eq $realnick)
    {
        #Message is for me only.
        #IRC: :ilkka!ilkka@iao.fi PRIVMSG ilkka923 :jee
        $channel_id = &window_get_id($userid, $nickname, $nw);

        if ($usertext =~ m/\001VERSION.*\001/)
        {
            dprint(1, $userid, "IRC: received CTCP version query");
            &send_irc_line($socket, "$command $nickname :\001VERSION Ralph:v0.7:Linux\001\n");
        }
        elsif ($usertext =~ m/EVRGRNINT /)
        {
            my ($command, $friend_userid, $last) = split / /, $usertext;

            # TODO: Rewrite!
            if (exists($users{$userid}{"friends"}{$friend_userid}))
            {
                $users{$userid}{"friends"}{$friend_userid} = $last;
                dprint(1, $userid, "IRC: rcvd EVRGNINT, friend: $friend_userid, last: $last");
                &queue_and_send_flist_msg($userid, 1);
            }
            else
            {
                #temp
                dprint(1, $userid, "IRC: rcvd EVRGNINT, not found\n");
            }
        }
        elsif ($channel_id == -1)
        {
            # TODO: Servername is not set! Causes warning!
            if ($users{$userid}{"servername"}[$nw] eq $nickname)
            {
                #Server is starting query (w3c server at least does this)
                $usertext = " *** <b>$nickname</b> $usertext <br>";
                &queue_and_send_addline_nw($userid, $nw, $usertext, 1, 2, 0, 0);
            }
            else
            {
                #Somebody else is starting query with us
                $usertext = " <b>&lt;$nickname&gt;</b> $usertext <br>";

                $channel_id = &window_create($userid, $nickname,
                                             "no topic", 10, 10, 400, 300, $nw,
                                             1, 1, 0, "", 1, 1, "",
                                             $users{$userid}{"next_chanid"}, "");

                # TODO: Rewrite!
                if ($users{$userid}{"anon"} == 0)
                {
                    #&mysql_do("INSERT INTO channels VALUES (\'\', \'$nickname\'," .
                    #      "$userid, 10, 10, 400, 300, $nw, 1, 1, \'\', 1, 0," .
                    #      "\'\', \'\')");
                }

                &queue_and_send_addline($userid, $channel_id, $usertext, 1, 2);
            }
        }
        else
        {
            #Message is part of ongoing query
            $usertext = " <b>&lt;$nickname&gt;</b> $usertext <br>";
            &queue_and_send_addline($userid, $channel_id, $usertext, 1, 2);
        }
    }
    else
    {
        #Message is for channel that I have joined
        $channel_id = &window_get_id($userid, $channel, $nw);

        if ($channel_id == -1)
        {
            #W3C sends this kind of strange notices:
            #IRC: :irc.w3.org NOTICE AUTH :*** Hello, you are connecting to irc.w3.org, the prog...
            $usertext = " *** <b>$nickname</b> $usertext <br>";
            &queue_and_send_addline_nw($userid, $nw, $usertext, 1, 2, 0, 0);
        }
        else
        {
            my $color_start = "";
            my $color_end = "";

            if($usertext =~ m/^\s*\! .*\S/)
            {
                my $ntftext = $usertext;
                $ntftext =~ s/^\s*\!//;
                $ntftext = &urlify("<b>&lt;$nickname&gt;</b> $ntftext");
                # TODO: rewrite
                my $noteid = &add_chan_note($userid, $channel_id, $ntftext);
                &mysql_save_notes($userid, $channel_id);
                &queue_and_send_response($userid, "ADDNTF " . $channel_id . " " . $noteid . " " . $ntftext);
            }

            #w3c hack
            if ($nickname =~ m/Zakim|trackbot|RSSAgent/ && $nw == 3)
            {
                $color_start = "<font color=\"#CC3399\">";
                $color_end = "</font>";
            }
            elsif ($usertext =~ m/\Q$realnick\E/i)
            {
                $color_start = "<font color=\"#9400D3\">";
                $color_end = "</font>";
            }

            if ($usertext =~ m/\001ACTION/)
            {
                $usertext =~ s/\001//g;
                $usertext =~ s/ACTION//;
                $usertext = " <b>$color_start * $nickname</b> $usertext $color_end <br>";
            }
            elsif ($nickname =~ m/^ma7s9bot/ && $nw == 0)
            {
                $usertext = " <font color=\"#004400\"><b>Ext:</b> $usertext </font><br>";
            }
            else
            {
                $usertext = " <b> $color_start &lt;$nickname&gt;</b> $usertext $color_end <br>";
            }

            &queue_and_send_addline($userid, $channel_id, $usertext, 1, 2);
        }
    }
}

sub handle_kick
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :ilkka!ilkka@iao.fi KICK #qwe ilkka923 :no reason
    my $channel = shift(@text);
    my $channel_id = &window_get_id($userid, $channel, $nw);
    my $nick = shift(@text);
    my $reason = join(" ", @text);
    $reason =~ s/^://;

    if ($nick eq $users{$userid}{"realnick"}[$nw])
    {
        #I was kicked!
        &queue_and_send_addline($userid, $channel_id,
                                "You have been kicked out from this channel. Reason: $reason." .
                                " The window will not be updated anymore.<br>", 1, 1);
    }
    else
    {
        &queue_addline($userid, $channel_id,
                       "$nick has been kicked out from this channel. $reason.<br>", 1, 1);
        &remove_name_from_channel_list($userid, $channel_id, $nick);
        &queue_and_send_response($userid, "DELNAME " . $channel_id . " " . $nick);
    }
}

sub handle_376
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    my $prefix = $nw == 0 ? "" : "*** ";
    my $ts = $nw == 0 ? 0 : 1;
    my $reason = $nw == 0 ? "Ready." : "Connection established. <u style=\"color: blue;\" onClick=\"main.expandMOTD(); return false\">Click here to see details and MOTD.</u>";

    &queue_and_send_addline_nw($userid, $nw, "$prefix $reason <br>", $ts, 1, 0, 0);

    $users{$userid}{"reconnect_count"}{$nw} = 0;
    $users{$userid}{"prevquitreason"}[$nw] = "";
    $users{$userid}{"connected"}[$nw] = 1;

    if ($users{$userid}{"anon"} == 1 && $users{$userid}{"state"} == 1)
    {
        #store IP to enable banning
        &store_anon_ip($userid, $users{$userid}{"lastip"});
    }

    #we are connected
    dprint(1, $userid, "IRC: joined: ");

    #update stats
    $::serverstats[$nw]++;

    # Join to channel(s).
    foreach (&window_get_ids_for_nw($userid, $nw))
    {
        if($::redis->hget("window:$userid:$_", "type") == 0)
        {
            my $cname = $::redis->hget("window:$userid:$_", "name");
            my $cname_clean = $cname;
            $cname_clean =~ s/^\#//;
            my $clientaddr = $users{$userid}{"lastip"};

            # TODO: Fix
            #my $banid = &check_if_banned($userid, $cname_clean, $clientaddr);
            #if ($nw == 0 && $banid != 0 && &get_chan_usermode($userid, $_) != 2)
            if (0)
            {
                &remove_all_names_from_channel_list($userid, $_);
                &queue_message($userid, "NAMES $_");
                #&queue_and_send_addline($userid, $_,
                #              "<font color=\"#FF0000\">Can't join this group. " .
                #              "You have been banned (ban ID: $banid).</font><br>", 1, 1);
            }
            else
            {
                &send_irc_line($socket, "JOIN ". $cname . " " .
                               $::redis->hget("window:$userid:$_", "password") . "\r\n");
                dprint(1, $userid, $cname . " ");
            }
        }
    }

    &queue_nicks($userid, 1);
}

sub handle_default_num
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    shift (@text);
    $text[0] =~ s/^://;
    my $msg = join(" ", @text);

    if ($nw != 0)
    {
        &queue_and_send_addline_nw($userid, $nw, "*** <font color=\"#8B4500\">$msg </font><br>", 1, 1, 0, 0);
    }
}

sub handle_start_text
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    shift (@text);
    $text[0] =~ s/^://;
    my $msg = join(" ", @text);

    if ($nw != 0)
    {
        &queue_and_send_addline_nw($userid, $nw, "*** <font color=\"#8B4500\">$msg </font><br>", 1, 1, 0, 1);
    }
}

sub handle_404
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :portaali.org 404 ilkka #channel :Can't send
    shift (@text); #myname
    my $channel = shift (@text);
    my $channel_id = &get_window_id($userid, $channel, $nw);

    if ($channel_id == -1)
    {
        return;
    }

    my $usertext = "<font color=\"#ff0000\">*** Can't send your message to channel $channel.</font><br>";
    &queue_and_send_addline($userid, $channel_id, $usertext, 1, 2);
}

sub handle_004
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    shift (@text);
    $text[0] =~ s/^://;
    $users{$userid}{"servername"}[$nw] = $text[0];

    my $msg = join(" ", @text);

    if ($nw != 0)
    {
        &queue_and_send_addline_nw($userid, $nw, " *** <font color=\"#8B4500\">$msg </font><br>", 1, 1, 0, 1);
    }
}


sub handle_433
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    &try_different_nick($userid, $nw, $socket);
}

sub handle_pong
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #Do nothing, last ping variable is now updated.
}

sub handle_invite
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :Angel!wings@irc.org INVITE Wiz #Dust
    shift (@text); # Wiz
    my $channel = shift (@text);
    $channel =~ s/^://;

    &queue_and_send_response($userid, "INFO $nickname has invited you to the channel $channel. You are<br> free to join that channel if you wish.");
}

sub handle_kill
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};
    my $killer = shift (@text); # nick

    my $reason = join(" ", @text);
    $reason =~s/^://;

    &queue_and_send_addline_nw($userid, $nw,
                               "*** Your connection was killed by $killer. Reason: $reason", 1, 1, 0, 0);
}

sub handle_47x
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :irc.elisa.fi 475 ilkka9 #ceeassa :Cannot join channel (+k)
    shift (@text); # ilkka9
    my $channel = shift (@text);
    my $channel_id = &window_get_id($userid, $channel, $nw);
    $text[0] =~ s/^://;
    my $reason = "Reason: " . join(" ", @text);

    if ($reason =~ m/\+k/)
    {
        $reason = "Wrong password";
    }
    elsif ($reason =~ m/\+i/)
    {
        $reason = "The channel is invite only";
    }
    elsif ($reason =~ m/\+b/)
    {
        $reason = "You are banned";
    }

    &remove_all_names_from_channel_list($userid, $channel_id);
    &queue_message($userid, "NAMES $channel_id");
    &queue_and_send_addline($userid, $channel_id,
                            "<font color=\"#FF0000\">Can't join this channel. $reason.</font><br>", 1, 1);
}

sub handle_471
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :irc.elisa.fi 475 ilkka9 #ceeassa :Cannot join channel (+l)
    shift (@text); # ilkka9
    my $channel = shift (@text);
    my $channel_id = &window_get_id($userid, $channel, $nw);

    &remove_all_names_from_channel_list($userid, $channel_id);
    &queue_message($userid, "NAMES $channel_id");
    &queue_and_send_addline($userid, $channel_id,
                            "<font color=\"#FF0000\">Can't join this channel. The channel is full.</font><br>", 1, 1);
}

sub handle_437
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    if ($text[1] =~ m/\#/)
    {
        my $channel_id = &window_get_id($userid, $text[1], $nw);

        &remove_all_names_from_channel_list($userid, $channel_id);
        &queue_message($userid, "NAMES $channel_id");
        &queue_and_send_addline($userid, $channel_id,
                                "<font color=\"#FF0000\">Can't join this channel." .
                                " It's temporarily unavailable. Waiting 5 minutes before trying again.</font><br>", 1, 1);

        &addtimer(\&try_to_join_channel, 60*5, $userid, $channel_id); #wait 10 mins and try to join again
    }
    else
    {
        &try_different_nick($userid, $nw, $socket);
    }
}

sub handle_043
{
    #IRC: :*.pl 043 AnDy 0PNEAKPLG :nickname collision, forcing nick change to your unique ID.
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    shift(@text); # mynick
    my $new_nick = shift (@text);

    $users{$userid}{"realnick"}[$nw] = $new_nick;
    &try_different_nick($userid, $nw, $socket);
}

sub handle_301
{
    #IRC: :irc.elisa.fi 301 ilkka6 ilkka :poissa
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    shift(@text); # mynick
    my $source_nick = shift (@text);
    my $usertext = join(" ", @text);
    $usertext =~s/^://;
    $usertext = " <b>$source_nick is away.</b> Message: $usertext <br>";

    my $channel_id = &window_get_id($userid, $source_nick, $nw);

    if ($channel_id != -1)
    {
        &queue_and_send_addline($userid, $channel_id, $usertext, 1, 2);
    }
}

sub handle_311
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    shift(@text); # mynick
    my $whoisnick = shift (@text);
    my $whoisuser = shift (@text);
    my $whoishost = shift (@text);
    shift(@text); # star
    my $whoisreal = join(" ", @text);
    $whoisreal =~s/^://;

    &queue_and_send_addline($userid, $users{$userid}{"lastcommandwin"},
                            "<font color=\"#00AF00\">" . $whoisnick . " is " .
                            $whoisuser . "@" . $whoishost . " [" . $whoisreal . "]</font><br>", 1, 1);
}

sub handle_312
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    shift(@text); # mynick
    my $whoisnick = shift (@text);
    my $whoisserver = shift (@text);
    my $whoisinfo = join (" ", @text);
    $whoisinfo =~ s/^://;

    &queue_and_send_addline($userid, $users{$userid}{"lastcommandwin"},
                            "<font color=\"#00AF00\"> Using server: " . $whoisserver .
                            " [ " . $whoisinfo . " ]</font><br>", 1, 1);
}

sub handle_313
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    &queue_and_send_addline($userid, $users{$userid}{"lastcommandwin"},
                            "<font color=\"#00AF00\">Is an IRC operator</font><br>", 1, 1);
}

sub handle_333
{
    #RPL_TOPICWHOTIME
}

sub handle_465     #ERR_YOUREBANNEDCREEP
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    shift(@text); # mynick
    my $reason = join (" ", @text);
    $reason =~ s/^://;

    #Hackish
    $users{$userid}{"reconnect_count"}{$nw} = 9999;
    &queue_and_send_addline_nw($userid, $nw, " *** NOTICE: You are banned from this server ($reason).<br>", 1, 1, 0, 0);
}

sub handle_317
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    shift(@text); # mynick
    my $whoisnick = shift (@text);
    my $whoisidle = shift (@text);
    my $idleline = $whoisidle . " seconds";

    if ($whoisidle > 60 * 60)
    {
        my $idlehours = int($whoisidle / (60 * 60));
        my $idleminutes = int(($whoisidle % (60 * 60)) / 60);
        $whoisidle = $whoisidle % 60;
        $idleline = $idlehours . " hours " . $idleminutes . " minutes " . $whoisidle . " seconds";
    }
    elsif ($whoisidle > 60)
    {
        my $idleminutes = int($whoisidle / 60);
        $whoisidle = $whoisidle % 60;
        $idleline = $idleminutes . " minutes " . $whoisidle . " seconds";
    }

    &queue_and_send_addline($userid, $users{$userid}{"lastcommandwin"},
                            "<font color=\"#00AF00\"> Has been idle " . $idleline . ".</font><br>", 1, 1);
}

sub handle_318
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    &queue_and_send_addline($userid, $users{$userid}{"lastcommandwin"},
                            "<font color=\"#00AF00\">End of WHOIS list</font><br>", 1, 1);
}

sub handle_367
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    &queue_and_send_addline($userid, $users{$userid}{"lastcommandwin"},
                            "<font color=\"#00AF00\">BAN: @text</font><br>", 1, 1);
}

sub handle_368
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    &queue_and_send_addline($userid, $users{$userid}{"lastcommandwin"},
                            "<font color=\"#00AF00\">End of BAN list</font><br>", 1, 1);
}

sub handle_319
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    shift(@text); # mynick
    my $whoisnick = shift (@text);
    my $whoischans = join(" ", @text);
    $whoischans =~s/^://;

    &queue_and_send_addline($userid, $users{$userid}{"lastcommandwin"},
                            "<font color=\"#00AF00\">On channels: " . $whoischans . "</font><br>", 1, 1);
}

sub handle_470
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :gibson.freenode.net 470 Cryptographer #sex ##you_have_got_to_be_kidding :Forwarding to another channel

    shift(@text); # mynick
    my $from = shift (@text);
    my $to = shift (@text);
    my $desc = join(" ", @text);
    $desc =~s/^://;
    my $channel_id = &window_get_id($userid, $from, $nw);

    if ($channel_id != -1)
    {
        &set_chan_name($userid, $channel_id, $to);
        &mysql_do("UPDATE channels SET name = \'$to\' WHERE userid = $userid AND name " .
                  "= \'$from\' AND network = $nw");

        &queue_addline($userid, $channel_id,
                       "<font color=\"#00AF00\">The server is forwarding you to: " . $to . "</font><br>", 1, 1);

        &queue_and_send_update($userid, $channel_id, 1);
    }
}

sub handle_353
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #own.freenode.net 353 drwillie @ #evergreenproject :drwillie ilkkaoks
    shift (@text); # drwillie
    shift (@text); # @
    my $channel = shift (@text);
    my $channel_id = &window_get_id($userid, $channel, $nw);

    $text[0] =~ s/^://;
    my $usernames = join(" ", @text);
    my $mynick = $users{$userid}{"realnick"}[$nw];

    if ($usernames =~ m/\@\Q$mynick\E/ && $nw != 0)
    {
        &set_chan_usermode($userid, $channel_id, 1);
        &queue_and_send_update($userid, $channel_id, 1);
    }

    &add_names_to_channel_list($userid, $channel_id, $usernames);
}

sub handle_366
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #:pratchett.freenode.net 366 il3kkaoksWEB #testi1 :End of /NAMES list.
    shift (@text); # drwillie
    my $channel = lc(shift (@text));
    my $channel_id = &window_get_id($userid, $channel, $nw);

    &queue_and_send_response($userid, "NAMES " . $channel_id . " " .
                             &get_chan_names($userid, $channel_id));
}

sub handle_482
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #482 ERR_CHANOPRIVSNEEDED
    &queue_and_send_addline($userid, $users{$userid}{"lastcommandwin"},
                            "<font color=\"#FF0000\">You're not channel operator</font><br>", 1, 1);
}

sub handle_332
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :portaali.org 332 ilkka9 #portaali :jes
    shift (@text);
    my $channel = shift (@text);
    my $channel_id = &window_get_id($userid, $channel, $nw);

    $text[0] =~ s/^://;
    my $topic = join(" ", @text);

    &set_chan_topic($userid, $channel_id, $topic);
    &queue_and_send_response($userid, "TOPIC " . $channel_id . " " . $topic);
}

sub handle_328
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :services. 328 ilkka #bangalore :http://www.livejournal.com/users/bangalore/
    shift (@text);
    my $channel = shift (@text);
    my $channel_id = &window_get_id($userid, $channel, $nw);

    $text[0] =~ s/^://;
    my $link = join(" ", @text);

    &queue_and_send_addline($userid, $channel_id, "Link: " . $link . "<br>", 1, 1);
}

sub handle_mode
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :ilkka9!~ilkka9@localhost.myrootshell.com MODE #sunnuntai +k foobar3
    my $channel = shift(@text);

    my $channelname = "channel";
    $channelname = "group" if ($nw == 0);

    if (defined($channel) && $channel =~ /^\#/)
    {
        #Channel mode has changed
        my $channel_id = &window_get_id($userid, $channel, $nw);

        if ($nw != 0)
        {
            &queue_and_send_addline($userid, $channel_id,
                                    "<font color=\"#FF0000\">Mode change: " . join (" ", @text) .
                                    " by $nickname</font><br>", 1, 1);
        }

        while ($_ = shift(@text))
        {
            my @modes = split (//);
            my $oper = shift @modes;
            my $mynick = $users{$userid}{"realnick"}[$nw];

            foreach my $cmd (@modes)
            {
                my $param = "";
                $param = shift @text if ($cmd =~ m/[klbeIOov]/);

                if ($cmd eq "o" && $oper eq "+")
                {
                    if ($param =~ m/\Q$mynick\E/ && $nw != 0)
                    {
                        #It was me!
                        &set_chan_usermode($userid, $channel_id, 1);
                        &queue_and_send_update($userid, $channel_id, 1);
                    }

                    &change_user_status($userid, $channel_id, $param, "\@" . $param);
                }
                elsif ($cmd eq "o" && $oper eq "-")
                {
                    if ($param =~ m/\Q$mynick\E/ && $nw != 0)
                    {
                        #It was me!
                        &set_chan_usermode($userid, $channel_id, 0);
                        &queue_and_send_update($userid, $channel_id, 1);
                    }

                    &change_user_status($userid, $channel_id, $param, $param);
                }
                elsif ($cmd eq "v" && $oper eq "+")
                {
                    &change_user_status($userid, $channel_id, $param, "+" . $param);
                }
                elsif ($cmd eq "v" && $oper eq "-")
                {
                    &change_user_status($userid, $channel_id, $param, $param);
                }
                elsif ($cmd eq "k" && $oper eq "+")
                {
                    &set_chan_password($userid, $channel_id, $param);
                    &queue_and_send_addline($userid, $channel_id,
                                            "<font color=\"#FF0000\">The password for this $channelname " .
                                            "has been changed to '$param'.</font><br>", 1, 1);
                    &queue_and_send_update($userid, $channel_id, 1);
                }
                elsif ($cmd eq "k" && $oper eq "-")
                {
                    &set_chan_password($userid, $channel_id, "");
                    &queue_and_send_addline($userid, $channel_id,
                                            "<font color=\"#FF0000\">Password protection has been removed from this $channelname." .
                                            "</font><br>", 1, 1);
                    &queue_and_send_update($userid, $channel_id, 1);
                }

                if ($cmd eq "k" && $users{$userid}{"anon"} == 0)
                {
                    &mysql_do("UPDATE channels SET password = \'" .
                              &get_chan_password($userid, $channel_id) .
                              "\' WHERE userid = $userid AND name " .
                              "= \'$channel\' AND network = $nw");
                }
            }
        }
    }
    else
    {
        #TODO: It's actually user's mode that has changed, show it
    }
}

sub handle_nick
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :ilkka!ilkkao@localhost.myrootshell.com NICK :jes
    my $newnick = shift(@text);
    $newnick =~ s/^://;

    if ($nickname eq $users{$userid}{"realnick"}[$nw])
    {
        $users{$userid}{"realnick"}[$nw] = $newnick;
        &queue_nicks($userid, 1);
    }

    foreach my $tmp_id (&get_chans_for_nw($userid, $nw))
    {
        my $status = &get_name_status($userid, $tmp_id, $nickname);

        if (&remove_name_from_channel_list($userid, $tmp_id, $nickname))
        {
            my $description = "$nickname is";

            &queue_message($userid, "DELNAME " . $tmp_id . " " . $nickname);

            if ($nickname eq $users{$userid}{"realnick"}[$nw])
            {
                $description = "You are";
            }

            &queue_addline($userid, $tmp_id,
                           "<font color=\"#A52A2A\">$description now known as $newnick.</font><br>", 1, 1);

            my $index = &add_name_to_channel_list($userid, $tmp_id, $status . $newnick);
            &queue_and_send_response($userid, "ADDNAME " . $tmp_id . " " . $index . " " . $status . $newnick);
        }
    }
}

sub handle_join
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :il3kkaoksWEB!i=ilkkao@iao.iki.fi JOIN :#testi4
    my $channel = shift(@text);
    $channel =~ s/^\://;

    my $channel_id = &window_get_id($userid, $channel, $nw);

    if ($channel_id == -1)
    {
        #user must have closed window while we are waiting reply to JOIN,
        #send PART to be in safe waters
        &send_irc_line($socket, "PART " . $channel . "\n");
        return;
    }

    if ($nickname eq $users{$userid}{"realnick"}[$nw])
    {
        dprint(1, $userid, "IRC: joined channel: $channel");

        #We have a new connection, reset names
        &remove_all_names_from_channel_list($userid, $channel_id);
    }
    else
    {
        #somebody else joined
        my $index = &add_name_to_channel_list($userid, $channel_id, $nickname);

        &queue_message($userid, "ADDNAME " . $channel_id . " " .
                       $index . " " . $nickname);
    }

    my $name = "channel";

    if ($nw == 0)
    {
        $name = "group";
        $channel =~ s/^\#//;
    }
    else
    {
        $nickname = $nickname . " (" . $user_address . ")";
    }

    &queue_and_send_addline($userid, $channel_id,
                            "<font color=\"#A52A2A\">$nickname has joined $name $channel.</font><br>", 1, 1);
}

sub handle_part
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :ilkka!ilkkao@localhost.myrootshell.com PART #portaali :
    my $channel = shift(@text);
    my $reason = join(" ", @text);
    $reason =~ s/^://;

    my $channel_id = &window_get_id($userid, $channel, $nw);

    if ($channel_id == -1)
    {
        #I don't know anything about this channel
        return;
    }
    elsif ($nickname eq $users{$userid}{"realnick"}[$nw])
    {
        #just to be sure
        &delete_chan($userid, $channel_id);

        dprint(1, $userid, "IRC: I left from some channel");
    }
    else
    {
        my $channel_id = &window_get_id($userid, $channel, $nw);
        my $name = "channel";
        my $showname = $nickname;

        if ($nw == 0)
        {
            $name = "group";
            $channel =~ s/^\#//;
            $reason = "";
        }
        else
        {
            $showname = $nickname . " (" . $user_address . ")";
        }

        &queue_addline($userid, $channel_id, "<font color=\"#A52A2A\">$showname has left $name $channel. " .
                       "$reason</font><br>", 1, 1);

        &remove_name_from_channel_list($userid, $channel_id, $nickname);
        &queue_and_send_response($userid, "DELNAME " . $channel_id . " " . $nickname);
    }
}

sub handle_quit
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :ilkka!ilkkao@localhost.myrootshell.com QUIT :"leaving"
    my $reason = join(" ", @text);
    $reason =~ s/^://;

    if ($users{$userid}{"prevquitreason"}[$nw] ne "")
    {
        #there is very recent quit that looked like netsplit quit
        if ($users{$userid}{"prevquitreason"}[$nw] eq $reason)
        {
            #this quit belongs to that previous quit, we have a netsplit
            push @{$users{$userid}{"prevquitnicks"}[$nw]}, $nickname;
            return;
        }
        else
        {
            &empty_quitnicks($userid, $nw); #actually prints that previous quit normally
        }
    }

    if ($reason =~ m/^\S+ \S+$/)
    {
        #looks like netsplit quit message but we are not sure
        $users{$userid}{"prevquitreason"}[$nw] = $reason;
        $users{$userid}{"prevquithost"}[$nw] = $user_address;
        push @{$users{$userid}{"prevquitnicks"}[$nw]}, $nickname;
        &addtimer(\&empty_quitnicks, 5, $userid, $nw); #wait 5secs for more similar quits
    }
    else
    {
        &send_quit_lines($userid, $reason, $nw, $nickname, $user_address);
    }
}

sub handle_topic
{
    my ($userid, $socket, $text_ref, $nickname, $user_address, $nw) = @_;
    my @text = @{$text_ref};

    #IRC: :ilkka!ilkkao@localhost.myrootshell.com TOPIC #portaali :jes

    my $channel = shift(@text);
    my $channel_id = &window_get_id($userid, $channel, $nw);

    my $usertext = join(" ", @text);
    $usertext =~ s/^://;

    &set_chan_topic($userid, $channel_id, $usertext);

    &queue_message($userid, "TOPIC " . $channel_id . " " . $usertext);
    &queue_and_send_addline($userid, $channel_id, " $nickname has changed the topic to: $usertext.<br>", 1, 1);
}

sub connect_irc_user
{
    my $user = shift @_;
    my $nw_id = shift @_;

    if ($::shutdown_in_progress == 1 || !(exists($users{$user})) || $users{$user}{"disabled"} == 1)
    {
        #user is removed or shutdown is in progress
        dprint(1, $user, "IRC: not connecting to server: user disabled, or non-existent");
        return;
    }
    elsif (defined($users{$user}{"isocket"}[$nw_id]))
    {
        dprint(1, $user, "IRC: not connecting to server: socket already active");
        return;
    }

    my $nick = $::redis->hget("user:$user", "nick");
    my $realname = $::redis->hget("user:$user", "name");
    my $chan_amount = 0;

    my @windows = $::redis->smembers("windowlist:$user");

    #Check if user is not waiting anymore (=has closed channel windows)
    #Can happen when timer is used to schedule reconnect using this function
    foreach my $window (@windows)
    {
        my $network = (split(":", $window))[1];

        if ($network == $nw_id)
        {
            $chan_amount++;
        }
    }

    if ($chan_amount == 0 && $nw_id != 0)
    {
        dprint(1, $user, "IRC: not connecting to server: $evergreen_config::serverlist[$nw_id][1]. No channels");
        return;
    }

    if ($nw_id == 0)
    {
        # TODO: !!!!
        #&queue_and_send_addline_nw($user, $nw_id,
        #                 "*** Initializing your session. Please wait... ", 1, 1, 0, 0);
    }
    else
    {
        # TODO: !!!
        #&queue_and_send_addline_nw($user, $nw_id,
        #                 "*** Connecting to the $evergreen_config::serverlist[$nw_id][0] server. Please wait... <br>", 1, 1, 0, 0);
    }

    $users{$user}{"connected"}[$nw_id] = 0;

    socket(my $sock, PF_INET, SOCK_STREAM, getprotobyname('tcp'));
    my $addr = inet_aton($evergreen_config::serverlist[$nw_id][1]);

    if ($sock && defined($addr))
    {
        dprint(1, $user, "User: connecting, nw: $nw_id, $evergreen_config::serverlist[$nw_id][0]: " .
               "$evergreen_config::serverlist[$nw_id][1] file_desc: " . fileno($sock));

        setsockopt($sock, SOL_SOCKET, SO_REUSEADDR, 1);
        &::nonblock($sock);

        connect($sock, sockaddr_in($evergreen_config::serverlist[$nw_id][2], $addr));

        #initial empty add so that mods work later
        epoll_ctl($::epfd, EPOLL_CTL_ADD, fileno($sock), 0) >= 0 || die "epoll_ctl: $!\n";
        $::socket_table{fileno($sock)} = [ &::TYPE_IRC, $sock, "", "", $user, $nw_id, undef, 0];

        &send_irc_line($sock, "NICK $nick\r\nUSER $nick 8 * :$realname (Ralph v2.0)\r\n");

        $users{$user}{"isocket"}[$nw_id] = $sock;
        $users{$user}{"realnick"}[$nw_id] = $nick;
    }
    else
    {
        dprint(1, $user, "IRC: Could not reserver socket, or DNS failure");
        &::schedule_reconnect($user, $nw_id);
    }
}

sub close_irc_connections
{
    my $reason = shift @_;

    $::shutdown_in_progress = 1;

    #TODO: fixme, gets more complicated
    #foreach (keys %ircinbuffer)
    #{
    #   dprint(1, "IRC: closing connection, sending QUIT\n");
#
#       my $rh = IO::Socket::INET->new_from_fd($_, "r+");
#
#       print $rh "QUIT :$reason\n";
#    }
}

sub latin_recode
{
    my $text = shift @_;

    if ($text =~ m/(\xc4|\xc5|\xd6|\xe4|\xe5|\xf6)/)
    {
        $text = encode("utf8", $text);
        dprint(0, 0, "WWW: Detecting latin1 scandinavic characters. Recoding");
    }

    return $text;
}

sub try_to_join_channel
{
    my $userid = shift @_;
    my $channel_id = shift @_;

    if (!exists $users{$userid} || !&chan_exists($userid, $channel_id))
    {
        return;
    }

    my $channel = &get_chan_name($userid, $channel_id);
    my $password = &get_chan_password($userid, $channel_id);
    my $nw = &get_chan_nw($userid, $channel_id);

    my $ircsocket = $users{$userid}{"isocket"}[$nw];

    if (defined $ircsocket)
    {
        &send_irc_line($ircsocket, "JOIN " . $channel . " " . $password . "\n");
    }
}

sub try_different_nick
{
    my $userid = shift @_;
    my $nw = shift @_;
    my $socket = shift @_;
    my $suffix = "";

    my $nick = $users{$userid}{"nick"};
    my $realnick = \$users{$userid}{"realnick"}[$nw];

    my $numbernick = 0;

    dprint(1, $userid, "IRC: Nickname " . $$realnick . " is already in use, user's real nick is " . $nick);

    if (substr($$realnick, 0, length($nick)) ne $nick)
    {
        #realnick is now unique ID, try change that to something unique but nice immediately
        $$realnick = $nick . (int(rand(9)) + 1) . (int(rand(9)) + 1) . (int(rand(9)) + 1);
    }
    elsif ($$realnick eq $nick)
    {
        #the preferred choice
        $$realnick = $nick . "_";
    }
    elsif ($$realnick eq $nick . "_")
    {
        #next try
        chop($$realnick);
        $$realnick = $$realnick . (int(rand(9)) + 1);
        $numbernick = 1;
    }
    else
    {
        #if all fails try to add random numbers
        $$realnick = $$realnick . (int(rand(9)) + 1);
        $numbernick = 1;
    }

    #if we are joining IRC try all alternatives. If we are connected try to get only nick or nick_ back
    if (!($users{$userid}{"connected"}[$nw] == 1 && $numbernick == 1))
    {
        dprint(1, $userid, "IRC: Trying " . $$realnick . " instead.");
        &send_irc_line($socket, "NICK " . $$realnick . "\r\n");
    }
}

sub store_anon_ip
{
    my $userid = shift @_;
    my $ip = shift @_;

    #delete to be sure
    my $realnick = $users{$userid}{"realnick"}[0];
    &mysql_do("DELETE FROM anonusers WHERE userid = $userid");
    &mysql_do("INSERT INTO anonusers VALUES (\'$realnick\', $userid," .
              "\'$ip\')");
}

sub change_user_status
{
    my $userid = shift @_;
    my $channel_id = shift @_;
    my $oldnick = shift @_;
    my $newnick = shift @_;

    &remove_name_from_channel_list($userid, $channel_id, $oldnick);
    &queue_message($userid, "DELNAME " . $channel_id . " " . $oldnick);

    my $index = &add_name_to_channel_list($userid, $channel_id, $newnick);
    &queue_and_send_response($userid, "ADDNAME " . $channel_id . " " . $index . " " . $newnick);
}

sub empty_quitnicks
{
    my $userid = shift @_;
    my $nw = shift @_;

    if (@{$users{$userid}{"prevquitnicks"}[$nw]} == 1)
    {
        dprint(1, $userid, "IRC: netsplit: false alarm");
        &send_quit_lines($userid, $users{$userid}{"prevquitreason"}[$nw], $nw,
                         pop(@{$users{$userid}{"prevquitnicks"}[$nw]}),
                         $users{$userid}{"prevquithost"}[$nw]);
    }
    elsif (@{$users{$userid}{"prevquitnicks"}[$nw]} > 1)
    {
        #real netsplit
        my $i = 0;

        foreach my $tmp_id (&get_chans_for_nw($userid, $nw))
        {
            my $impacted = "";
            foreach my $nick (@{$users{$userid}{"prevquitnicks"}[$nw]})
            {
                if (&remove_name_from_channel_list($userid, $tmp_id, $nick))
                {
                    $i++;
                    $impacted = $impacted . $nick . ", ";
                    &queue_message($userid, "DELNAME " . $tmp_id . " " . $nick);
                    &flush_queue($userid) if ($i % 20 == 0); #let browser breath
                }
            }

            $impacted =~ s/, $//;
            my $reason = $users{$userid}{"prevquitreason"}[$nw];

            if ($impacted ne "")
            {
                &queue_and_send_addline($userid, $tmp_id,
                                        "<font color=\"#A52A2A\">*** Netsplit: $reason, quits: $impacted</font><br>", 1, 1);
            }
        }
    }

    @{$users{$userid}{"prevquitnicks"}[$nw]} = ();
    $users{$userid}{"prevquitreason"}[$nw] = "";
    $users{$userid}{"prevquithost"}[$nw] = "";
}

sub send_quit_lines
{
    my $userid = shift @_;
    my $reason = shift @_;
    my $nw = shift @_;
    my $nickname = shift @_;
    my $user_address = shift @_;

    $reason = $reason . ".";
    $reason = "" if ($nw == 0);

    foreach my $tmp_id (&get_chans_for_nw($userid, $nw))
    {
        if (&remove_name_from_channel_list($userid, $tmp_id, $nickname))
        {
            my $showname = $nickname;

            if ($nw != 0)
            {
                $showname = $nickname . " (" . $user_address . ")";
            }

            &queue_addline($userid, $tmp_id,
                           "<font color=\"#A52A2A\">$showname has exited chat. $reason</font><br>", 1, 1);
            &queue_and_send_response($userid, "DELNAME " . $tmp_id . " " . $nickname);
        }
    }
}

sub send_irc_line
{
    my $s = shift @_;
    my $data = shift @_;

    if (defined $s)
    {
        &::schedule_write($s, $data);
        return 1;
    }
    else
    {
        dprint(1, 0, "IRC: Socket not defined");
        return 0;
    }
}


1;
